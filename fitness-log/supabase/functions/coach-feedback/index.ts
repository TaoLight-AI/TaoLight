const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const schema={type:"object",additionalProperties:false,properties:{status:{type:"string"},headline:{type:"string"},priority:{type:"string"},achievement:{type:"string"},training_analysis:{type:"string"},nutrition_analysis:{type:"string"},recovery_analysis:{type:"string"},tomorrow_plan:{type:"string"},evidence:{type:"array",items:{type:"string"}},confidence:{type:"string",enum:["low","medium","high"]}},required:["status","headline","priority","achievement","training_analysis","nutrition_analysis","recovery_analysis","tomorrow_plan","evidence","confidence"]};

export default { async fetch(request: Request) {
  if(request.method==="OPTIONS")return new Response(null,{headers:cors});
  if(request.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const apiKey=Deno.env.get("OPENAI_API_KEY")||"";
    if(!apiKey)return json({error:"教练分析服务尚未配置"},503);
    const body=await request.json(),today=body?.today||{},history=Array.isArray(body?.history)?body.history.slice(-14):[],profile=body?.profile||{};
    const safe={today,history,profile:{birthYear:profile.birthYear,height:profile.height,weight:profile.weight,goal:profile.goal,equipment:profile.equipment,constraints:String(profile.constraints||"").slice(0,500)}};
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:Deno.env.get("OPENAI_COACH_MODEL")||"gpt-4o-mini",store:false,input:[{role:"system",content:[{type:"input_text",text:"你是循证运动教练。目标是帮助用户改善睡眠、增肌、长期增强体能。必须先比较当天与最近同类训练及7–14天趋势，再判断训练刺激、恢复、营养和明日计划；不要复述表单。若信息不足要明确降低置信度。固定安全边界：避免剧烈震动、憋气、力竭和极限重量；任何视力变化、眼痛、胸痛、晕厥等异常优先停止训练并建议就医，不做诊断。建议必须具体、简洁、可执行，并说明数据依据。"}]},{role:"user",content:[{type:"input_text",text:`请分析以下结构化训练数据：${JSON.stringify(safe)}`}]}],text:{format:{type:"json_schema",name:"coach_feedback",strict:true,schema}}})});
    const result=await response.json();
    if(!response.ok)return json({error:result?.error?.message||"教练分析服务请求失败"},502);
    const output=result.output_text||result.output?.flatMap((item:any)=>item.content||[]).find((item:any)=>item.type==="output_text")?.text;
    if(!output)return json({error:"教练分析服务未返回结果"},502);
    return json({...JSON.parse(output),model_generated:true});
  }catch(error){return json({error:error instanceof Error?error.message:"教练分析失败"},500)}
} };
