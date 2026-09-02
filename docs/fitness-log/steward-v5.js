(function(){
"use strict";

const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const account=((typeof key!=="undefined"?key:"").slice(0,10)||"guest");
const K={profile:`steward-profile-${account}`,workouts:`steward-v5-workouts-${account}`,readiness:`steward-v5-readiness-${account}`,phaseAI:`steward-v5-phase-ai-${account}`,services:`steward-v5-services-${account}`};
let profile=load(K.profile,{}),workouts=load(K.workouts,[]),readiness=load(K.readiness,[]),phaseAI=load(K.phaseAI,{}),services=load(K.services,{}),legacyWorkouts=[],view="today",restTicker=null,reminderTicker=null,remoteBusy=false;
const day=(date=new Date())=>date.toLocaleDateString("en-CA");
const today=()=>day();

if(!q("#formView"))return;
q("#stewardV4")?.remove();
q("#stewardV3")?.classList.add("hidden");
q("#feedbackModal")?.remove();
q("#svProfileModal")?.remove();
q(".v4-onboarding")?.remove();
if(typeof showFeedback==="function")showFeedback=()=>{};
document.body.classList.add("steward-v5");
document.title="奢华健身管家";
q(".brand")&&(q(".brand").textContent="奢华健身管家");
new MutationObserver(()=>{q("#feedbackModal")?.remove();q("#svProfileModal")?.remove();q(".v4-onboarding")?.remove()}).observe(document.body,{childList:true,subtree:true});

const app=document.createElement("section");
app.id="stewardV5";
q("#formView").prepend(app);

const plans={
  upperA:{title:"上肢 · 推拉基础",short:"上肢A",minutes:45,exercises:[
    {id:"chest-press",name:"器械推胸",muscle:"胸·肱三头",alt:"绳索站姿推胸"},
    {id:"seated-row",name:"坐姿划船",muscle:"背·肱二头",alt:"单臂绳索划船"},
    {id:"lat-pull",name:"高位下拉",muscle:"背阔肌",alt:"直臂下压"},
    {id:"cable-curl",name:"绳索弯举",muscle:"肱二头",alt:"器械弯举"}
  ]},
  lowerA:{title:"下肢 · 稳定基础",short:"下肢A",minutes:45,exercises:[
    {id:"leg-press",name:"腿举",muscle:"股四头·臀",alt:"靠墙静蹲"},
    {id:"leg-curl",name:"坐姿腿弯举",muscle:"腘绳肌",alt:"卧姿腿弯举"},
    {id:"hip-thrust",name:"臀推机",muscle:"臀肌",alt:"器械臀后伸"},
    {id:"calf-raise",name:"坐姿提踵",muscle:"小腿",alt:"站姿提踵"}
  ]},
  upperB:{title:"上肢 · 姿态与力量",short:"上肢B",minutes:45,exercises:[
    {id:"incline-press",name:"上斜器械推胸",muscle:"上胸·肱三头",alt:"上斜俯卧撑"},
    {id:"supported-row",name:"胸托划船",muscle:"上背",alt:"坐姿绳索划船"},
    {id:"face-pull",name:"绳索面拉",muscle:"后束·肩胛",alt:"反向飞鸟机"},
    {id:"triceps",name:"绳索下压",muscle:"肱三头",alt:"器械臂屈伸"}
  ]},
  lowerB:{title:"下肢 · 关节友好",short:"下肢B",minutes:45,exercises:[
    {id:"leg-extension",name:"腿屈伸",muscle:"股四头",alt:"低台阶踏步"},
    {id:"leg-curl-b",name:"坐姿腿弯举",muscle:"腘绳肌",alt:"卧姿腿弯举"},
    {id:"hip-abduction",name:"髋外展机",muscle:"臀中肌",alt:"弹力带侧步"},
    {id:"calf-raise-b",name:"坐姿提踵",muscle:"小腿",alt:"站姿提踵"}
  ]},
  recovery:{title:"恢复日 · 为下次蓄力",short:"恢复",minutes:30,exercises:[]}
};

function planForDate(date=new Date()){
  return plans[({1:"upperA",2:"lowerA",4:"upperB",5:"lowerB"})[date.getDay()]||"recovery"];
}
function nextStrengthPlan(){for(let i=1;i<=7;i++){const d=new Date();d.setDate(d.getDate()+i);const p=planForDate(d);if(p!==plans.recovery)return{...p,date:d}}return null}
function todaysReadiness(){return readiness.find(x=>x.date===today())||null}
function todaysWorkout(){return workouts.find(x=>x.date===today()&&["done","stopped"].includes(x.status))||null}
function activeWorkout(){return workouts.find(x=>x.status==="active")||null}
function riskLocked(){return !!(profile.risks?.heart||profile.risks?.doctor)}
function roundLoad(n){return Math.max(0,Math.round(n/2.5)*2.5)}
function completed(){
  const local=workouts.filter(x=>["done","stopped"].includes(x.status)),seen=new Set(local.map(x=>`${x.date}|${x.planId}`));
  return [...local,...legacyWorkouts.filter(x=>!seen.has(`${x.date}|${x.planId}`))].sort((a,b)=>new Date(b.completedAt||b.startedAt||b.date)-new Date(a.completedAt||a.startedAt||a.date));
}
function previousSet(exerciseId,excludeId){for(const w of completed()){if(w.id===excludeId)continue;const found=[...(w.sets||[])].reverse().find(s=>s.exerciseId===exerciseId&&!s.pain);if(found)return found}return null}
function suggest(exerciseId,excludeId){const last=previousSet(exerciseId,excludeId);if(!last)return{weight:null,reps:10,why:"首次校准：选择能做10次、仍有约3次余力的轻重量"};if(last.quality==="easy"&&last.reps>=10)return{weight:roundLoad(last.weight*1.05)||last.weight,reps:8,why:"上次余力较多，小幅进阶后从8次开始"};if(last.quality==="hard")return{weight:roundLoad(last.weight*.9),reps:Math.max(6,last.reps-1),why:"上次偏吃力，本次自动减量约10%"};return{weight:last.weight,reps:Math.min(12,last.reps+1),why:"沿用上次重量，只多争取1次"}}
function todayMode(){const r=todaysReadiness(),decision=latestPhaseDecision();if(r?.level==="low")return{label:"今日精简",factor:.7,note:"今天每个动作只做1组，不补课、不力竭"};if(["reduce","review"].includes(decision?.code))return{label:"阶段减量",factor:.7,note:"最近6次显示需要先降疲劳，本次每个动作1组"};return{label:"正常剂量",factor:1,note:"每组保留2—3次余力，完成比练狠重要"}}
function safetyText(){if(profile.risks?.eye)return"眼部边界已锁定：不憋气、不力竭、不做剧烈震动动作";if(profile.risks?.joint)return"关节边界已锁定：疼痛不是训练刺激，出现不适立即停止";return"安全边界：全程能顺畅呼吸，异常疼痛立即停止"}
function totalTargetSets(w){return w.exercises.reduce((n,e)=>n+e.targetSets,0)}
function currentExercise(w){return w.exercises[w.currentExercise]}
function latestCurrentSet(w,e){return [...w.sets].reverse().find(s=>s.exerciseIndex===w.currentExercise&&s.exerciseId===e.id)}

function header(sub="今天不用想计划"){
  return`<header class="v5-header"><div><small>${esc(profile.name||"你好")} · ${new Date().toLocaleDateString("zh-CN",{month:"long",day:"numeric",weekday:"short"})}</small><h1>你比想象中的更“强大”</h1><p>${sub}</p></div><button class="v5-profile-button" data-view="profile" aria-label="身体档案">澄</button></header>`
}
function nav(){return`<nav class="v5-nav"><button data-view="today" class="${view==="today"?"active":""}"><i>◉</i>今天</button><button data-view="progress" class="${view==="progress"?"active":""}"><i>↗</i>进步</button><button data-view="profile" class="${view==="profile"?"active":""}"><i>◇</i>档案</button></nav>`}
function safetyStrip(type="safe"){return`<div class="v5-safety ${type}"><i>${type==="stop"?"!":"盾"}</i><span>${safetyText()}</span></div>`}

function renderReadiness(plan){
  return`${header("训练前只回答一个问题")}<article class="v5-card v5-readiness"><small>管家需要这一个信号来定今天剂量</small><h2>今天身体比平时怎样？</h2><div class="v5-ready-options"><button data-ready="good"><i>↑</i><b>精力好</b><span>按正常计划</span></button><button data-ready="normal"><i>→</i><b>和平时一样</b><span>保持余力</span></button><button data-ready="low"><i>↓</i><b>明显疲劳</b><span>自动做精简版</span></button></div><button class="v5-danger-link" data-symptom>有疼痛、胸闷、头晕或视力异常</button></article><div class="v5-peek"><span>今天计划</span><b>${plan.short}</b><em>${plan.minutes}分钟</em></div>`
}
function renderSafetyStop(message="今天不进入训练"){
  return`${header("安全比完成计划重要")}<article class="v5-card v5-stop"><div class="v5-stop-mark">!</div><small>管家已停止进阶</small><h2>${message}</h2><p>当前信号需要先确认安全边界。请停止运动；胸痛、晕厥、明显呼吸困难或突发视力变化应及时线下就医。</p>${safetyStrip("stop")}<button class="v5-secondary" data-view="profile">查看已锁定边界</button></article>`
}
function renderPreview(plan){
  const mode=todayMode(),sets=Math.round(plan.exercises.length*2*mode.factor),next=plan.exercises[0],first=suggest(next.id);
  return`${header("管家已经排好，到了就开始")}<article class="v5-card v5-preview"><div class="v5-plan-badge"><i>✓</i><span>已核对身体状态</span><b>${mode.label}</b></div><small>今日唯一训练</small><h2>${plan.title}</h2><div class="v5-plan-numbers"><div><b>${plan.exercises.length}</b><span>动作</span></div><div><b>${sets}</b><span>工作组</span></div><div><b>${mode.factor<1?25:plan.minutes}</b><span>分钟</span></div></div>${safetyStrip()}<div class="v5-first-action"><span>开始后第一件事</span><b>${next.name}</b><small>${first.why}</small></div><button class="v5-primary" data-start="full">开始今天训练</button>${mode.factor===1?'<button class="v5-secondary" data-start="short">今天只有20分钟</button>':""}</article>`
}
function renderRecovery(){
  const next=nextStrengthPlan();
  return`${header("今天恢复，明天才有力气变强")}<article class="v5-card v5-recovery"><div class="v5-recovery-orb"><i></i><span>30</span><em>分钟</em></div><small>今天唯一行动</small><h2>轻松快走＋按时上床</h2><p>能正常说完整句话的速度快走30分钟；睡前30分钟停止工作与饮酒。恢复日不补力量训练。</p><div class="v5-next"><span>下一次力量训练</span><b>${next.short}</b><small>${next.exercises[0].name}开始</small></div><button class="v5-primary" data-recovery>完成后生成今日反馈</button></article>`
}
function renderCockpit(w){
  const e=currentExercise(w),done=w.sets.length,total=totalTargetSets(w),within=w.sets.filter(s=>s.exerciseIndex===w.currentExercise).length,target=suggest(e.id,w.id),last=latestCurrentSet(w,e);let weight=w.draftWeight??(last?.weight??target.weight),reps=w.draftReps??(last?.quality==="easy"?Math.min(12,last.reps+1):last?.quality==="hard"?Math.max(6,last.reps-1):target.reps);if(last?.quality==="hard"&&w.draftWeight==null)weight=roundLoad(last.weight*.9);const pct=Math.round(done/total*100),rest=w.restUntil?Math.max(0,Math.ceil((w.restUntil-Date.now())/1000)):0;
  return`${header(`训练进行中 · ${done}/${total}组`)}<div class="v5-progress"><i style="width:${pct}%"></i></div><article class="v5-card v5-cockpit"><div class="v5-cockpit-top"><div><small>动作 ${w.currentExercise+1}/${w.exercises.length} · 第${within+1}/${e.targetSets}组</small><h2>${esc(e.name)}</h2><span>${esc(e.muscle)}</span></div><div class="v5-movement"><b>${String(w.currentExercise+1).padStart(2,"0")}</b><i></i></div></div><div class="v5-prescription"><span>这一组</span><div class="v5-target"><section><small>重量 kg</small><div><button data-weight="-2.5">−</button><input id="v5Weight" type="number" min="0" step="2.5" value="${weight??""}" placeholder="首次填写"><button data-weight="2.5">＋</button></div></section><section><small>次数</small><div><button data-reps="-1">−</button><input id="v5Reps" type="number" min="1" max="30" value="${reps}"><button data-reps="1">＋</button></div></section></div><p>${last?last.quality==="hard"?"上一组偏吃力，重量已降低约10%":"沿用上一组，只根据余力微调":"管家建议："+target.why}</p></div>${rest?`<div class="v5-rest"><span>休息</span><b data-rest>${Math.floor(rest/60)}:${String(rest%60).padStart(2,"0")}</b><button data-skip-rest>跳过</button></div>`:""}<div class="v5-set-actions"><button data-quality="right" class="v5-primary"><b>正好 · 完成本组</b><span>还可再做2—3次</span></button><button data-quality="easy"><b>偏轻</b><span>余力很多</span></button><button data-quality="hard"><b>偏重</b><span>勉强完成</span></button></div><div class="v5-exceptions"><button data-swap>器械被占</button><button data-voice>语音填重量次数</button><button data-finish-early>今天到这里</button><button data-pain>疼痛或异常</button></div>${safetyStrip()}</article>`
}
function workoutMetrics(w){const sets=w.sets||[],weighted=sets.filter(s=>s.weight>0),volume=Math.round(weighted.reduce((n,s)=>n+s.weight*s.reps,0)),effective=sets.filter(s=>!s.pain&&s.quality!=="hard").length,previous=completed().find(x=>x.id!==w.id&&x.planId===w.planId),previousVolume=previous?Math.round((previous.sets||[]).reduce((n,s)=>n+(s.weight||0)*(s.reps||0),0)):0;return{sets:sets.length,effective,volume,previousVolume,change:previousVolume?Math.round((volume-previousVolume)/previousVolume*100):null}}
function chronologicalCompleted(){return completed().slice().sort((a,b)=>new Date(a.completedAt||a.startedAt||a.date)-new Date(b.completedAt||b.startedAt||b.date))}
function phaseState(){
  const all=chronologicalCompleted(),fullStages=Math.floor(all.length/6),records=fullStages?all.slice((fullStages-1)*6,fullStages*6):all,pending=all.slice(fullStages*6),report=fullStages?buildPhaseReport(records,fullStages):null;
  return{all,fullStages,records,pending,report,progress:fullStages?pending.length:all.length,remaining:6-(fullStages?pending.length:all.length)};
}
function comparisonFor(records){
  const byExercise=new Map();
  records.filter(w=>!["recovery","observation"].includes(w.planId)).forEach(w=>{const perSession=new Map();(w.sets||[]).filter(s=>!s.pain&&s.weight>0&&s.reps>0).forEach(s=>{const key=s.exerciseId||s.name,current=perSession.get(key);if(!current||s.weight*s.reps>current.weight*current.reps)perSession.set(key,{name:s.name||key,weight:s.weight,reps:s.reps,date:w.date})});perSession.forEach((s,key)=>{if(!byExercise.has(key))byExercise.set(key,[]);byExercise.get(key).push(s)})});
  return[...byExercise.values()].filter(x=>x.length>1).map(x=>{const first=x[0],last=x.at(-1),before=first.weight*first.reps,after=last.weight*last.reps;return{name:last.name,first,last,change:before?Math.round((after-before)/before*100):0}}).sort((a,b)=>b.change-a.change)[0]||null;
}
function buildPhaseReport(records,index){
  const strength=records.filter(w=>!["recovery","observation"].includes(w.planId)),recovery=records.filter(w=>w.planId==="recovery").length,observations=records.length-strength.length-recovery,allSets=records.flatMap(w=>w.sets||[]),sets=strength.flatMap(w=>w.sets||[]),effective=sets.filter(s=>!s.pain&&s.quality!=="hard").length,hard=sets.filter(s=>s.quality==="hard").length,pain=allSets.filter(s=>s.pain).length,stopped=records.filter(w=>w.status==="stopped").length,early=strength.filter(w=>w.endedEarly).length,low=strength.filter(w=>w.readiness==="low").length,comparison=comparisonFor(records),start=records[0]?.date,end=records.at(-1)?.date,span=start&&end?Math.max(1,Math.round((new Date(end+"T12:00:00")-new Date(start+"T12:00:00"))/864e5)+1):null,ratio=sets.length?effective/sets.length:0,sleep=records.map(w=>Number(w.health?.sleepHours)).filter(x=>x>0&&x<16);
  let decision;
  if(pain||stopped)decision={code:"review",title:"先解决异常，再谈进步",action:"下一次力量训练先维持1组；异常未消失就暂停，并转专业复核。",reason:`6次记录中出现${pain||stopped}个安全信号，系统已冻结自动加量。`};
  else if((sets.length&&hard/sets.length>=.3)||low>=2||early>=2)decision={code:"reduce",title:"下一阶段先把疲劳压低",action:"下一次每个动作1组，重量不增加；状态转好后再恢复2组。",reason:`偏重${hard}组、低状态${low}次、提前结束${early}次，继续堆量的收益偏低。`};
  else if(comparison?.change>=5&&ratio>=.75)decision={code:"progress",title:"已经适应，只推进一个变量",action:`保持每个动作2组；${comparison.name}优先增加1次，重量与其他动作不同时增加。`,reason:`${comparison.name}从${comparison.first.weight}kg×${comparison.first.reps}到${comparison.last.weight}kg×${comparison.last.reps}，且大多数工作组余力合适。`};
  else decision={code:"hold",title:"先稳定剂量，建立可比证据",action:"下一阶段保持每个动作2组；同动作先增加1次，不同时加重量和组数。",reason:comparison?`${comparison.name}已有两次对照，但变化尚不足以支持整体加量。`:"当前覆盖了多种训练日，同动作复测还不足，暂不冒进。"};
  const key=`stage-${index}-${records.map(x=>x.id).join("-")}`;
  const sleepEvidence=sleep.length>=4?`记录到${sleep.length}晚睡眠，平均${(sleep.reduce((a,b)=>a+b,0)/sleep.length).toFixed(1)}小时；仍需与夜醒和个人基线共同判断。`:`仅有${sleep.length}晚有效睡眠数据，不能声称睡眠已改善。`;
  return{key,index,records,strength:strength.length,recovery,observations,sets:sets.length,effective,hard,pain,stopped,early,low,comparison,start,end,span,ratio,decision,goalEvidence:/睡/.test(profile.goal||"")?sleepEvidence:`已形成${strength.length}次力量行动证据，身体变化仍以同动作复测为准。`};
}
function latestPhaseDecision(){return phaseState().report?.decision||null}
function phaseAIFor(report){return report?phaseAI[report.key]?.result||null:null}
function renderSixDots(count){return`<div class="v5-six-dots" aria-label="阶段记录 ${count}/6">${Array.from({length:6},(_,i)=>`<i class="${i<count?"done":""}">${i<count?"✓":i+1}</i>`).join("")}</div>`}
function renderPhaseReport(report,pendingCount=0){
  const ai=phaseAIFor(report),source=ai?"AI服务端已复核":"证据引擎已完成",compare=report.comparison?`${esc(report.comparison.name)} ${report.comparison.first.weight}kg×${report.comparison.first.reps} → ${report.comparison.last.weight}kg×${report.comparison.last.reps}`:"等待同动作第二次对照";
  return`<article class="v5-card v5-phase-report ${report.decision.code}"><div class="v5-report-head"><div class="v5-stage-ring"><b>6</b><span>/ 6次</span></div><section><small>第${report.index}阶段 · ${esc(report.start)}—${esc(report.end)}</small><h2>管家综合反馈</h2><em>${source}</em></section></div><div class="v5-evidence-row"><section><b>${report.strength}</b><span>力量行动</span></section><section><b>${report.effective}/${report.sets}</b><span>剂量合适</span></section><section><b>${report.stopped?report.stopped:"0"}</b><span>安全停止</span></section></div><div class="v5-coach-verdict"><span>教练结论</span><h3>${esc(ai?.verdict||report.decision.title)}</h3><p>${esc(ai?.summary||report.decision.reason)}</p></div><div class="v5-compare"><span>身体证据</span><b>${compare}</b><small>${esc(report.goalEvidence)}</small></div><div class="v5-next-stage"><span>下一阶段唯一决定</span><b>${esc(report.decision.action)}</b><small>这个决定已进入下一次训练剂量，不需要你手动改计划。</small></div>${pendingCount?`<div class="v5-stage-pending"><span>新阶段</span>${renderSixDots(pendingCount)}<b>${pendingCount}/6</b></div>`:""}<button class="v5-secondary" data-ai-review>${ai?"重新请求专业复核":"请求AI服务端复核"}</button></article>`;
}
function renderReceipt(w){
  const m=workoutMetrics(w),stopped=w.status==="stopped",next=nextStrengthPlan(),stage=phaseState(),justUnlocked=stage.report&&stage.pending.length===0&&stage.report.records.at(-1)?.id===w.id,items=w.exercises.filter(e=>w.sets.some(s=>s.exerciseId===e.id)).map(e=>{const sets=w.sets.filter(s=>s.exerciseId===e.id),last=sets.at(-1);return`<li><i>${last?.pain?"!":"✓"}</i><span><b>${esc(e.name)}</b><small>${sets.length}组 · ${last?.weight||"自重"}${last?.weight?"kg":""} · ${last?.reps||0}次</small></span></li>`}).join("");
  return`${header(stopped?"身体发出信号，管家已经接手":"今天的努力已经变成下一次依据")}<article class="v5-card v5-receipt ${stopped?"stopped":""}"><small>今日身体成绩单</small><div class="v5-receipt-hero"><div>${stopped?"!":"✓"}</div><section><span>${w.planId==="recovery"?"恢复完成":stopped?"安全停止":w.endedEarly?"保底训练完成":"训练完成"}</span><h2>${esc(w.title)}</h2><b>${w.planId==="recovery"?"30分钟":`${m.sets}组 · ${m.effective}组处于有效余力`}</b></section></div>${w.planId==="recovery"?`<div class="v5-proof"><section><span>今天解决了什么</span><b>没有用疲劳换“自律感”</b><small>恢复被正式计入计划，为下一次力量训练保留状态。</small></section></div>`:`<div class="v5-proof"><section><span>完成得如何</span><b>${stopped?"异常已被拦截":w.endedEarly?"已保留有效完成量":m.effective===m.sets?"全部处于目标余力":`${m.effective}/${m.sets}组剂量合适`}</b><small>${stopped?"不继续加量，不把疼痛当成进步。":w.endedEarly?"临时结束不需要补课，下次按原节奏继续。":m.change==null?"本次已建立个人基线，下次开始可以比较。":`同计划训练容量较上次${m.change>=0?"增加":"减少"}${Math.abs(m.change)}%。`}</small></section><section><span>今天留下的证据</span><b>${m.volume?m.volume.toLocaleString()+" kg·次":"已记录动作质量"}</b><small>不追逐虚拟分数，只保留能改变下一次处方的数据。</small></section></div><ul class="v5-done-list">${items}</ul>`}<div class="v5-verdict"><span>管家下一步</span><b>${stopped?"保持安全降级，先确认异常":justUnlocked?"最近6次已完成综合分析":`距离阶段反馈还差${stage.remaining}次`}</b><small>${stopped?"需要专业判断的部分不会由AI冒充。":justUnlocked?"阶段结论已改变下一次剂量，打开即可核对。":`下次从${next.short}开始，${next.exercises[0].name}会自动沿用上次。`}</small></div><button class="${justUnlocked?"v5-primary":"v5-secondary"}" data-view="progress">${justUnlocked?"查看6次管家综合反馈":"查看身体变好的证据"}</button></article>`
}
function renderProgress(){
  const stage=phaseState(),done=completed().slice(0,6),strength=done.filter(x=>x.planId!=="recovery"),max=Math.max(1,...done.map(x=>workoutMetrics(x).sets));
  if(stage.report)return`${header("每6次复盘一次，并真正改变下一阶段")}${renderPhaseReport(stage.report,stage.pending.length)}<article class="v5-card v5-progress-card compact"><small>最近行动</small><div class="v5-volume-chart">${done.slice().reverse().map(w=>`<div><i style="height:${Math.max(12,workoutMetrics(w).sets/max*100)}%"></i><span>${esc(w.planId==="recovery"?"恢复":w.title.slice(0,2))}</span></div>`).join("")}</div></article>`;
  return`${header("完成6次，管家给出阶段决定")}<article class="v5-card v5-progress-card v5-await-report"><small>第1阶段 · 正在理解你</small><h2>还差 ${stage.remaining} 次生成综合反馈</h2>${renderSixDots(stage.progress)}<div class="v5-evidence-row"><section><b>${strength.length}</b><span>力量行动</span></section><section><b>${strength.reduce((n,w)=>n+workoutMetrics(w).effective,0)}</b><span>有效工作组</span></section><section><b>${strength.filter(w=>w.status!=="stopped").length}</b><span>安全完成</span></section></div><p class="v5-progress-note">${stage.progress?"现在只积累证据，不急着评价。第6次后会给出教练结论，并自动改变下一阶段剂量。":"完成第一次行动后，才开始形成你的个人基线。"}</p></article>`
}
function serviceRows(){
  const permission=typeof Notification!=="undefined"?Notification.permission:"unsupported",reminder=services.reminder?.enabled&&permission==="granted",aiLast=Object.values(phaseAI).sort((a,b)=>String(b.at).localeCompare(String(a.at)))[0],huawei=services.huawei?.connected,expert=services.expert?.enabled;
  return`<div class="v5-service-list"><button data-reminder><i>铃</i><span><b>离线主动提醒</b><small>${reminder?`${services.reminder.background?"后台尽力提醒":"应用打开时提醒"} · ${services.reminder.time||"18:30"}`:permission==="denied"?"系统权限已关闭":"点击一次设置训练时段"}</small></span><em>${reminder?(services.reminder.background?"后台":"前台"):"设置"}</em></button><button data-huawei><i>表</i><span><b>华为运动健康</b><small>${huawei?`已同步 · ${services.huawei.lastSync||"刚刚"}`:"接入层已准备 · 等待开发者授权"}</small></span><em>${huawei?"已连接":"检测"}</em></button><button data-ai-review><i>AI</i><span><b>服务端持续分析</b><small>${aiLast?`最近复核 ${new Date(aiLast.at).toLocaleDateString("zh-CN")}`:"6次记录后自动请求复核"}</small></span><em>${aiLast?"在线":"检测"}</em></button><button data-expert><i>人</i><span><b>真人专家</b><small>${expert?"教练24小时 · 医疗红旗不等待SLA":"响应流程已建 · 尚未配置服务席位"}</small></span><em>${expert?"已开通":"边界"}</em></button></div>`;
}
function renderProfile(){const risks=[profile.risks?.eye&&"眼部保护",profile.risks?.heart&&"心血管信号",profile.risks?.joint&&"关节/腰背",profile.risks?.doctor&&"医生运动限制"].filter(Boolean);return`${header("只保留会改变训练决定的信息")}<article class="v5-card v5-profile"><div class="v5-person"><i>澄</i><section><span>90天唯一目标</span><h2>${esc(profile.goal||"尚未设置")}</h2><b>${esc(profile.name||"未设置称呼")}</b></section></div><div class="v5-boundaries"><span>安全边界</span>${risks.length?risks.map(x=>`<b>${x}</b>`).join(""):'<b>暂未记录特殊限制</b>'}</div><button class="v5-secondary" data-edit>更新档案</button></article><article class="v5-card v5-services"><small>管家服务</small><h2>数据进来，行动必须改变</h2>${serviceRows()}<p class="v5-honest">每项都显示真实运行状态；没有授权、服务端密钥或真人席位时，不伪装成已上线。</p></article>`}

function renderToday(){const active=activeWorkout(),done=todaysWorkout(),plan=planForDate();if(active)return renderCockpit(active);if(done)return renderReceipt(done);if(riskLocked())return renderSafetyStop("先取得专业运动许可");if(plan===plans.recovery)return renderRecovery();if(!todaysReadiness())return renderReadiness(plan);if(todaysReadiness()?.symptom)return renderSafetyStop("今天先停止训练并确认异常");return renderPreview(plan)}
function render(){clearInterval(restTicker);restTicker=null;app.innerHTML=`<main class="v5-shell">${view==="today"?renderToday():view==="progress"?renderProgress():renderProfile()}</main>${nav()}`;bind();startRestTicker();scheduleForegroundReminder()}

function setReadiness(level,symptom=false){readiness.unshift({date:today(),at:new Date().toISOString(),level,symptom});readiness=readiness.filter((x,i,a)=>a.findIndex(y=>y.date===x.date)===i).slice(0,90);save(K.readiness,readiness);render()}
function startWorkout(short=false){const plan=planForDate(),mode=todayMode(),targetSets=short||mode.factor<1?1:2,w={id:`w-${Date.now()}`,date:today(),startedAt:new Date().toISOString(),status:"active",planId:Object.keys(plans).find(k=>plans[k]===plan),title:plan.title,readiness:todaysReadiness()?.level||"normal",currentExercise:0,sets:[],exercises:(short?plan.exercises.slice(0,2):plan.exercises).map(e=>({...e,targetSets})),draftWeight:null,draftReps:null,restUntil:0};workouts.unshift(w);persist();render();toast(short?"已切换20分钟保底版":"管家会记住上次，带完这次")}
function persist(){save(K.workouts,workouts.slice(0,180))}
function adjustDraft(field,delta){const w=activeWorkout(),e=currentExercise(w),target=suggest(e.id,w.id);if(field==="weight")w.draftWeight=Math.max(0,roundLoad((w.draftWeight??target.weight??0)+delta));else w.draftReps=Math.max(1,Math.min(30,(w.draftReps??target.reps)+delta));persist();render()}
function queuePhaseReview(){const state=phaseState();if(state.report&&state.pending.length===0&&!phaseAI[state.report.key]?.result)setTimeout(()=>requestPhaseAI(false),700)}
function recordSet(quality,pain=false){const w=activeWorkout(),e=currentExercise(w),weight=+q("#v5Weight")?.value,reps=+q("#v5Reps")?.value;if(!pain&&(!weight||!reps))return toast("第一次请留下重量和次数，以后会自动沿用");const same=w.sets.filter(s=>s.exerciseIndex===w.currentExercise).length;w.sets.push({exerciseId:e.id,name:e.name,exerciseIndex:w.currentExercise,set:same+1,weight:weight||0,reps:reps||0,quality,pain,at:new Date().toISOString()});w.draftWeight=null;w.draftReps=null;if(pain){w.status="stopped";w.completedAt=new Date().toISOString();w.restUntil=0;persist();render();toast("训练已停止，安全边界已锁定");queuePhaseReview();return}if(same+1>=e.targetSets){if(w.currentExercise>=w.exercises.length-1){w.status="done";w.completedAt=new Date().toISOString();w.restUntil=0}else{w.currentExercise++;w.restUntil=Date.now()+90e3}}else w.restUntil=Date.now()+90e3;persist();render();if(w.status==="done")queuePhaseReview()}
function swapExercise(){const w=activeWorkout(),e=currentExercise(w);if(w.sets.some(s=>s.exerciseIndex===w.currentExercise))return toast("本动作已经开始，先完成或报告不适");e.name=e.alt;e.alt="原计划动作";e.id=`${e.id}-alt`;persist();render();toast("已换成同肌群替代动作")}
function completeRecovery(){const p=plans.recovery;workouts.unshift({id:`w-${Date.now()}`,date:today(),startedAt:new Date().toISOString(),completedAt:new Date().toISOString(),status:"done",planId:"recovery",title:p.title,exercises:[],sets:[{exerciseId:"walk",name:"轻松快走",duration:30,quality:"right",at:new Date().toISOString()}]});persist();render();toast("恢复已计入身体进步");queuePhaseReview()}
function finishEarly(){const w=activeWorkout();w.completedAt=new Date().toISOString();w.restUntil=0;if(w.sets.length){w.status="done";w.endedEarly=true;toast("已保留完成量，不需要补课")}else{w.status="cancelled";toast("未产生训练记录，计划仍可重新开始")}persist();render();if(w.status==="done")queuePhaseReview()}
function startRestTicker(){const w=activeWorkout();if(!w?.restUntil)return;restTicker=setInterval(()=>{const left=Math.max(0,Math.ceil((w.restUntil-Date.now())/1000)),el=q("[data-rest]");if(el)el.textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}`;if(!left){clearInterval(restTicker);restTicker=null;w.restUntil=0;persist();q(".v5-rest")?.remove();toast("休息完成，开始下一组")}},1000)}
function voiceFill(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return toast("当前浏览器不支持语音识别，可直接点加减号");const r=new SR();r.lang="zh-CN";r.interimResults=false;r.onresult=e=>{const text=e.results[0][0].transcript,nums=text.match(/\d+(?:\.\d+)?/g)||[];if(nums[0])q("#v5Weight").value=nums[0];if(nums[1])q("#v5Reps").value=nums[1];toast(nums.length>=2?"已填入重量和次数":"只听到一个数字，请检查")};r.onerror=()=>toast("没有听清，可以再说一次");r.start();toast("请说：40公斤，10次")}
function modal(title,body){q(".v5-modal")?.remove();const el=document.createElement("div");el.className="v5-modal";el.innerHTML=`<section class="v5-sheet v5-info-sheet"><button type="button" class="v5-close">×</button><small>管家服务</small><h2>${esc(title)}</h2>${body}</section>`;document.body.appendChild(el);el.querySelector(".v5-close").onclick=()=>el.remove();el.addEventListener("click",e=>{if(e.target===el)el.remove()});return el}
async function registerStewardWorker(){
  if(!("serviceWorker" in navigator))return null;
  try{return await navigator.serviceWorker.register("./sw.js",{scope:"./"})}catch{return null}
}
function nextReminderAt(time="18:30"){
  const [h,m]=time.split(":").map(Number),now=new Date();
  for(let i=0;i<8;i++){const d=new Date(now);d.setDate(d.getDate()+i);d.setHours(h,m,0,0);if([1,2,4,5].includes(d.getDay())&&d>now&&!(i===0&&todaysWorkout()))return d}
  return null;
}
function scheduleForegroundReminder(){
  clearTimeout(reminderTicker);reminderTicker=null;if(!services.reminder?.enabled||typeof Notification==="undefined"||Notification.permission!=="granted")return;
  const due=nextReminderAt(services.reminder.time),delay=due?due-Date.now():0;if(!due||delay>2147483647)return;
  reminderTicker=setTimeout(async()=>{const reg=await navigator.serviceWorker.ready,plan=planForDate(due);await reg.showNotification("奢华健身管家",{body:`今天只做一件事：${plan.title}。我已把上次重量和本次剂量准备好。`,icon:"./app-icon-512.png",badge:"./app-icon-512.png",tag:`steward-${day(due)}`,data:{url:"./"}});scheduleForegroundReminder()},delay);
}
async function setReminder(time){
  if(typeof Notification==="undefined")return toast("当前浏览器不支持系统提醒");
  const permission=await Notification.requestPermission();if(permission!=="granted")return toast("没有通知权限，管家不会打扰你");
  const registered=await registerStewardWorker(),reg=registered?await navigator.serviceWorker.ready:null;let background=false;
  try{if(reg?.periodicSync){await reg.periodicSync.register("steward-training-reminder",{minInterval:864e5});background=true}}catch{}
  services.reminder={enabled:true,time,background,updatedAt:new Date().toISOString()};save(K.services,services);reg?.active?.postMessage({type:"SET_REMINDER",settings:{enabled:true,time,days:[1,2,4,5]}});scheduleForegroundReminder();q(".v5-modal")?.remove();render();toast(background?"后台提醒已开启":"提醒已开启；此浏览器需打开应用才能准时触发")
}
function reminderSetup(){
  const current=services.reminder?.time||"18:30",el=modal("训练前多久提醒你",`<p>只在计划训练日提醒一次。选择一次，以后不要求每天填写。</p><div class="v5-time-options">${["07:30","12:30","18:30"].map(x=>`<button data-time="${x}" class="${x===current?"active":""}">${x}<small>${x==="07:30"?"晨练":x==="12:30"?"午间":"下班后"}</small></button>`).join("")}</div><p class="v5-service-note">安装到桌面且浏览器支持后台周期任务时，可在应用关闭后尽力提醒；其余浏览器在应用打开时准时提醒。</p>`);el.querySelectorAll("[data-time]").forEach(b=>b.onclick=()=>setReminder(b.dataset.time));
}
function aiPayload(report){
  const history=report.records.map(w=>({logDate:w.date,sessionType:w.title,status:w.status,readiness:w.readiness||null,endedEarly:!!w.endedEarly,sets:(w.sets||[]).map(s=>({exercise:s.name||s.exerciseId,weight:s.weight||0,reps:s.reps||0,quality:s.quality,pain:!!s.pain}))}));
  return{mode:"phase",today:history.at(-1)||{},history,phase:{index:report.index,strength:report.strength,recovery:report.recovery,effective:report.effective,total_sets:report.sets,decision:report.decision},profile:{goal:profile.goal,constraints:Object.entries(profile.risks||{}).filter(([,v])=>v).map(([k])=>k).join(",")}};
}
async function requestPhaseAI(manual=false){
  const report=phaseState().report;if(!report)return toast(`还差${phaseState().remaining}次才有足够证据做综合复核`);if(remoteBusy)return;
  if(!manual&&phaseAI[report.key]?.result)return;if(!manual&&services.ai?.state==="unavailable"&&Date.now()-new Date(services.ai.checkedAt||0).getTime()<216e5)return;remoteBusy=true;services.ai={state:"checking",checkedAt:new Date().toISOString()};save(K.services,services);
  try{
    if(typeof SUPABASE_URL==="undefined"||typeof SUPABASE_KEY==="undefined")throw Error("服务端地址未配置");
    const response=await fetch(`${SUPABASE_URL}/functions/v1/coach-feedback`,{method:"POST",headers:{"Content-Type":"application/json","apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`},body:JSON.stringify(aiPayload(report))}),result=await response.json();if(!response.ok||result.error)throw Error(result.error||"服务端未响应");
    const normalized={verdict:result.phase_verdict||result.headline||report.decision.title,summary:result.phase_summary||result.training_analysis||result.achievement||report.decision.reason,focus:result.next_focus||result.priority||report.decision.action,confidence:result.confidence||"medium"};phaseAI[report.key]={at:new Date().toISOString(),result:normalized};services.ai={state:"connected",checkedAt:new Date().toISOString()};save(K.phaseAI,phaseAI);save(K.services,services);if(view==="progress")render();if(manual)toast("AI服务端已完成第二重复核");
  }catch(error){services.ai={state:"unavailable",checkedAt:new Date().toISOString(),message:String(error.message||error)};save(K.services,services);if(manual)toast(`服务端尚未接通：${error.message||"请稍后重试"}`)}finally{remoteBusy=false}
}
async function checkHuawei(){
  const el=modal("华为运动健康同步",`<div class="v5-integration-path"><b>华为授权</b><i>→</i><b>睡眠·心率·步数</b><i>→</i><b>改变训练剂量</b></div><p>系统已完成数据适配与授权回调接口设计。真正读取数据必须先在华为开发者平台通过 Health Service Kit 申请，并配置 App ID、密钥和回调地址。</p><button class="v5-primary" data-huawei-check>检测服务端配置</button><p class="v5-service-note">未得到你的授权前不会读取；密钥只允许保存在服务端，不能写进网页。</p>`),btn=el.querySelector("[data-huawei-check]");
  btn.onclick=async()=>{btn.disabled=true;btn.textContent="正在检测…";try{const r=await fetch(`${SUPABASE_URL}/functions/v1/huawei-health?action=status`,{headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`}}),data=await r.json();if(!r.ok||!data.configured)throw Error(data.error||"开发者凭证尚未配置");if(data.authorize_url){location.href=data.authorize_url;return}throw Error("授权地址尚未生成")}catch(error){btn.textContent="尚未接通";toast(error.message||"华为服务尚未配置")}}
}
function expertService(){
  modal("真人专家与响应SLA",`<div class="v5-sla"><section><b>紧急红旗</b><span>不等待在线响应</span><small>胸痛、晕厥、明显呼吸困难或突发视力变化：停止运动并及时线下就医。</small></section><section><b>安全复核</b><span>目标4小时</span><small>眼科/术后边界、反复疼痛或异常训练反应，由有资质专家处理。</small></section><section><b>训练调整</b><span>目标24小时</span><small>动作、负荷与阶段计划，由签约教练复核。</small></section></div><p class="v5-service-note">工单、计时、升级与留痕接口已经纳入后端方案；在专家名单、排班与联系方式配置前，系统不会生成无人接收的假工单。</p>`)
}
function parseLegacyExercise(text="",quality="right"){
  return String(text).split(/\n+/).flatMap((line,lineIndex)=>{const name=line.split(/[｜|]/)[0]?.trim(),weight=Number(line.match(/(?:重量|weight)[:：]\s*([\d.]+)/i)?.[1]||0),count=Math.min(10,Number(line.match(/(?:组数|sets?)[:：]\s*(\d+)/i)?.[1]||1)),reps=Number(line.match(/(?:次数|reps?)[:：]\s*(\d+)/i)?.[1]||0);if(!name||/^动作/.test(name))return[];return Array.from({length:count},(_,i)=>({exerciseId:`archive-${name}`,name,exerciseIndex:lineIndex,set:i+1,weight,reps,quality,pain:false,source:"archive"}))})
}
function mapLegacyRows(rows=[]){
  const mapType=s=>/恢复|休息|快走|耐力/.test(s||"")?"recovery":/下肢 A/.test(s||"")?"lowerA":/下肢 B/.test(s||"")?"lowerB":/上肢 B/.test(s||"")?"upperB":"upperA";
  return rows.map((row,i)=>{const p=row?.payload||row||{},date=p.logDate||p.date;if(!date)return null;const red=/胸痛|胸闷|晕厥|头晕|视力变化|眼痛|异常心悸/.test(`${p.preSymptoms||""} ${p.postSymptoms||""} ${p.symptoms||""}`),quality=Number(p.rpe)>=9?"hard":Number(p.rpe)&&Number(p.rpe)<=6?"easy":"right",sets=parseLegacyExercise(p.exercises,quality),hasTraining=Boolean(sets.length||Number(p.duration)>0),planId=hasTraining?mapType(p.sessionType):"observation";if(red&&!sets.length)sets.push({exerciseId:"archive-safety",name:"身体异常记录",weight:0,reps:0,quality:"hard",pain:true,source:"archive"});if(red)sets.forEach(s=>s.pain=true);return{id:`archive-${row.id||date}-${i}`,date,startedAt:p.createdAt||`${date}T12:00:00`,completedAt:p.updatedAt||`${date}T12:00:00`,status:red?"stopped":"done",planId,title:p.sessionType||(hasTraining?"训练记录":"身体记录"),readiness:(Number(p.energy)&&Number(p.energy)<=2)||(Number(p.sleepHours)&&Number(p.sleepHours)<6)?"low":"normal",sets,exercises:[],health:{sleepHours:Number(p.sleepHours)||null,sleepScore:Number(p.sleepScore)||null,restingHr:Number(p.restingHr)||null,steps:Number(p.steps)||null},source:"archive"}}).filter(Boolean)
}
async function hydrateLegacyWorkouts(){
  try{const rows=typeof ensureRows==="function"?await ensureRows():typeof allRows!=="undefined"?allRows:[];legacyWorkouts=mapLegacyRows(rows);render();const report=phaseState().report;if(report&&!phaseAI[report.key]?.result)setTimeout(()=>requestPhaseAI(false),900)}catch{}
}
function onboarding(){q(".v5-modal")?.remove();const modal=document.createElement("div");modal.className="v5-modal";modal.innerHTML=`<form class="v5-sheet"><button type="button" class="v5-close">×</button><small>一次建档，以后不重复填写</small><h2>管家只需要知道这些</h2><label>怎样称呼你<input id="v5Name" value="${esc(profile.name||"")}" required placeholder="你的称呼"></label><label>90天唯一目标<select id="v5Goal"><option ${/睡|肌/.test(profile.goal||"")?"selected":""}>改善睡眠并增加肌肉</option><option ${/减脂|塑形/.test(profile.goal||"")?"selected":""}>减脂并改善体型</option><option ${/体能|精力/.test(profile.goal||"")?"selected":""}>提升体能与日常精力</option></select></label><fieldset><legend>会改变训练的安全边界</legend><label><input type="checkbox" data-risk="doctor" ${profile.risks?.doctor?"checked":""}>医生限制运动或近期手术</label><label><input type="checkbox" data-risk="heart" ${profile.risks?.heart?"checked":""}>运动时胸痛、晕厥或异常气短</label><label><input type="checkbox" data-risk="eye" ${profile.risks?.eye?"checked":""}>眼部手术、视网膜或视力限制</label><label><input type="checkbox" data-risk="joint" ${profile.risks?.joint?"checked":""}>明显关节、腰背或盆底不适</label></fieldset><label class="v5-consent"><input id="v5Consent" type="checkbox">同意在本机保存必要训练与健康信息</label><button class="v5-primary" type="submit">保存并进入今天</button></form>`;document.body.appendChild(modal);q(".v5-close").onclick=()=>profile.goal?modal.remove():toast("完成一次建档后才能生成安全训练");modal.onsubmit=e=>{e.preventDefault();if(!q("#v5Consent").checked)return toast("需要同意后才能建立本机档案");const risks={};qa("[data-risk]").forEach(x=>risks[x.dataset.risk]=x.checked);profile={...profile,name:q("#v5Name").value.trim(),goal:q("#v5Goal").value,risks,startedAt:profile.startedAt||new Date().toISOString()};save(K.profile,profile);modal.remove();view="today";render();toast("建档完成，以后直接告诉你下一步")}}
function toast(text){q(".v5-toast")?.remove();const el=document.createElement("div");el.className="v5-toast";el.textContent=text;document.body.appendChild(el);setTimeout(()=>el.remove(),2600)}
function bind(){qa("[data-view]").forEach(b=>b.onclick=()=>{view=b.dataset.view;render();scrollTo(0,0)});qa("[data-ready]").forEach(b=>b.onclick=()=>setReadiness(b.dataset.ready));q("[data-symptom]")?.addEventListener("click",()=>setReadiness("low",true));qa("[data-start]").forEach(b=>b.onclick=()=>startWorkout(b.dataset.start==="short"));qa("[data-weight]").forEach(b=>b.onclick=()=>adjustDraft("weight",+b.dataset.weight));qa("[data-reps]").forEach(b=>b.onclick=()=>adjustDraft("reps",+b.dataset.reps));qa("[data-quality]").forEach(b=>b.onclick=()=>recordSet(b.dataset.quality));q("[data-pain]")?.addEventListener("click",()=>recordSet("hard",true));q("[data-swap]")?.addEventListener("click",swapExercise);q("[data-finish-early]")?.addEventListener("click",finishEarly);q("[data-voice]")?.addEventListener("click",voiceFill);q("[data-skip-rest]")?.addEventListener("click",()=>{const w=activeWorkout();w.restUntil=0;persist();render()});q("[data-recovery]")?.addEventListener("click",completeRecovery);q("[data-edit]")?.addEventListener("click",onboarding);q("[data-reminder]")?.addEventListener("click",reminderSetup);q("[data-huawei]")?.addEventListener("click",checkHuawei);qa("[data-ai-review]").forEach(b=>b.onclick=()=>requestPhaseAI(true));q("[data-expert]")?.addEventListener("click",expertService)}

render();
if(!profile.goal)setTimeout(onboarding,250);
registerStewardWorker().then(async reg=>{if(reg&&services.reminder?.enabled)(await navigator.serviceWorker.ready).active?.postMessage({type:"SET_REMINDER",settings:{enabled:true,time:services.reminder.time||"18:30",days:[1,2,4,5]}})});
setTimeout(hydrateLegacyWorkouts,450);
})();
