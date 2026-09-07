// Deploy with verify_jwt=false: only the OAuth callback is public. Other routes
// verify the user's bearer token against Supabase Auth, never a client user_id.
const env=(name:string)=>Deno.env.get(name)||'';
const dbUrl=env('SUPABASE_URL'),serviceKey=env('SUPABASE_SERVICE_ROLE_KEY');
const clientId=env('HUAWEI_HEALTH_CLIENT_ID'),clientSecret=env('HUAWEI_HEALTH_CLIENT_SECRET');
const callback=env('HUAWEI_HEALTH_REDIRECT_URI'),appUrl=env('COACH_APP_URL');
const scopes=env('HUAWEI_HEALTH_SCOPES');
const tokenEndpoint='https://oauth-login.cloud.huawei.com/oauth2/v3/token';
const authEndpoint='https://oauth-login.cloud.huawei.com/oauth2/v3/authorize';
const headers={'apikey':serviceKey,'Authorization':`Bearer ${serviceKey}`,'Content-Type':'application/json'};
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes));
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function digest(s:string){return b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))));}
async function crypt(value:string,decrypt=false){
 const key=await crypto.subtle.importKey('raw',bytes(env('HEALTH_TOKEN_ENCRYPTION_KEY')),{name:'AES-GCM'},false,['encrypt','decrypt']);
 if(decrypt){const [iv,data]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv)},key,bytes(data)));}
 const iv=crypto.getRandomValues(new Uint8Array(12));return b64(iv)+'.'+b64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(value))));
}
async function db(path:string,method='GET',body?:unknown){
 const response=await fetch(`${dbUrl}/rest/v1/${path}`,{method,headers:{...headers,Prefer:'return=representation,resolution=merge-duplicates'},body:body===undefined?undefined:JSON.stringify(body)});
 if(!response.ok)throw Error('storage_unavailable');const text=await response.text();return text?JSON.parse(text):[];
}
async function exchange(fields:Record<string,string>){
 const response=await fetch(tokenEndpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,...fields}),signal:AbortSignal.timeout(15000)});
 const token=await response.json();if(!response.ok||!token.access_token)throw Error('authorization_failed');return token;
}
async function store(userId:string,tokens:any){await db('health_connections?on_conflict=user_id','POST',{user_id:userId,encrypted_tokens:await crypt(JSON.stringify(tokens)),expires_at:new Date(Date.now()+Number(tokens.expires_in||3600)*1000).toISOString(),scopes:tokens.scope||scopes,updated_at:new Date().toISOString()});}
Deno.serve(async request=>{
 const allowedOrigin=appUrl?new URL(appUrl).origin:'',origin=request.headers.get('Origin');
 const cors={'Access-Control-Allow-Origin':allowedOrigin,'Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
 const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
 if(origin&&origin!==allowedOrigin)return json({error:'origin_not_allowed'},403);
 if(request.method==='OPTIONS')return new Response(null,{headers:cors});
 const action=new URL(request.url).searchParams.get('action')||'status';
 const configured=env('HUAWEI_HEALTH_APPROVED')==='true'&&!!(clientId&&clientSecret&&callback&&scopes&&appUrl&&env('HEALTH_TOKEN_ENCRYPTION_KEY'));
 try{
  if(!configured)return json({configured:false,error:'华为健康服务尚未通过审批或完成配置'},503);
  if(action==='callback'&&request.method==='GET'){
   const query=new URL(request.url).searchParams,state=query.get('state'),code=query.get('code');if(!state||!code)return json({error:'invalid_callback'},400);
   // Atomic DELETE consumes state once, preventing callback replay.
   const records=await db(`health_oauth_states?state_hash=eq.${encodeURIComponent(await digest(state))}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`,'DELETE');
   if(records.length!==1)return json({error:'expired_or_replayed_state'},400);
   const token=await exchange({grant_type:'authorization_code',code,redirect_uri:callback});await store(records[0].user_id,token);
   const target=new URL(appUrl);target.searchParams.set('health_connected','1');return new Response(null,{status:303,headers:{Location:target.href,'Cache-Control':'no-store'}});
  }
  const auth=request.headers.get('Authorization')||'';if(!auth.startsWith('Bearer '))return json({error:'请先登录个人账户'},401);
  const identity=await fetch(`${dbUrl}/auth/v1/user`,{headers:{apikey:serviceKey,Authorization:auth}});if(!identity.ok)return json({error:'登录已过期'},401);
  const user=await identity.json();if(!user.id)return json({error:'invalid_identity'},401);
  const connection=(await db(`health_connections?user_id=eq.${user.id}`))[0];
  if(action==='status'&&request.method==='GET')return json({configured:true,connected:!!connection,last_synced_at:connection?.synced_at||null,sync_available:!!env('HUAWEI_DATA_ADAPTER_URL')});
  if(action==='authorize'&&request.method==='POST'){
   const state=crypto.randomUUID()+crypto.randomUUID();await db('health_oauth_states','POST',{state_hash:await digest(state),user_id:user.id,expires_at:new Date(Date.now()+600000).toISOString()});
   const target=new URL(authEndpoint);target.search=new URLSearchParams({response_type:'code',client_id:clientId,redirect_uri:callback,scope:scopes,state}).toString();return json({authorize_url:target.href});
  }
  if(action==='disconnect'&&request.method==='DELETE'){
   // Stop local use and destroy stored tokens/data. Huawei account permissions can
   // additionally be revoked by the user in Huawei Health authorization settings.
   await db(`health_connections?user_id=eq.${user.id}`,'DELETE');await db(`health_samples?user_id=eq.${user.id}`,'DELETE');await db(`health_oauth_states?user_id=eq.${user.id}`,'DELETE');return json({connected:false,deleted:true});
  }
  if(action==='sync'&&request.method==='POST'){
   if(!connection)return json({error:'请先授权华为运动健康'},409);
   const adapter=env('HUAWEI_DATA_ADAPTER_URL');if(!adapter)return json({error:'approved_data_adapter_not_configured'},503);
   if(new URL(adapter).protocol!=='https:')throw Error('invalid_adapter');
   let token=JSON.parse(await crypt(connection.encrypted_tokens,true));
   if(Date.parse(connection.expires_at)<Date.now()+60000){const next=await exchange({grant_type:'refresh_token',refresh_token:token.refresh_token});token={...token,...next};await store(user.id,token);}
   // Region/scope-specific adapter must be verified against the approved Huawei API.
   const response=await fetch(adapter,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${env('HUAWEI_DATA_ADAPTER_SECRET')}`},body:JSON.stringify({access_token:token.access_token,from:new Date(Date.now()-7*86400000).toISOString(),to:new Date().toISOString()}),signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error('huawei_sync_failed');const result=await response.json();if(!Array.isArray(result.samples)||result.samples.length>10000)throw Error('invalid_samples');
   const units:Record<string,string>={steps:'count',sleep_minutes:'min',heart_rate:'bpm',resting_heart_rate:'bpm'};
   const samples=result.samples.map((s:any)=>{if(typeof s.source_id!=='string'||!units[s.metric]||s.unit!==units[s.metric]||!Number.isFinite(s.value)||s.value<0||!Number.isFinite(Date.parse(s.measured_at))||Date.parse(s.measured_at)>Date.now()+60000)throw Error('invalid_sample');return {user_id:user.id,source_id:s.source_id,metric:s.metric,value:s.value,unit:s.unit,measured_at:s.measured_at,source:'huawei'};});
   if(samples.length)await db('health_samples?on_conflict=user_id,source_id,metric','POST',samples);
   const at=new Date().toISOString();await db(`health_connections?user_id=eq.${user.id}`,'PATCH',{synced_at:at});return json({synced_at:at,count:samples.length,samples});
  }
  return json({error:'method_or_action_not_allowed'},405);
 }catch{return json({error:'操作未完成，请稍后重试或重新授权；原训练记录未改变'},502);}
});
