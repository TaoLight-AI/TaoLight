(function(){
"use strict";

const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const account=((typeof key!=="undefined"?key:"").slice(0,10)||"guest");
const K={profile:`steward-profile-${account}`,workouts:`steward-v5-workouts-${account}`,readiness:`steward-v5-readiness-${account}`};
let profile=load(K.profile,{}),workouts=load(K.workouts,[]),readiness=load(K.readiness,[]),view="today",restTicker=null;
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
function completed(){return workouts.filter(x=>["done","stopped"].includes(x.status))}
function previousSet(exerciseId,excludeId){for(const w of completed()){if(w.id===excludeId)continue;const found=[...(w.sets||[])].reverse().find(s=>s.exerciseId===exerciseId&&!s.pain);if(found)return found}return null}
function suggest(exerciseId,excludeId){const last=previousSet(exerciseId,excludeId);if(!last)return{weight:null,reps:10,why:"首次校准：选择能做10次、仍有约3次余力的轻重量"};if(last.quality==="easy"&&last.reps>=10)return{weight:roundLoad(last.weight*1.05)||last.weight,reps:8,why:"上次余力较多，小幅进阶后从8次开始"};if(last.quality==="hard")return{weight:roundLoad(last.weight*.9),reps:Math.max(6,last.reps-1),why:"上次偏吃力，本次自动减量约10%"};return{weight:last.weight,reps:Math.min(12,last.reps+1),why:"沿用上次重量，只多争取1次"}}
function todayMode(){const r=todaysReadiness();if(r?.level==="low")return{label:"精简剂量",factor:.7,note:"今天每个动作只做1组，不补课、不力竭"};return{label:"正常剂量",factor:1,note:"每组保留2—3次余力，完成比练狠重要"}}
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
  return`${header(`训练进行中 · ${done}/${total}组`)}<div class="v5-progress"><i style="width:${pct}%"></i></div><article class="v5-card v5-cockpit"><div class="v5-cockpit-top"><div><small>动作 ${w.currentExercise+1}/${w.exercises.length} · 第${within+1}/${e.targetSets}组</small><h2>${esc(e.name)}</h2><span>${esc(e.muscle)}</span></div><div class="v5-movement"><b>${String(w.currentExercise+1).padStart(2,"0")}</b><i></i></div></div><div class="v5-prescription"><span>这一组</span><div class="v5-target"><section><small>重量 kg</small><div><button data-weight="-2.5">−</button><input id="v5Weight" type="number" min="0" step="2.5" value="${weight??""}" placeholder="首次填写"><button data-weight="2.5">＋</button></div></section><section><small>次数</small><div><button data-reps="-1">−</button><input id="v5Reps" type="number" min="1" max="30" value="${reps}"><button data-reps="1">＋</button></div></section></div><p>${last?last.quality==="hard"?"上一组偏吃力，重量已降低约10%":"沿用上一组，只根据余力微调":"管家建议："+target.why}</p></div>${rest?`<div class="v5-rest"><span>休息</span><b data-rest>${Math.floor(rest/60)}:${String(rest%60).padStart(2,"0")}</b><button data-skip-rest>跳过</button></div>`:""}<div class="v5-set-actions"><button data-quality="right" class="v5-primary"><b>正好 · 完成本组</b><span>还可再做2—3次</span></button><button data-quality="easy"><b>偏轻</b><span>余力很多</span></button><button data-quality="hard"><b>偏重</b><span>勉强完成</span></button></div><div class="v5-exceptions"><button data-swap>器械被占</button><button data-voice>语音填重量次数</button><button data-pain>疼痛或异常</button></div>${safetyStrip()}</article>`
}
function workoutMetrics(w){const sets=w.sets||[],weighted=sets.filter(s=>s.weight>0),volume=Math.round(weighted.reduce((n,s)=>n+s.weight*s.reps,0)),effective=sets.filter(s=>!s.pain&&s.quality!=="hard").length,previous=completed().find(x=>x.id!==w.id&&x.planId===w.planId),previousVolume=previous?Math.round((previous.sets||[]).reduce((n,s)=>n+(s.weight||0)*(s.reps||0),0)):0;return{sets:sets.length,effective,volume,previousVolume,change:previousVolume?Math.round((volume-previousVolume)/previousVolume*100):null}}
function renderReceipt(w){
  const m=workoutMetrics(w),stopped=w.status==="stopped",next=nextStrengthPlan(),items=w.exercises.filter(e=>w.sets.some(s=>s.exerciseId===e.id)).map(e=>{const sets=w.sets.filter(s=>s.exerciseId===e.id),last=sets.at(-1);return`<li><i>${last?.pain?"!":"✓"}</i><span><b>${esc(e.name)}</b><small>${sets.length}组 · ${last?.weight||"自重"}${last?.weight?"kg":""} · ${last?.reps||0}次</small></span></li>`}).join("");
  return`${header(stopped?"身体发出信号，管家已经接手":"今天的努力已经变成下一次依据")}<article class="v5-card v5-receipt ${stopped?"stopped":""}"><small>今日身体成绩单</small><div class="v5-receipt-hero"><div>${stopped?"!":"✓"}</div><section><span>${w.planId==="recovery"?"恢复完成":stopped?"安全停止":"训练完成"}</span><h2>${esc(w.title)}</h2><b>${w.planId==="recovery"?"30分钟":`${m.sets}组 · ${m.effective}组处于有效余力`}</b></section></div>${w.planId==="recovery"?`<div class="v5-proof"><section><span>今天解决了什么</span><b>没有用疲劳换“自律感”</b><small>恢复被正式计入计划，为下一次力量训练保留状态。</small></section></div>`:`<div class="v5-proof"><section><span>完成得如何</span><b>${stopped?"异常已被拦截":m.effective===m.sets?"全部处于目标余力":`${m.effective}/${m.sets}组剂量合适`}</b><small>${stopped?"不继续加量，不把疼痛当成进步。":m.change==null?"本次已建立个人基线，下次开始可以比较。":`同计划训练容量较上次${m.change>=0?"增加":"减少"}${Math.abs(m.change)}%。`}</small></section><section><span>今天留下的证据</span><b>${m.volume?m.volume.toLocaleString()+" kg·次":"已记录动作质量"}</b><small>不追逐虚拟分数，只保留能改变下一次处方的数据。</small></section></div><ul class="v5-done-list">${items}</ul>`}<div class="v5-verdict"><span>管家下一步</span><b>${stopped?"保持安全降级，先确认异常":`下次从${next.short}开始`}</b><small>${stopped?"需要专业判断的部分不会由AI冒充。":`${next.exercises[0].name}将自动沿用上次记录，并只调整一个变量。`}</small></div><button class="v5-secondary" data-view="progress">查看身体变好的证据</button></article>`
}
function renderProgress(){const done=completed().slice(0,6),strength=done.filter(x=>x.planId!=="recovery"),max=Math.max(1,...done.map(x=>workoutMetrics(x).sets));return`${header("不看打卡天数，只看身体证据")}<article class="v5-card v5-progress-card"><small>最近6次</small><h2>训练正在积累什么</h2><div class="v5-evidence-row"><section><b>${strength.length}</b><span>力量训练</span></section><section><b>${strength.reduce((n,w)=>n+workoutMetrics(w).effective,0)}</b><span>有效工作组</span></section><section><b>${strength.filter(w=>w.status!=="stopped").length}</b><span>安全完成</span></section></div><div class="v5-volume-chart">${done.length?done.slice().reverse().map(w=>`<div><i style="height:${Math.max(12,workoutMetrics(w).sets/max*100)}%"></i><span>${esc(w.planId==="recovery"?"恢复":w.title.slice(0,2))}</span></div>`).join(""):'<p>完成第一次训练后，这里才会出现真实趋势。</p>'}</div><p class="v5-progress-note">${done.length<2?"先建立两次可比较记录。系统不会用一天的数据假装预测90天结果。":"每次只比较同类训练；重量、次数或动作质量中的一个变好，才算进步。"}</p></article>`}
function renderProfile(){const risks=[profile.risks?.eye&&"眼部保护",profile.risks?.heart&&"心血管信号",profile.risks?.joint&&"关节/腰背",profile.risks?.doctor&&"医生运动限制"].filter(Boolean);return`${header("只保留会改变训练决定的信息")}<article class="v5-card v5-profile"><div class="v5-person"><i>澄</i><section><span>90天唯一目标</span><h2>${esc(profile.goal||"尚未设置")}</h2><b>${esc(profile.name||"未设置称呼")}</b></section></div><div class="v5-boundaries"><span>安全边界</span>${risks.length?risks.map(x=>`<b>${x}</b>`).join(""):'<b>暂未记录特殊限制</b>'}</div><button class="v5-secondary" data-edit>更新档案</button><p class="v5-honest">当前版本完成本机训练导航与自动沿用。离线主动提醒、华为手表同步、服务端持续分析、真人专家响应与服务SLA仍属于下一阶段。</p></article>`}

function renderToday(){const active=activeWorkout(),done=todaysWorkout(),plan=planForDate();if(active)return renderCockpit(active);if(done)return renderReceipt(done);if(riskLocked())return renderSafetyStop("先取得专业运动许可");if(plan===plans.recovery)return renderRecovery();if(!todaysReadiness())return renderReadiness(plan);if(todaysReadiness()?.symptom)return renderSafetyStop("今天先停止训练并确认异常");return renderPreview(plan)}
function render(){clearInterval(restTicker);restTicker=null;app.innerHTML=`<main class="v5-shell">${view==="today"?renderToday():view==="progress"?renderProgress():renderProfile()}</main>${nav()}`;bind();startRestTicker()}

function setReadiness(level,symptom=false){readiness.unshift({date:today(),at:new Date().toISOString(),level,symptom});readiness=readiness.filter((x,i,a)=>a.findIndex(y=>y.date===x.date)===i).slice(0,90);save(K.readiness,readiness);render()}
function startWorkout(short=false){const plan=planForDate(),mode=todayMode(),targetSets=short||mode.factor<1?1:2,w={id:`w-${Date.now()}`,date:today(),startedAt:new Date().toISOString(),status:"active",planId:Object.keys(plans).find(k=>plans[k]===plan),title:plan.title,readiness:todaysReadiness()?.level||"normal",currentExercise:0,sets:[],exercises:(short?plan.exercises.slice(0,2):plan.exercises).map(e=>({...e,targetSets})),draftWeight:null,draftReps:null,restUntil:0};workouts.unshift(w);persist();render();toast(short?"已切换20分钟保底版":"管家会记住上次，带完这次")}
function persist(){save(K.workouts,workouts.slice(0,180))}
function adjustDraft(field,delta){const w=activeWorkout(),e=currentExercise(w),target=suggest(e.id,w.id);if(field==="weight")w.draftWeight=Math.max(0,roundLoad((w.draftWeight??target.weight??0)+delta));else w.draftReps=Math.max(1,Math.min(30,(w.draftReps??target.reps)+delta));persist();render()}
function recordSet(quality,pain=false){const w=activeWorkout(),e=currentExercise(w),weight=+q("#v5Weight")?.value,reps=+q("#v5Reps")?.value;if(!pain&&(!weight||!reps))return toast("第一次请留下重量和次数，以后会自动沿用");const same=w.sets.filter(s=>s.exerciseIndex===w.currentExercise).length;w.sets.push({exerciseId:e.id,name:e.name,exerciseIndex:w.currentExercise,set:same+1,weight:weight||0,reps:reps||0,quality,pain,at:new Date().toISOString()});w.draftWeight=null;w.draftReps=null;if(pain){w.status="stopped";w.completedAt=new Date().toISOString();w.restUntil=0;persist();render();toast("训练已停止，安全边界已锁定");return}if(same+1>=e.targetSets){if(w.currentExercise>=w.exercises.length-1){w.status="done";w.completedAt=new Date().toISOString();w.restUntil=0}else{w.currentExercise++;w.restUntil=Date.now()+90e3}}else w.restUntil=Date.now()+90e3;persist();render()}
function swapExercise(){const w=activeWorkout(),e=currentExercise(w);if(w.sets.some(s=>s.exerciseIndex===w.currentExercise))return toast("本动作已经开始，先完成或报告不适");e.name=e.alt;e.alt="原计划动作";e.id=`${e.id}-alt`;persist();render();toast("已换成同肌群替代动作")}
function completeRecovery(){const p=plans.recovery;workouts.unshift({id:`w-${Date.now()}`,date:today(),startedAt:new Date().toISOString(),completedAt:new Date().toISOString(),status:"done",planId:"recovery",title:p.title,exercises:[],sets:[{exerciseId:"walk",name:"轻松快走",duration:30,quality:"right",at:new Date().toISOString()}]});persist();render();toast("恢复已计入身体进步")}
function startRestTicker(){const w=activeWorkout();if(!w?.restUntil)return;restTicker=setInterval(()=>{const left=Math.max(0,Math.ceil((w.restUntil-Date.now())/1000)),el=q("[data-rest]");if(el)el.textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}`;if(!left){clearInterval(restTicker);restTicker=null;w.restUntil=0;persist();q(".v5-rest")?.remove();toast("休息完成，开始下一组")}},1000)}
function voiceFill(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return toast("当前浏览器不支持语音识别，可直接点加减号");const r=new SR();r.lang="zh-CN";r.interimResults=false;r.onresult=e=>{const text=e.results[0][0].transcript,nums=text.match(/\d+(?:\.\d+)?/g)||[];if(nums[0])q("#v5Weight").value=nums[0];if(nums[1])q("#v5Reps").value=nums[1];toast(nums.length>=2?"已填入重量和次数":"只听到一个数字，请检查")};r.onerror=()=>toast("没有听清，可以再说一次");r.start();toast("请说：40公斤，10次")}
function onboarding(){q(".v5-modal")?.remove();const modal=document.createElement("div");modal.className="v5-modal";modal.innerHTML=`<form class="v5-sheet"><button type="button" class="v5-close">×</button><small>一次建档，以后不重复填写</small><h2>管家只需要知道这些</h2><label>怎样称呼你<input id="v5Name" value="${esc(profile.name||"")}" required placeholder="你的称呼"></label><label>90天唯一目标<select id="v5Goal"><option ${/睡|肌/.test(profile.goal||"")?"selected":""}>改善睡眠并增加肌肉</option><option ${/减脂|塑形/.test(profile.goal||"")?"selected":""}>减脂并改善体型</option><option ${/体能|精力/.test(profile.goal||"")?"selected":""}>提升体能与日常精力</option></select></label><fieldset><legend>会改变训练的安全边界</legend><label><input type="checkbox" data-risk="doctor" ${profile.risks?.doctor?"checked":""}>医生限制运动或近期手术</label><label><input type="checkbox" data-risk="heart" ${profile.risks?.heart?"checked":""}>运动时胸痛、晕厥或异常气短</label><label><input type="checkbox" data-risk="eye" ${profile.risks?.eye?"checked":""}>眼部手术、视网膜或视力限制</label><label><input type="checkbox" data-risk="joint" ${profile.risks?.joint?"checked":""}>明显关节、腰背或盆底不适</label></fieldset><label class="v5-consent"><input id="v5Consent" type="checkbox">同意在本机保存必要训练与健康信息</label><button class="v5-primary" type="submit">保存并进入今天</button></form>`;document.body.appendChild(modal);q(".v5-close").onclick=()=>profile.goal?modal.remove():toast("完成一次建档后才能生成安全训练");modal.onsubmit=e=>{e.preventDefault();if(!q("#v5Consent").checked)return toast("需要同意后才能建立本机档案");const risks={};qa("[data-risk]").forEach(x=>risks[x.dataset.risk]=x.checked);profile={...profile,name:q("#v5Name").value.trim(),goal:q("#v5Goal").value,risks,startedAt:profile.startedAt||new Date().toISOString()};save(K.profile,profile);modal.remove();view="today";render();toast("建档完成，以后直接告诉你下一步")}}
function toast(text){q(".v5-toast")?.remove();const el=document.createElement("div");el.className="v5-toast";el.textContent=text;document.body.appendChild(el);setTimeout(()=>el.remove(),2600)}
function bind(){qa("[data-view]").forEach(b=>b.onclick=()=>{view=b.dataset.view;render();scrollTo(0,0)});qa("[data-ready]").forEach(b=>b.onclick=()=>setReadiness(b.dataset.ready));q("[data-symptom]")?.addEventListener("click",()=>setReadiness("low",true));qa("[data-start]").forEach(b=>b.onclick=()=>startWorkout(b.dataset.start==="short"));qa("[data-weight]").forEach(b=>b.onclick=()=>adjustDraft("weight",+b.dataset.weight));qa("[data-reps]").forEach(b=>b.onclick=()=>adjustDraft("reps",+b.dataset.reps));qa("[data-quality]").forEach(b=>b.onclick=()=>recordSet(b.dataset.quality));q("[data-pain]")?.addEventListener("click",()=>recordSet("hard",true));q("[data-swap]")?.addEventListener("click",swapExercise);q("[data-voice]")?.addEventListener("click",voiceFill);q("[data-skip-rest]")?.addEventListener("click",()=>{const w=activeWorkout();w.restUntil=0;persist();render()});q("[data-recovery]")?.addEventListener("click",completeRecovery);q("[data-edit]")?.addEventListener("click",onboarding)}

render();
if(!profile.goal)setTimeout(onboarding,250);
})();
