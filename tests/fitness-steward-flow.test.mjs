import assert from "node:assert/strict";

function route(s){
  if(!s.profile)return{screen:"onboarding",cta:"next"};
  if(s.signalAgeHours>=72)return{screen:"signal",cta:"check"};
  if(!s.todayOutcome)return{screen:"action",cta:"outcome"};
  if(!s.experienceRated)return{screen:"result",cta:"experience"};
  return{screen:"result",cta:"goal"};
}

function goalRoute(s){
  if(s.signalAgeHours>=72)return{cta:"home",changesState:true};
  if(!s.measures)return{cta:"evidence",changesState:true};
  if(s.todayOutcome)return{cta:"plan",changesState:true};
  return{cta:"home",changesState:true};
}

function receipt(action,goal="增加肌肉"){
  const quality=action.pain?"发现不适":action.outcome==="easy"?"轻松完成":action.outcome==="hard"?"完成偏吃力":"剂量正好";
  return{content:action.decision,quality,goalMeaning:goal.includes("肌")?"有效刺激":"行动证据",next:action.pain?"冻结进阶":"明日预案",celebrate:!action.pain};
}

const personas=[
  ["首次用户",{profile:false},"onboarding"],
  ["数据过期用户",{profile:true,signalAgeHours:80},"signal"],
  ["待行动用户",{profile:true,signalAgeHours:12,todayOutcome:false},"action"],
  ["刚完成用户",{profile:true,signalAgeHours:12,todayOutcome:true,experienceRated:false},"result"],
  ["反馈完成用户",{profile:true,signalAgeHours:12,todayOutcome:true,experienceRated:true},"result"]
];

for(const [name,state,screen] of personas){
  const result=route(state);
  assert.equal(result.screen,screen,`${name}进入错误界面`);
  assert.ok(result.cta,`${name}没有下一步`);
}

for(const state of [
  {signalAgeHours:80,measures:1,todayOutcome:true},
  {signalAgeHours:12,measures:0,todayOutcome:false},
  {signalAgeHours:12,measures:1,todayOutcome:true},
  {signalAgeHours:12,measures:1,todayOutcome:false}
]){
  const result=goalRoute(state);
  assert.equal(result.changesState,true,"目标页出现无状态变化按钮");
  assert.notEqual(result.cta,"none","目标页出现死胡同");
}

for(const action of [
  {decision:"完成上肢A",outcome:"right"},
  {decision:"完成精简训练",outcome:"hard"},
  {decision:"暂停诱发不适的动作",outcome:"hard",pain:true}
]){
  const report=receipt(action);
  for(const key of ["content","quality","goalMeaning","next"])assert.ok(report[key],`今日成绩单缺少${key}`);
  if(action.pain)assert.equal(report.celebrate,false,"疼痛路径出现庆祝反馈");
}

console.log(`模拟用户路径通过：${personas.length}类日常状态 + 4类目标页状态 + 3类当日成绩单，无死胡同。`);
