const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const schema={type:"object",additionalProperties:false,properties:{status:{type:"string"},headline:{type:"string"},priority:{type:"string"},achievement:{type:"string"},training_analysis:{type:"string"},nutrition_analysis:{type:"string"},recovery_analysis:{type:"string"},tomorrow_plan:{type:"string"},evidence:{type:"array",items:{type:"string"}},confidence:{type:"string",enum:["low","medium","high"]}},required:["status","headline","priority","achievement","training_analysis","nutrition_analysis","recovery_analysis","tomorrow_plan","evidence","confidence"]};

Deno.serve(async(request: Request)=>{
  if(request.method==="OPTIONS")return new Response(null,{headers:cors});
  if(request.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const apiKey=Deno.env.get("GEMINI_API_KEY")||"";
    if(!apiKey)return json({error:"教练分析服务尚未配置"},503);
    const body=await request.json(),today=body?.today||{},history=Array.isArray(body?.history)?body.history.slice(-14):[],profile=body?.profile||{};
    const safe={today,history,profile:{birthYear:profile.birthYear,height:profile.height,weight:profile.weight,goal:profile.goal,equipment:profile.equipment,constraints:String(profile.constraints||"").slice(0,500)}};
    const prompt=`你是循证运动教练。目标是帮助用户改善睡眠、增肌、长期增强体能。反馈只做训练后的复盘与接下来24小时恢复指导，不重复计划板块，不生成下一次逐动作处方，也不建议沿用上次记录。必须先比较当天与最近同类训练及7–14天趋势，再给出：一句核心结论、训练刺激是否合适及数据依据、恢复与营养的主要缺口、接下来24小时唯一最重要的行动。不要复述表单，不堆砌指标，不说泛泛鼓励。若信息不足要明确降低置信度。固定安全边界：避免剧烈震动、憋气、力竭和极限重量；任何视力变化、眼痛、胸痛、晕厥等异常优先停止训练并建议就医，不做诊断。建议必须具体、简洁、可执行，并说明数据依据。tomorrow_plan 字段填写接下来24小时行动，不写下一次训练处方。请分析：${JSON.stringify(safe)}`;
    const model=Deno.env.get("GEMINI_COACH_MODEL")||"gemini-2.5-flash";
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",responseJsonSchema:schema,temperature:.25}})});
    const result=await response.json();
    if(!response.ok)return json({error:result?.error?.message||"Gemini教练分析请求失败"},response.status===429?429:502);
    const output=result?.candidates?.[0]?.content?.parts?.map((item:any)=>item.text||"").join("");
    if(!output)return json({error:"教练分析服务未返回结果"},502);
    return json({...JSON.parse(output),model_generated:true});
  }catch(error){return json({error:error instanceof Error?error.message:"教练分析失败"},500)}
});
