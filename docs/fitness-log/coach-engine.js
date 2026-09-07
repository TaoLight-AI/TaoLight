/* Pure, versioned decisions. No network, credentials or personal defaults. */
(function(root){
'use strict';
const version='2026.09.07';
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
function prescribe({sessions=[],exerciseId,startWeight=0,restricted=false,increment=2.5}){
 const recent=sessions.filter(w=>w.status==='done'&&!w.endedEarly).map(w=>(w.sets||[]).filter(s=>s.exerciseId===exerciseId)).filter(s=>s.length).slice(0,2);
 const last=recent[0]?.at(-1);
 if(!last)return {weight:startWeight,reps:10,why:'首次校准：完成10次后仍保留3次余力；起始重量仅为试用参考',code:'calibrate',version};
 if(recent[0].some(s=>s.pain||s.quality==='hard'||(Number.isFinite(s.rir)&&s.rir<2)))return {weight:Math.max(0,Math.floor(last.weight*.9/increment)*increment),reps:last.reps,why:'上次出现吃力或不适：只降低重量；疼痛动作先暂停复核',code:'reduce',version};
 const eligible=!restricted&&recent.length===2&&recent.every(sets=>sets.length>=2&&sets.every(s=>s.reps>=15&&Number.isFinite(s.rir)&&s.rir>=3&&!s.pain&&s.weight===last.weight));
 if(eligible&&increment<=last.weight*.1)return {weight:last.weight+increment,reps:10,why:'连续两次全部工作组达到15次且余力≥3，增加一个小档后重新累积次数',code:'progress',version};
 return {weight:last.weight,reps:Math.min(15,last.reps),why:restricted?'保持已耐受负荷，受限档案不自动加重':'保持重量；达到次数上限且连续两次有余力后才考虑加重',code:'hold',version};
}
function validatePackage(data,today){
 if(!data||data.format!=='taolight-coach-data'||![1,2].includes(data.schema_version)||!Array.isArray(data.records))throw Error('请选择有效的教练数据包');
 if(data.records.length>10000)throw Error('记录超过导入上限');
 const accepted=[],issues=[],seen=new Set();
 for(const [i,r] of data.records.entries()){
  const date=r.logDate||r.date;
  if(!validDate(date)||date>today){issues.push(`第${i+1}条日期无效或在未来`);continue;}
  const sets=r.sets||[];
  if(!Array.isArray(sets)||sets.some(s=>!Number.isFinite(s.weight)||s.weight<0||s.weight>1000||!Number.isInteger(s.reps)||s.reps<1||s.reps>100||(s.rir!=null&&(!Number.isFinite(s.rir)||s.rir<0||s.rir>10)))){issues.push(`第${i+1}条组次或单位异常`);continue;}
  const key=r.id||JSON.stringify([date,r.planId||r.sessionType,sets,r.exercises]);
  if(seen.has(key)){issues.push(`第${i+1}条重复`);continue;}seen.add(key);accepted.push({...r,logDate:date});
 }
 return {records:accepted.sort((a,b)=>a.logDate.localeCompare(b.logDate)),issues,version};
}
function metricSummary(rows,field){const values=rows.filter(r=>Number.isFinite(r[field])).map(r=>r[field]);return {n:values.length,mean:values.length?values.reduce((a,b)=>a+b,0)/values.length:null};}
const api={version,validDate,prescribe,validatePackage,metricSummary};
if(typeof module!=='undefined')module.exports=api;else root.CoachEngine=api;
})(typeof window!=='undefined'?window:this);
