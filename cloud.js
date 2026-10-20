/* Cloud authority with durable pending snapshots and compare-and-swap writes.
   Conflicts stop training; neither side is silently merged or discarded. */
window.Cloud=(()=>{
 const cfg=window.CLOUD_CONFIG, sessionKey='deutsch_cloud_session_v1';
 let session=null,cache=null,busy=false,dirty=false,blocked=false,ready=false,adapter,exported=false,previewed=false;
 const el=id=>document.getElementById(id);
 const status=t=>el('syncStatus').textContent=t;
 const lock=()=>adapter.lock(!ready||blocked);
 const cacheKey=()=>`deutsch_cloud_cache_v1:${session.user.id}`;
 function persist(){localStorage.setItem(cacheKey(),JSON.stringify(cache));}
 async function request(path,body,auth=true){
  if(auth&&session.expires_at*1000<Date.now()+60000){
   const next=await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token},false);
   session={...next,expires_at:Math.floor(Date.now()/1000)+next.expires_in};localStorage.setItem(sessionKey,JSON.stringify(session));
  }
  const res=await fetch(cfg.url+path,{method:body?'POST':'GET',signal:AbortSignal.timeout(15000),headers:{apikey:cfg.publishableKey,...(auth?{Authorization:'Bearer '+session.access_token}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if(!res.ok)throw Error('Supabase HTTP '+res.status);
  return res.json();
 }
 async function pull(){return (await request('/rest/v1/trainer_progress?select=*&user_id=eq.'+encodeURIComponent(session.user.id)))[0]||null;}
 function conflict(){blocked=true;lock();status('Конфлікт версій. Локальний прогрес збережено. Експортуй його перед завантаженням хмарної версії.');el('loadCloud').disabled=false;}
 async function sync(){
  if(!session||!ready||blocked||busy)return;busy=true;
  try{
   if(cache.pending){
    const snapshot=Progress.clone(cache.state),rev=cache.revision;
    const rows=await request('/rest/v1/rpc/save_trainer_progress',{expected_revision:rev,next_state:snapshot});
    if(!rows.length){conflict();return;}
    cache.revision=rows[0].revision;cache.pending=JSON.stringify(cache.state)!==JSON.stringify(snapshot);persist();
    status(cache.pending?'Синхронізація…':'Збережено у хмарі');
   }else if(!adapter.active()){
    const row=await pull();if(row&&row.revision!==cache.revision){cache={revision:row.revision,state:Progress.validate(row.state),pending:false};persist();adapter.apply(cache.state);status('Оновлено з хмари');}
   }
  }catch(e){status('Офлайн / помилка синхронізації: '+e.message+'. Локальні зміни збережено.');}
  finally{busy=false;if(cache?.pending&&!blocked&&dirty){dirty=false;setTimeout(sync,100);}}
 }
 async function connect(){
  ready=false;blocked=false;lock();
  cache=JSON.parse(localStorage.getItem(cacheKey())||'null');
  try{
   const row=await pull();
   if(cache?.pending){Progress.validate(cache.state);adapter.apply(cache.state);ready=true;if((row?.revision??-1)!==cache.revision){conflict();return;}}
   else if(row){cache={revision:row.revision,state:Progress.validate(row.state),pending:false};persist();adapter.apply(cache.state);ready=true;}
   else{status('Хмара порожня. Експортуй Safari-прогрес і підтвердь імпорт або створи новий профіль.');el('importProgress').disabled=false;el('newProfile').disabled=false;return;}
   lock();await sync();status(blocked?el('syncStatus').textContent:cache.pending?'Очікує синхронізації':'Хмарний профіль готовий');
  }catch(e){
   if(cache){adapter.apply(Progress.validate(cache.state));ready=true;lock();status('Офлайн: кеш цього користувача. '+e.message);}
   else status('Не вдалося завантажити хмару: '+e.message);
  }
 }
 function download(value,name){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function initialize(state){
  if(!session||busy)return;busy=true;
  try{
   const checked=Progress.validate(state),rows=await request('/rest/v1/rpc/save_trainer_progress',{expected_revision:-1,next_state:checked});
   if(!rows.length)throw Error('Хмарний профіль уже існує. Імпорт його не перезапише.');
   cache={revision:rows[0].revision,state:checked,pending:false};persist();adapter.apply(checked);ready=true;blocked=false;lock();el('importProgress').disabled=el('newProfile').disabled=true;status('Імпорт збережено у хмарі');
  }catch(e){status(e.message);}finally{busy=false;}
 }
 return {
  save(state){if(!ready||blocked)throw Error('Хмарний профіль не готовий');cache.state=Progress.validate(state);cache.pending=true;try{persist();}catch(e){blocked=true;lock();status('Не вдалося зберегти кеш. Експортуй прогрес перед закриттям сторінки.');throw e;}dirty=true;sync();},
  init(a){
   if(!navigator.locks){a.lock(true);status('Цей браузер не підтримує блокування вкладок. Відкрий актуальну версію Safari або Chrome.');return;}
   navigator.locks.request('deutsch-trainer-writer',{ifAvailable:true},async lease=>{
    if(!lease){a.lock(true);status('Тренування вже відкрите в іншій вкладці. Закрий її та перезавантаж цю сторінку.');return;}
    this.start(a);await new Promise(()=>{});
   });
  },
  start(a){
   adapter=a;lock();
   el('exportProgress').onclick=()=>{
    const backup={format:'deutsch-progress-backup-v1',legacy:adapter.rawLegacy()};
    try{backup.state=ready?adapter.snapshot():adapter.legacy();}catch(e){backup.error=e.message;}
    download(backup,'deutsch-progress-'+Date.now()+'.json');exported=true;
   };
   el('importFile').onchange=async e=>{try{const text=await e.target.files[0].text(),v=JSON.parse(text);adapter.preview(Progress.validate(v.state));previewed=true;}catch(err){status('Імпорт відхилено: '+err.message);}};
   el('importProgress').onclick=()=>{if(!exported){status('Спочатку натисни Експорт / резервна копія.');return;}try{const state=adapter.importCandidate();adapter.preview(state);if(!previewed){previewed=true;status('Перевір кількість слів у попередньому перегляді. Натисни Імпорт ще раз для підтвердження.');return;}if(confirm('Імпортувати показаний прогрес у порожню хмару? Спочатку завантаж резервну копію.'))initialize(state);}catch(e){status(e.message);}};
   el('newProfile').onclick=()=>{if(confirm('Створити порожній хмарний профіль? Safari-прогрес залишиться в оригінальному сховищі.'))initialize({schema:1,stats:{},hidden:[],cycle:{seen:[]}});};
   el('loadCloud').onclick=async()=>{download(cache,'deutsch-conflict-'+Date.now()+'.json');if(!confirm('Локальну версію експортовано. Завантажити хмарну?'))return;try{const row=await pull();if(!row)throw Error('Хмарний профіль відсутній');const state=Progress.validate(row.state);cache={revision:row.revision,state,pending:false};persist();adapter.apply(state);blocked=false;ready=true;lock();el('loadCloud').disabled=true;status('Завантажено з хмари');}catch(e){status(e.message);}};
   el('loginForm').onsubmit=async e=>{e.preventDefault();if(busy)return;try{if(ready&&cache?.pending)throw Error('Спочатку синхронізуй або експортуй поточний прогрес');session=await request('/auth/v1/token?grant_type=password',{email:el('email').value,password:el('password').value},false);session.expires_at=Math.floor(Date.now()/1000)+session.expires_in;localStorage.setItem(sessionKey,JSON.stringify(session));el('password').value='';await connect();}catch(err){status(err.message);}};
   el('logout').onclick=()=>{
    if(busy){status('Зачекай завершення синхронізації.');return;}
    if(cache?.pending&&!exported){status('Перед виходом синхронізуй або експортуй незбережений прогрес.');return;}
    session=null;cache=null;ready=false;blocked=false;localStorage.removeItem(sessionKey);lock();status('Вихід виконано. Кеш збережено для цього користувача.');
   };
   el('syncNow').onclick=sync;
   if(!cfg.url||!cfg.publishableKey){status('Supabase ще не налаштовано. Експорт Safari доступний; тренування заблоковано для захисту прогресу.');return;}
   try{session=JSON.parse(localStorage.getItem(sessionKey)||'null');if(session)connect();else status('Увійди до хмарного профілю. Safari-прогрес збережено.');}catch(e){status(e.message);}
   addEventListener('online',sync);addEventListener('focus',sync);setInterval(sync,15000);
  }
 };
})();
