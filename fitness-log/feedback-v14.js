// V14 mobile-first daily coaching dashboard.
(function(){
  const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
  const present=value=>value!==null&&value!==undefined&&String(value).trim()!=="";
  const latestBefore=p=>[...allRows].filter(row=>row.payload&&row.payload!==p&&row.payload.logDate!==p.logDate).sort((a,b)=>String(b.payload.logDate||"").localeCompare(String(a.payload.logDate||"")))[0]?.payload||null;
  const previousSame=p=>[...allRows].filter(row=>row.payload&&row.payload!==p&&row.payload.logDate!==p.logDate&&row.payload.sessionType===p.sessionType).sort((a,b)=>String(b.payload.logDate||"").localeCompare(String(a.payload.logDate||"")))[0]?.payload||null;
  const trendValues=(field,p)=>[...allRows].map(row=>row.payload||{}).filter(item=>item.logDate&&present(item[field])&&item.logDate<=p.logDate).sort((a,b)=>String(a.logDate).localeCompare(String(b.logDate))).slice(-7).map(item=>number(item[field]));
  const polyline=values=>{if(values.length<2)return"";const min=Math.min(...values),max=Math.max(...values),range=max-min||1;return values.map((v,i)=>`${Math.round(i/(values.length-1)*100)},${Math.round(34-(v-min)/range*28)}`).join(" ")};
  const trend=(label,values,color,value,unit)=>`<div class="v14-trend"><div><small>${esc(label)}</small><b>${esc(String(value))}<em>${esc(unit)}</em></b></div><svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-label="${esc(label)}趋势"><path d="M0 36H100"/><polyline points="${polyline(values)}" style="--line:${color}"/></svg></div>`;
  const delta=(current,previous,unit="")=>{if(!present(current)||!present(previous))return"暂无对比";const d=Math.round((number(current)-number(previous))*10)/10;return d===0?"与上次持平":`${d>0?"+":""}${d}${unit} 较上次`};
  function workoutVolume(p){return parseExerciseLines(p?.exercises||"").reduce((sum,x)=>sum+(x.volume||0),0)}
  function clamp(value,min=0,max=100){return Math.max(min,Math.min(max,value))}
  function validRowsThrough(p){return [...allRows].map(row=>row.payload||{}).filter(item=>item.logDate&&item.logDate<=p.logDate).sort((a,b)=>String(a.logDate).localeCompare(String(b.logDate))).slice(-28)}
  function peakScore(p){
    const sleep=number(p.sleepHours),energy=number(p.energy),soreness=number(p.soreness),stress=number(p.stress),rpe=number(p.rpe),completion=number(p.completion),duration=number(p.duration),eye=String(p.eyeStatus||"正常");
    const sleepScore=!sleep?55:clamp(100-Math.abs(7.75-sleep)*22);
    const recoveryParts=[energy?energy*20:null,present(p.soreness)?100-soreness*16:null,present(p.stress)?100-stress*16:null].filter(v=>v!==null);
    const recoveryScore=recoveryParts.length?recoveryParts.reduce((a,b)=>a+b,0)/recoveryParts.length:55;
    const isRest=/恢复|休息|快走/.test(p.sessionType||"");
    const stimulusScore=isRest?clamp((duration||25)*2.4):duration?clamp((completion||65)*.65+(rpe?100-Math.abs(7-rpe)*18:60)*.35):35;
    const recent=validRowsThrough(p).slice(-7),strengthDays=recent.filter(item=>number(item.duration)>0&&!/恢复|休息|快走/.test(item.sessionType||"")).length;
    const consistencyScore=clamp(strengthDays/4*100);
    const safetyScore=eye.includes("变化")||eye.includes("眼痛")?10:rpe>=9?45:100;
    const score=Math.round(sleepScore*.25+recoveryScore*.2+stimulusScore*.25+consistencyScore*.2+safetyScore*.1);
    return{score,sleepScore:Math.round(sleepScore),recoveryScore:Math.round(recoveryScore),stimulusScore:Math.round(stimulusScore),consistencyScore:Math.round(consistencyScore),safetyScore:Math.round(safetyScore),strengthDays};
  }
  function quantifiedModel(p){
    const history=validRowsThrough(p),current=peakScore(p),scores=history.slice(0,-1).map(peakScore).map(x=>x.score),mean=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:0;
    const sd=scores.length>1?Math.sqrt(scores.reduce((sum,value)=>sum+(value-mean)**2,0)/(scores.length-1)):0;
    const personalT=scores.length>=6&&sd>=2?Math.round(clamp(50+10*(current.score-mean)/sd,20,80)):null;
    const completeness=number(p.recordCompleteness),confidence=Math.round(clamp(completeness*.65+Math.min(history.length,14)/14*35));
    const week=history.slice(-7),norm=Math.round(clamp((current.strengthDays/2)*50+Math.min(week.filter(item=>/快走/.test(item.sessionType||"")).reduce((sum,item)=>sum+number(item.duration),0),150)/150*50));
    const factors=[['睡眠',current.sleepScore],['恢复',current.recoveryScore],['刺激',current.stimulusScore],['一致性',current.consistencyScore],['安全',current.safetyScore]].sort((a,b)=>a[1]-b[1]);
    return{...current,personalT,baselineCount:Math.min(history.length,7),confidence,norm,weakest:factors[0],historyCount:history.length};
  }
  function dailyModel(p){
    const prev=previousSame(p),yesterday=latestBefore(p),sleep=number(p.sleepHours),duration=number(p.duration),completion=number(p.completion),rpe=number(p.rpe),soreness=number(p.soreness),stress=number(p.stress),intake=number(p.estimatedCalories),burn=number(p.totalExpenditure),protein=number(p.proteinGrams),volume=workoutVolume(p),prevVolume=workoutVolume(prev),reason=redFlagReason(p);
    let status="状态稳定",tone="good",headline="今天完成得稳，继续保持节奏",focus="训练刺激与恢复目前基本匹配。";
    if(reason){status="优先处理异常";tone="stop";headline="今天先停下来，安全比完成度重要";focus=`记录中的“${reason}”需要先确认；今天不补训、不测试重量。`}
    else if((sleep&&sleep<6.5)||soreness>=4||stress>=4){status="恢复优先";tone="warn";headline="今天的限制不在意志，而在恢复";focus=`${sleep&&sleep<6.5?`睡眠 ${sleep} 小时`:soreness>=4?`酸痛 ${soreness}/5`:`压力 ${stress}/5`} 是最需要处理的信号。`}
    else if(duration&&completion>=85&&rpe>0&&rpe<=8){status="有效完成";headline="刺激够了，今天不用再加码";focus=`${duration} 分钟、完成度 ${completion}%、RPE ${rpe}，属于可持续的有效训练。`}
    else if(duration){status="建立基线";headline="今天先把动作质量留下来";focus=`已完成 ${duration} 分钟训练；当前更适合巩固动作和呼吸，而不是追回数字。`}
    else {status="恢复记录";tone="neutral";headline="今天不补课，把恢复接住";focus="没有有效训练时长，这一天按恢复日处理。"}
    let win="你完成了真实记录，这让下一次调整有依据。";
    if(volume&&prevVolume)win=`本次训练容量约 ${Math.round(volume)}，${delta(volume,prevVolume)}。`;
    else if(duration&&prev?.duration)win=`训练时长 ${duration} 分钟，${delta(duration,prev.duration,"分钟")}。`;
    else if(sleep&&yesterday?.sleepHours)win=`睡眠 ${sleep} 小时，${delta(sleep,yesterday.sleepHours,"小时")}。`;
    let next="下一次按原计划推进，动作全程呼气发力，复合动作保留 RIR 3。";
    if(reason)next="暂停训练并先确认异常；原因未明确前不生成加量处方。";
    else if(tone==="warn")next="下一次总组数减少约25%，不增加重量，RIR 3–4；若状态仍差就改为20–30分钟轻松快走。";
    else if(duration&&completion>=85&&rpe<=8)next="下次同动作只选择一种进阶：每组加1次，或增加最小重量；不要同时加组、加重、加次数。";
    else if(!duration)next="明天不叠加两堂训练；睡眠和身体状态正常时回到原日程即可。";
    let nutrition="饮食数据不足，暂不根据热量差调整计划。";
    if(intake&&burn){const balance=Math.round(intake-burn);nutrition=`摄入约 ${Math.round(intake)} kcal，消耗约 ${Math.round(burn)} kcal，差值 ${balance>0?"+":""}${balance} kcal。${Math.abs(balance)>700?"单日差值偏大，先核对餐次和份量。":"先观察7–14天趋势，不追逐单日数字。"}`}
    if(protein)nutrition+=` 蛋白质约 ${Math.round(protein)} g。`;
    return{prev,sleep,duration,completion,rpe,soreness,stress,intake,burn,protein,volume,status,tone,headline,focus,win,next,nutrition};
  }
  feedbackFor=function(p){if(!p)return`${userName}，今天还没有完整记录。先记睡眠、训练或饮食中的一项，我就从真实数据开始分析。`;const m=dailyModel(p);return`${m.headline}。${m.focus}\n\n今天的成果：${m.win}\n\n营养与恢复：${m.nutrition}\n\n明日行动：${m.next}`};
  renderDailyFeedback=function(p){
    currentFeedback=feedbackFor(p);const root=$("#dailyFeedback");if(!root)return;
    if(!p){root.className="voice-card v14-feedback empty-state";root.innerHTML='<div class="voice-orb">♪</div><div><b>等待第一条记录</b><p>记录睡眠、训练或饮食后，这里会生成当天仪表盘。</p></div>';return}
    const m=dailyModel(p),q=quantifiedModel(p),sleepTrend=trendValues("sleepHours",p),durationTrend=trendValues("duration",p),rpeTrend=trendValues("rpe",p),quality=number(p.recordCompleteness),confidence=quality>=80?"高":quality>=50?"中":"低";
    root.className=`voice-card v14-feedback ${m.tone}`;
    root.innerHTML=`<div class="v14-summary"><div><span class="v14-date">${esc(p.logDate||"")} · ${esc(p.sessionType||"日常记录")}</span><h3>${esc(m.headline)}</h3><p>${esc(m.focus)}</p></div><span class="v14-status">${esc(m.status)}</span></div><div class="v14-scoreboard"><div class="v14-peak"><small>巅峰指数</small><b>${q.score}</b><span>/ 100</span></div><div><small>个人 T 值</small><b>${q.personalT??"—"}</b><span>${q.personalT?`基线50 · ${q.personalT>=55?"高于近期自己":"仍在积累"}`:`建立基线 ${q.baselineCount}/7`}</span></div><div><small>规范达成</small><b>${q.norm}<em>%</em></b><span>按周力量与有氧目标</span></div><div><small>数据可信度</small><b>${q.confidence}<em>%</em></b><span>${q.historyCount} 个有效日</span></div></div><div class="v14-lever"><span>下一步最值得改善</span><b>${esc(q.weakest[0])}</b><i>${q.weakest[1]}分</i></div><div class="v14-kpis"><div><small>睡眠</small><b>${m.sleep||"—"}<em>h</em></b><span>${m.prev?.sleepHours?esc(delta(m.sleep,m.prev.sleepHours,"h")):"恢复基础"}</span></div><div><small>训练</small><b>${m.duration||"—"}<em>min</em></b><span>${m.completion?`${m.completion}% 完成`:"恢复日"}</span></div><div><small>强度</small><b>${m.rpe||"—"}<em>RPE</em></b><span>${m.rpe?m.rpe<=8?"余力合理":"偏高":"未记录"}</span></div><div><small>记录质量</small><b>${quality}<em>%</em></b><span>可信度 ${confidence}</span></div></div><div class="v14-trends">${trend("睡眠",sleepTrend,"#20c8ff",m.sleep||"—","h")}${trend("训练时长",durationTrend,"#ff3f9f",m.duration||"—","min")}${trend("训练强度",rpeTrend,"#ffe600",m.rpe||"—","RPE")}</div><div class="v14-actions"><article class="win"><span>01 今日成果</span><p>${esc(m.win)}</p></article><article class="nutrition"><span>02 营养与恢复</span><p>${esc(m.nutrition)}</p></article><article class="next"><span>03 明日行动</span><p>${esc(m.next)}</p></article></div><details class="v14-evidence"><summary>评分依据与数据边界</summary><p>个人T值以最近28天自身数据为基线，50代表个人均值、每10分约为一个个人标准差，至少7个有效记录后显示。同龄Z值只在存在统一测试方法和可靠年龄、性别人群数据时启用；当前不以估算冒充同龄百分位。巅峰指数综合睡眠25%、恢复20%、训练刺激25%、周一致性20%和安全10%，用于调整训练，不是医学诊断。</p></details>`;
  };
  const v14EnsureRows=ensureRows;ensureRows=async function(force=false){const rows=await v14EnsureRows(force);const latest=[...rows].sort((a,b)=>String(a.payload?.logDate||"").localeCompare(String(b.payload?.logDate||""))).at(-1)?.payload;renderDailyFeedback(latest);return rows};
  setTimeout(()=>ensureRows(),300);
})();