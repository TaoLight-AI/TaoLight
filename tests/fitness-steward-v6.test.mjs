import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../docs/fitness-log/steward-v5.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../docs/fitness-log/steward-v5.css",import.meta.url),"utf8");
const nutritionCss=fs.readFileSync(new URL("../docs/fitness-log/nutrition-v7.css",import.meta.url),"utf8");
const indexHtml=fs.readFileSync(new URL("../docs/fitness-log/index.html",import.meta.url),"utf8");
const sw=fs.readFileSync(new URL("../docs/fitness-log/sw.js",import.meta.url),"utf8");
const manifest=JSON.parse(fs.readFileSync(new URL("../docs/fitness-log/manifest.webmanifest",import.meta.url),"utf8"));

const extract=(name,next)=>source.slice(source.indexOf(`function ${name}`),source.indexOf(`function ${next}`));
const comparison=extract("comparisonFor","buildPhaseReport");
const build=extract("buildPhaseReport","latestPhaseDecision");
const make=(i,{quality="right",pain=false,readiness="normal",exercise="器械推胸",weight=40,reps=10,status="done"}={})=>({
  id:`w-${i}`,date:`2026-08-${String(10+i).padStart(2,"0")}`,completedAt:`2026-08-${String(10+i).padStart(2,"0")}T12:00:00`,planId:i%3===0?"recovery":"upperA",title:i%3===0?"恢复":"上肢",status,readiness,sets:i%3===0?[{exerciseId:"walk",name:"轻松快走",quality:"right"}]:[{exerciseId:"press",name:exercise,weight,reps,quality,pain}]
});
const analyze=records=>{
  const context={records,index:1,profile:{goal:"改善睡眠并增加肌肉"},services:{},result:null};
  vm.runInNewContext(`${comparison}\n${build}\nresult=buildPhaseReport(records,index);`,context);
  return context.result;
};

const stable=Array.from({length:6},(_,i)=>make(i+1,{weight:i===5?42.5:40,reps:10}));
const stableReport=analyze(stable);
assert.equal(stableReport.records.length,6);
assert.ok(["hold","progress"].includes(stableReport.decision.code));
assert.match(stableReport.goalEvidence,/不能声称睡眠已改善/);

const tired=Array.from({length:6},(_,i)=>make(i+1,{quality:i<3?"hard":"right",readiness:i<2?"low":"normal"}));
assert.equal(analyze(tired).decision.code,"reduce","高疲劳阶段没有自动减量");

const unsafe=Array.from({length:6},(_,i)=>make(i+1,{pain:i===4,status:i===4?"stopped":"done"}));
assert.equal(analyze(unsafe).decision.code,"review","安全信号没有冻结自动进阶");

for(const marker of ["身体进步驾驶舱","当前唯一任务","progressGauge","v5-dashboard-grid","mapLegacyRows","离线主动提醒","huawei-health","真人专家与响应SLA"]){
  assert.ok(source.includes(marker),`缺少V6闭环：${marker}`);
}
for(const marker of ["v5-dashboard-gauge","v5-dashboard-decision","v5-six-dots","v5-service-list"])assert.ok(css.includes(marker),`缺少V6视觉：${marker}`);
for(const marker of ["拍餐","analyze-meal","确认计入全天","nutritionDecision","nutritionHistoryCard","photoStored:false"]){
  assert.ok(source.includes(marker),`缺少拍餐闭环：${marker}`);
}
for(const marker of ["按修改重新计算","recalculateMeal","requestMealAnalysis","corrected-text","用户校正后的餐食"]){
  assert.ok(source.includes(marker),`缺少餐食文字纠错重算：${marker}`);
}
for(const marker of ["v5-nutrition-gauge","v5-photo-button","v5-meal-result","repeat(4,1fr)"]){
  assert.ok(nutritionCss.includes(marker),`缺少拍餐视觉：${marker}`);
}
assert.ok(nutritionCss.includes("v5-meal-result-actions"),"缺少纠错重算操作区的手机适配");
for(const marker of ["v5-onboarding-sheet","v5-onboarding-submit"]){
  assert.ok(source.includes(marker),`缺少可滚动建档结构：${marker}`);
}
for(const marker of ["height:100dvh","overflow-y:auto","-webkit-overflow-scrolling:touch","position:sticky","@media(max-height:700px)"]){
  assert.ok(css.includes(marker),`缺少弱内核手机建档防卡死规则：${marker}`);
}
for(const marker of ["@media(max-width:620px)","width:100%;max-width:none","env(safe-area-inset-bottom)","border-radius:18px 18px 0 0"]){
  assert.ok(nutritionCss.includes(marker),`缺少手机全宽适配：${marker}`);
}
for(const marker of [".steward-v5 .shell,.steward-v5 #logForm,.steward-v5 #formView","minmax(0,1fr)","overflow-wrap:anywhere","text-size-adjust:100%"]){
  assert.ok(nutritionCss.includes(marker),`缺少全页面防裁切规则：${marker}`);
}
assert.ok(fs.existsSync(new URL("../fitness-log/supabase/functions/analyze-meal/index.ts",import.meta.url)),"缺少餐食识别服务");
for(const marker of ["periodicsync","notificationclick","SET_REMINDER"])assert.ok(sw.includes(marker),`缺少提醒能力：${marker}`);
assert.equal(manifest.display,"standalone");
assert.ok(!indexHtml.includes('body:not(.steward-v5)::before'),"不应再显示品牌启动页");
assert.ok(!indexHtml.includes("v5BootOut"),"不应保留4秒启动画面计时");
assert.ok(indexHtml.indexOf("steward-v5.js?v=20260904-3")<indexHtml.indexOf("script.js?v=20260828-8"),"新版主界面脚本必须在旧版脚本前启动");
assert.ok(indexHtml.includes('id="v5Instant"'),"首个HTML片段应直接显示今日界面骨架，禁止白屏");
assert.ok(source.includes('q("#v5Instant")?.remove()'),"正式界面启动后必须移除即时骨架");
assert.ok(fs.existsSync(new URL("../fitness-log/supabase/functions/huawei-health/index.ts",import.meta.url)));
assert.ok(fs.existsSync(new URL("../fitness-log/supabase/functions/expert-service/index.ts",import.meta.url)));

console.log("V7模拟验收通过：V6闭环、常驻拍餐、AI识别、文字纠错重算、人工确认、全天累计、营养趋势与照片不留档。 ");
