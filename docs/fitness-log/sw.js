const CACHE="steward-v7-20260902-1";
const ASSETS=["./","./index.html","./style.css?v=20260823-3","./steward-v5.css?v=20260902-5","./nutrition-v7.css?v=20260902-1","./steward-v5.js?v=20260902-5","./app-icon-512.png","./manifest.webmanifest"];
let reminder={enabled:false,time:"18:30",days:[1,2,4,5]},lastNotice="";
const STATE_URL=new URL("./__steward_reminder_state__",self.registration.scope).href;

self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match("./index.html"))));
});
self.addEventListener("message",event=>{if(event.data?.type==="SET_REMINDER"){reminder={...reminder,...event.data.settings};event.waitUntil(saveReminderState())}});
self.addEventListener("periodicsync",event=>{if(event.tag==="steward-training-reminder")event.waitUntil(checkReminder())});
self.addEventListener("push",event=>{const data=event.data?.json?.()||{};event.waitUntil(self.registration.showNotification(data.title||"奢华健身管家",{body:data.body||"今天的唯一行动已经准备好。",icon:"./app-icon-512.png",badge:"./app-icon-512.png",tag:data.tag||"steward-push",data:{url:data.url||"./"}}))});
self.addEventListener("notificationclick",event=>{event.notification.close();event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(clients=>{const existing=clients.find(client=>client.url.includes("/fitness-log/"));return existing?existing.focus():self.clients.openWindow(event.notification.data?.url||"./")}))});

async function checkReminder(){
  await loadReminderState();if(!reminder.enabled)return;const now=new Date(),date=now.toLocaleDateString("en-CA"),hour=Number(String(reminder.time).split(":")[0]);if(!reminder.days.includes(now.getDay())||now.getHours()<hour||lastNotice===date)return;lastNotice=date;await saveReminderState();await self.registration.showNotification("奢华健身管家",{body:"今天只做计划里的一件事。我已准备好上次记录和本次剂量。",icon:"./app-icon-512.png",badge:"./app-icon-512.png",tag:`steward-${date}`,data:{url:"./"}})
}
async function saveReminderState(){const cache=await caches.open(CACHE);await cache.put(STATE_URL,new Response(JSON.stringify({reminder,lastNotice}),{headers:{"Content-Type":"application/json"}}))}
async function loadReminderState(){const hit=await caches.match(STATE_URL);if(!hit)return;try{const state=await hit.json();reminder={...reminder,...state.reminder};lastNotice=state.lastNotice||""}catch{}}
