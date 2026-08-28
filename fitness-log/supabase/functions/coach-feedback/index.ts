const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const schema={type:"object",additionalProperties:false,properties:{status:{type:"string"},headline:{type:"string"},priority:{type:"string"},achievement:{type:"string"},training_analysis:{type:"string"},nutrition_analysis:{type:"string"},recovery_analysis:{type:"string"},evidence:{type:"array",items:{type:"string"}},confidence:{type:"string",enum:["low","medium","high"]}},required:["status","headline","priority","achievement","training_analysis","nutrition_analysis","recovery_analysis","evidence","confidence"]};

Deno.serve(async(request: Request)=>{
  if(request.method==="OPTIONS")return new Response(null,{headers:cors});
  if(request.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const apiKey=Deno.env.get("GEMINI_API_KEY")||"";
    if(!apiKey)return json({error:"教练分析服务尚未配置"},503);
    const body=await request.json(),today=body?.today||{},history=Array.isArray(body?.history)?body.history.slice(-14):[],profile=body?.profile||{};
    const safe={today,history,profile:{birthYear:profile.birthYear,height:profile.height,weight:profile.weight,goal:profile.goal,equipment:profile.equipment,constraints:String(profile.constraints||"").slice(0,500)}};
    const prompt=`你是循证运动教练。目标是帮助用户改善睡眠、增肌、长期增强体能。反馈板块只复盘已经发生的训练、恢复和饮食，不生成任何未来训练安排；所有下一次训练动作、重量、组数、次数、进阶或减量处方都只属于独立的计划板块。必须比较当天与最近同类训练及7–14天趋势，再给出：一句核心结论、当天训练刺激是否合适及数据依据、当天恢复与营养的主要缺口。不要输出“下一次训练”“下次加重”“接下来24小时”或周计划，不复述表单，不堆砌指标，不说泛泛鼓励。若信息不足要明确降低置信度。固定安全边界：若当天记录出现视力变化、眼痛、胸痛、晕厥等异常，只指出风险并建议停止运动和就医，不做诊断。反馈必须具体、简洁，并说明数据依据。请分析：${JSON.stringify(safe)}`;
    const model=Deno.env.get("GEMINI_COACH_MODEL")||"gemini-3.5-flash-lite";
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{responseMimeType:"application/json",responseJsonSchema:schema,temperature:.25}})});
    const result=await response.json();
    if(!response.ok)return json({error:result?.error?.message||"Gemini教练分析请求失败"},response.status===429?429:502);
    const output=result?.candidates?.[0]?.content?.parts?.map((item:any)=>item.text||"").join("");
    if(!output)return json({error:"教练分析服务未返回结果"},502);
    return json({...JSON.parse(output),model_generated:true});
  }catch(error){return json({error:error instanceof Error?error.message:"教练分析失败"},500)}
});
