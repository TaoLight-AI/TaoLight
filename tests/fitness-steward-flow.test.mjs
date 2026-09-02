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

console.log(`模拟用户路径通过：${personas.length}类日常状态 + 4类目标页状态，无死胡同。`);
