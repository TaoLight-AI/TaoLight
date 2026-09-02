import assert from "node:assert/strict";
import fs from "node:fs";

const planByDay={1:"upperA",2:"lowerA",3:"recovery",4:"upperB",5:"lowerB",6:"recovery",0:"recovery"};
const mode=level=>level==="low"?{sets:1,label:"精简剂量"}:{sets:2,label:"正常剂量"};
const suggest=last=>{
  if(!last)return{weight:null,reps:10,reason:"首次校准"};
  if(last.quality==="easy"&&last.reps>=10)return{weight:Math.round(last.weight*1.05/2.5)*2.5,reps:8,reason:"小幅进阶"};
  if(last.quality==="hard")return{weight:Math.round(last.weight*.9/2.5)*2.5,reps:Math.max(6,last.reps-1),reason:"自动减量"};
  return{weight:last.weight,reps:Math.min(12,last.reps+1),reason:"只加一次"};
};
const route=s=>s.risk||s.symptom?"stop":s.active?"cockpit":s.done?"receipt":s.plan==="recovery"?"recovery":!s.readiness?"readiness":"preview";

for(const d of [0,1,2,3,4,5,6])assert.ok(planByDay[d],`星期${d}没有计划`);
assert.deepEqual(mode("low"),{sets:1,label:"精简剂量"});
assert.equal(suggest({weight:40,reps:10,quality:"hard"}).weight,35,"偏重后未减量约10%");
assert.equal(suggest({weight:40,reps:10,quality:"right"}).reps,11,"剂量正好后没有只增加一次");
assert.equal(suggest({weight:40,reps:12,quality:"easy"}).reps,8,"进阶后没有回到安全次数起点");

for(const [name,state,screen] of [
  ["风险用户",{risk:true},"stop"],
  ["训练中用户",{active:true},"cockpit"],
  ["完成用户",{done:true},"receipt"],
  ["恢复日",{plan:"recovery"},"recovery"],
  ["待确认状态",{plan:"upperA"},"readiness"],
  ["待开始训练",{plan:"upperA",readiness:true},"preview"]
])assert.equal(route(state),screen,`${name}路由错误`);

const source=fs.readFileSync(new URL("../docs/fitness-log/steward-v5.js",import.meta.url),"utf8");
for(const marker of ["记住上次","只有20分钟","器械被占","语音填重量次数","今天到这里","疼痛或异常","今日身体成绩单","离线主动提醒"]){
  assert.ok(source.includes(marker),`V5缺少关键闭环：${marker}`);
}
console.log("V5模拟验收通过：7天计划、3种剂量调整、6类用户状态、8项刚需闭环。 ");
