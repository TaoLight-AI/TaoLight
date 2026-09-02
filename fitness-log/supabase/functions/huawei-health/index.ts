const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});

Deno.serve(async(request:Request)=>{
  if(request.method==="OPTIONS")return new Response(null,{headers:cors});
  if(request.method!=="GET")return json({error:"Method not allowed"},405);
  const clientId=Deno.env.get("HUAWEI_HEALTH_CLIENT_ID")||"",clientSecret=Deno.env.get("HUAWEI_HEALTH_CLIENT_SECRET")||"",authStart=Deno.env.get("HUAWEI_HEALTH_AUTH_START_URL")||"",approved=Deno.env.get("HUAWEI_HEALTH_APPROVED")==="true";
  const configured=Boolean(clientId&&clientSecret&&authStart&&approved);
  if(!configured)return json({configured:false,approved,missing:[!clientId&&"client_id",!clientSecret&&"client_secret",!authStart&&"secure_oauth_start",!approved&&"health_service_approval"].filter(Boolean),error:"华为Health Service Kit尚未完成开发者审批或服务端配置"},503);
  return json({configured:true,authorize_url:authStart,scopes:["activity","sleep","heart_rate"],data_policy:"user_authorized_only"});
});
