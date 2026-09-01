(function(){
  "use strict";
  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  if(!q("#formView")||q("#commercialHome"))return;
  document.body.classList.add("commercial-mode");

  const commercial=document.createElement("section");
  commercial.id="commercialHome";
  commercial.innerHTML=`
    <section class="status-hero">
      <div class="status-top"><span class="status-label">TODAY · 今日身体决策</span><span id="commercialLevel" class="status-pill yellow">等待15秒评估</span></div>
      <div class="status-score"><strong id="commercialScore">--</strong><span>/ 100</span></div>
      <h2 id="commercialAction">先完成晨间状态，马上得到今天的行动</h2>
      <p id="commercialSummary">不要求填满表格。回答三个问题，我会告诉你今天练不练、练多少，以及为什么。</p>
      <p id="commercialReason" class="status-reason">结论只依据你的账户档案和已保存记录，不与其他人的数据混用。</p>
      <div class="action-row"><button class="primary-action" type="button" data-open-quick="morning">开始15秒评估</button><button class="secondary-action" type="button" id="commercialAbnormal">我有异常</button></div>
      <div id="commercialRisk" class="risk-banner"></div>
    </section>
    <section class="commercial-progress">
      <div id="stepMorning"><b>晨间</b><small>状态与行动</small></div>
      <div id="stepTraining"><b>训练后</b><small>结果与异常</small></div>
      <div id="stepEvening"><b>晚间</b><small>完成与恢复</small></div>
    </section>
    <section class="quick-card" data-quick="morning"><div class="quick-head"><div><span class="micro-label">15-SECOND CHECK</span><h3>今天身体准备好了吗？</h3></div></div><div class="quick-body">
      <div class="choice-group" data-field="sleepBand"><span>昨晚睡了多久？</span><div class="choices"><button class="choice" data-value="5.5" type="button">不足6小时</button><button class="choice" data-value="6.5" type="button">6–7小时</button><button class="choice" data-value="7.5" type="button">7小时以上</button></div></div>
      <div class="choice-group" data-field="energy"><span>现在精力如何？</span><div class="choices"><button class="choice" data-value="2" type="button">较差</button><button class="choice" data-value="3" type="button">一般</button><button class="choice" data-value="4" type="button">不错</button></div></div>
      <div class="choice-group" data-field="condition"><span>有没有影响活动的不适？</span><div class="choices"><button class="choice" data-value="none" type="button">没有</button><button class="choice" data-value="mild" type="button">轻微酸痛</button><button class="choice danger" data-value="red" type="button">明显异常</button></div></div>
      <div class="choice-group" data-field="plan"><span>今天准备训练吗？</span><div class="choices"><button class="choice" data-value="yes" type="button">准备训练</button><button class="choice" data-value="maybe" type="button">还不确定</button><button class="choice" data-value="no" type="button">恢复一天</button></div></div>
      <button id="saveQuickMorning" class="primary-action" type="button">生成今天的行动</button>
    </div></section>
    <section class="quick-card collapsed" data-quick="training"><div class="quick-head"><div><span class="micro-label">AFTER TRAINING</span><h3>训练结束，20秒收尾</h3></div><button class="secondary-action" data-expand="training" type="button">填写</button></div><div class="quick-body">
      <div class="choice-group" data-field="completion"><span>今天完成得怎么样？</span><div class="choices"><button class="choice" data-value="100" type="button">完成</button><button class="choice" data-value="60" type="button">部分完成</button><button class="choice" data-value="0" type="button">没有训练</button></div></div>
      <div class="choice-group" data-field="effort"><span>整体强度？</span><div class="choices"><button class="choice" data-value="5" type="button">轻松</button><button class="choice" data-value="7" type="button">合适</button><button class="choice" data-value="9" type="button">偏累</button></div></div>
      <div class="choice-group" data-field="trainingRisk"><span>训练中有没有异常？</span><div class="choices"><button class="choice" data-value="none" type="button">没有</button><button class="choice" data-value="mild" type="button">一般不适</button><button class="choice danger" data-value="red" type="button">危险信号</button></div></div>
      <input id="quickDuration" class="quick-number" type="number" min="0" max="360" inputmode="numeric" placeholder="训练时长（分钟，可选）">
      <button id="saveQuickTraining" class="primary-action" type="button">保存训练结果</button>
    </div></section>
    <section class="quick-card collapsed" data-quick="evening"><div class="quick-head"><div><span class="micro-label">EVENING CLOSE</span><h3>今天做到哪一步？</h3></div><button class="secondary-action" data-expand="evening" type="button">填写</button></div><div class="quick-body">
      <div class="choice-group" data-field="followed"><span>今天是否执行了建议？</span><div class="choices"><button class="choice" data-value="yes" type="button">执行了</button><button class="choice" data-value="part" type="button">完成一部分</button><button class="choice" data-value="no" type="button">没有</button></div></div>
      <div class="choice-group" data-field="alcohol"><span>今天饮酒了吗？</span><div class="choices"><button class="choice" data-value="否" type="button">没有</button><button class="choice" data-value="是" type="button">饮酒了</button><button class="choice" data-value="skip" type="button">不记录</button></div></div>
      <div class="quick-actions"><button id="quickMeal" class="secondary-action" type="button">拍一餐 · AI估算</button><button id="openProfessional" class="secondary-action" type="button">补充专业数据</button><button id="saveQuickDay" class="primary-action" type="button">保存今天并生成日报</button></div>
    </div></section>`;
  q("#formView").prepend(commercial);

  const professionalToggle=document.createElement("button");
  professionalToggle.className="secondary-action professional-toggle";
  professionalToggle.type="button";
  professionalToggle.textContent="展开专业记录 · 详细动作、饮食与手表数据";
  commercial.insertAdjacentElement("afterend",professionalToggle);

  const service=document.createElement("section");
  service.id="serviceView";
  service.className="service-view hidden";
  service.innerHTML=`<section class="commercial-offer"><div class="offer-head"><div><span class="micro-label">90-DAY RESET</span><h3>90天状态重建计划</h3></div><div class="offer-price"><strong>¥2,999</strong><small>创始内测价</small></div></div><p>面向38–55岁、工作繁忙、想改善睡眠、体型与精力的男性。不是卖一套课程，而是每天帮你做出合适的身体决策。</p><ul class="offer-list"><li>每日AI状态判断与一个明确行动</li><li>每周真人教练复盘与计划调整</li><li>训练、饮食、睡眠和异常趋势周报</li><li>90天体型与状态变化报告</li><li>涉及异常时转人工，不由AI做医疗诊断</li></ul><p class="offer-note">首期计划只开放少量名额；正式收款前需完成服务协议、专业人员配置和退款规则。</p><button id="applyFounding" class="primary-action" type="button">登记创始内测意向</button></section><section class="coach-value"><span class="micro-label">FOR COACHES</span><h3>教练工作台 · 下一阶段</h3><p>AI先筛选需要关注的客户，教练只处理异常、掉队与计划调整，把重复整理变成可规模化服务。</p><div class="coach-metrics"><div><strong>红黄绿</strong><small>客户状态排序</small></div><div><strong>自动</strong><small>周报与复盘</small></div><div><strong>更高</strong><small>人效与续费证据</small></div></div></section>`;
  q("#coachView").insertAdjacentElement("afterend",service);
  const serviceTab=document.createElement("button");serviceTab.dataset.tab="service";serviceTab.textContent="服务";q(".tabs").appendChild(serviceTab);

  const state={};
  function pick(group,value){state[group]=value;const root=q(`[data-field="${group}"]`);root?.querySelectorAll(".choice").forEach(b=>b.classList.toggle("selected",b.dataset.value===value));}
  qa(".choice-group .choice").forEach(btn=>btn.addEventListener("click",()=>pick(btn.closest(".choice-group").dataset.field,btn.dataset.value)));
  function setValue(name,value){const el=q(`[name="${name}"]`);if(!el)return;el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}));}
  function markModule(name){const card=q(`[data-module="${name}"]`);if(card&&typeof saveModule==="function")saveModule(card);}
  function scoreAndAdvice(){let score=82,reasons=[],action="可以按计划训练，但不憋气、不震动、不力竭。",level="可以训练";const sleep=Number(state.sleepBand),energy=Number(state.energy);if(sleep<6){score-=20;reasons.push("睡眠不足6小时")}else if(sleep<7){score-=8;reasons.push("睡眠未到7小时")}if(energy<=2){score-=18;reasons.push("主观精力较差")}else if(energy===3){score-=6;reasons.push("精力一般")}if(state.condition==="mild"){score-=12;reasons.push("身体有轻微酸痛")}if(state.condition==="red"){score=20;level="停止训练";action="今天暂停训练；若有视力变化、眼痛、胸闷、晕厥或异常心悸，请及时就医。"}else if(score<65){level="建议降量";action="今天总训练量减少约25%，保留3–4次余力；也可以改成20–30分钟轻松快走。"}else if(state.plan==="no"){level="恢复日";action="今天不需要补偿性加练，完成轻松步行、正常饮食和按时睡觉。"}score=Math.max(0,Math.min(100,score));return{score,level,action,reason:reasons.length?reasons.join("、")+"，因此给出上述保守建议。":"目前没有发现明显恢复警报，仍需遵守账户中的安全边界。"}}
  function renderDecision(){const x=scoreAndAdvice(),pill=q("#commercialLevel");q("#commercialScore").textContent=x.score;q("#commercialAction").textContent=x.action;q("#commercialSummary").textContent=x.level==="停止训练"?"危险信号优先于计划完成度。AI不会建议你观察着硬练。":"今天只执行这一件最重要的事；详细数据需要时再补。";q("#commercialReason").textContent=x.reason;pill.textContent=x.level;pill.className="status-pill "+(x.level==="停止训练"?"red":x.score<75?"yellow":"");}
  function requireFields(fields,message){if(fields.some(x=>state[x]==null)){typeof note==="function"&&note(message);return false}return true}
  q("#saveQuickMorning").onclick=()=>{if(!requireFields(["sleepBand","energy","condition","plan"],"请完成四个快速选择，才能可靠判断今天状态"))return;setValue("sleepHours",state.sleepBand);setValue("energy",state.energy);setValue("soreness",state.condition==="mild"?3:state.condition==="red"?5:0);if(state.condition==="red"){setValue("eyeStatus","视力变化或眼痛");setValue("preSymptoms","出现明显异常，需要人工确认")}if(state.plan==="no")setValue("sessionType","恢复 / 休息");markModule("morning");markModule("pretrain");renderDecision();q("#stepMorning").classList.add("done");q('[data-quick="morning"]').classList.add("collapsed");q('[data-quick="training"]').classList.remove("collapsed");q("#commercialHome")?.scrollIntoView({behavior:"smooth",block:"start"});};
  q("#saveQuickTraining").onclick=()=>{if(!requireFields(["completion","effort","trainingRisk"],"请先选择完成情况、整体强度和异常状态"))return;setValue("completion",state.completion);setValue("rpe",state.effort);setValue("duration",q("#quickDuration").value||0);setValue("postSymptoms",state.trainingRisk==="red"?"训练中出现危险信号，需要停止并人工确认":state.trainingRisk==="mild"?"训练中有一般不适":"无");markModule("training");q("#stepTraining").classList.add("done");q('[data-quick="training"]').classList.add("collapsed");q('[data-quick="evening"]').classList.remove("collapsed");if(state.trainingRisk==="red"){state.condition="red";renderDecision()}};
  q("#saveQuickDay").onclick=()=>{if(!requireFields(["followed","alcohol"],"请先选择今天的执行情况和饮酒情况"))return;setValue("alcohol",state.alcohol==="skip"?"否":state.alcohol);setValue("notes",`今日建议执行：${state.followed==="yes"?"已执行":state.followed==="part"?"部分完成":"未执行"}`);setValue("symptoms",state.trainingRisk==="red"||state.condition==="red"?"存在异常，需人工确认":"无");markModule("evening");q("#stepEvening").classList.add("done");q("#logForm").requestSubmit();};
  qa("[data-expand]").forEach(btn=>btn.onclick=()=>q(`[data-quick="${btn.dataset.expand}"]`)?.classList.toggle("collapsed"));
  qa("[data-open-quick]").forEach(btn=>btn.onclick=()=>{q(`[data-quick="${btn.dataset.openQuick}"]`)?.classList.remove("collapsed");q(`[data-quick="${btn.dataset.openQuick}"]`)?.scrollIntoView({behavior:"smooth",block:"center"})});
  q("#commercialAbnormal").onclick=()=>{const box=q("#commercialRisk");box.textContent="出现视力变化、眼痛、胸闷、晕厥或异常心悸时，请停止训练并及时就医。一般酸痛可在晨间评估中选择“轻微酸痛”，系统会自动降量。";box.classList.add("show")};
  function toggleAdvanced(open=true,target){document.body.classList.toggle("advanced-open",open);professionalToggle.textContent=open?"收起专业记录 · 返回30秒模式":"展开专业记录 · 详细动作、饮食与手表数据";if(target)setTimeout(()=>q(`[data-module="${target}"]`)?.scrollIntoView({behavior:"smooth",block:"start"}),30)}
  professionalToggle.onclick=()=>toggleAdvanced(!document.body.classList.contains("advanced-open"));
  q("#openProfessional").onclick=()=>toggleAdvanced(true,"training");
  q("#quickMeal").onclick=()=>toggleAdvanced(true,"food");
  serviceTab.onclick=async()=>{qa("[data-tab]").forEach(x=>x.classList.remove("active"));serviceTab.classList.add("active");["formView","historyView","coachView"].forEach(id=>q("#"+id)?.classList.add("hidden"));service.classList.remove("hidden")};
  qa('[data-tab]:not([data-tab="service"])').forEach(tab=>tab.addEventListener("click",()=>service.classList.add("hidden")));
  q("#applyFounding").onclick=()=>{const text="我想申请老登变形记·90天状态重建计划创始内测。请向我说明开始时间、专业教练配置、服务边界、退款规则和隐私政策。";navigator.clipboard?.writeText(text).then(()=>typeof note==="function"&&note("内测申请文字已复制，可发送给项目负责人；正式收款功能将在服务规则配置后开放")).catch(()=>typeof note==="function"&&note(text))};
  const done=typeof completedModules==="function"?completedModules():[];if(done.includes("morning")||done.includes("pretrain"))q("#stepMorning").classList.add("done");if(done.includes("training"))q("#stepTraining").classList.add("done");if(done.includes("evening"))q("#stepEvening").classList.add("done");
})();
