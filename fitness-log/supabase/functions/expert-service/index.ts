const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});

Deno.serve(async(request:Request)=>{
  if(request.method==="OPTIONS")return new Response(null,{headers:cors});
  const enabled=Deno.env.get("EXPERT_SERVICE_ENABLED")==="true",roster=Deno.env.get("EXPERT_ROSTER_ID")||"";
  if(request.method==="GET")return json({enabled:enabled&&Boolean(roster),sla:{safety_review_hours:4,training_adjustment_hours:24},emergency:"offline_care_not_sla"});
  if(request.method!=="POST")return json({error:"Method not allowed"},405);
  if(!enabled||!roster)return json({error:"专家席位或排班尚未开通，不创建无人接收的工单"},503);
  const supabaseUrl=Deno.env.get("SUPABASE_URL")||"",serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",auth=request.headers.get("Authorization")||"";
  if(!supabaseUrl||!serviceKey||!auth.startsWith("Bearer "))return json({error:"专家服务身份验证未配置"},401);
  const userResponse=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{Authorization:auth,apikey:serviceKey}}),user=await userResponse.json();
  if(!userResponse.ok||!user?.id)return json({error:"请先登录后再提交专家复核"},401);
  const input=await request.json(),kind=input?.kind==="safety_review"?"safety_review":"training_adjustment",hours=kind==="safety_review"?4:24,deadline=new Date(Date.now()+hours*3600e3).toISOString(),payload={user_id:user.id,kind,status:"open",priority:kind==="safety_review"?"high":"normal",summary:String(input?.summary||"").slice(0,1000),sla_deadline:deadline,roster_id:roster};
  const created=await fetch(`${supabaseUrl}/rest/v1/expert_cases`,{method:"POST",headers:{Authorization:`Bearer ${serviceKey}`,apikey:serviceKey,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(payload)}),data=await created.json();
  if(!created.ok)return json({error:data?.message||"专家工单创建失败"},502);
  return json({case_id:data?.[0]?.id,status:"open",sla_deadline:deadline,kind},201);
});
