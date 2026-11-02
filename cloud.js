/* Cloud authority with durable pending snapshots and compare-and-swap writes.
   Conflicts stop training; neither side is silently merged or discarded. */
window.Cloud=(()=>{
 const cfg=window.CLOUD_CONFIG, sessionKey='deutsch_cloud_session_v1';
 let session=null,cache=null,busy=false,dirty=false,blocked=false,ready=false,adapter,exported=false,previewed=false;
 const el=id=>document.getElementById(id);
 let toolsRequired=null;
 function accountView(){
  el('loginForm').hidden=Boolean(session);
  el('accountIdentity').textContent=session?'Angemeldet: '+(session.user.email||'dein Profil'):'';
  for(const id of ['importFileControl','importFile','importProgress','newProfile','importPreview'])el(id).hidden=ready;
  const required=!session||blocked||Boolean(session&&!ready);
  if(required!==toolsRequired){el('accountTools').open=required;toolsRequired=required;}
 }
 const status=t=>{
  el('syncStatus').textContent=t;
  const attention=blocked||/offline|fehler|konflikt|konnte nicht|ausstehend|nicht eingerichtet|unterstützt keine|anderen tab/i.test(t);
  el('syncAlert').textContent=t;el('syncAlert').hidden=!attention;
  accountView();
 };
 const lock=()=>{adapter.lock(!ready||blocked);accountView();};
 const cacheKey=()=>`deutsch_cloud_cache_v1:${session.user.id}`;
 function persist(){localStorage.setItem(cacheKey(),JSON.stringify(cache));}
 async function request(path,body,auth=true,extraHeaders={}){
  if(auth&&session.expires_at*1000<Date.now()+60000){
   const next=await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token},false);
   session={...next,expires_at:Math.floor(Date.now()/1000)+next.expires_in};localStorage.setItem(sessionKey,JSON.stringify(session));
  }
  const res=await fetch(cfg.url+path,{method:body?'POST':'GET',signal:AbortSignal.timeout(15000),headers:{apikey:cfg.publishableKey,...(auth?{Authorization:'Bearer '+session.access_token}:{}),'Content-Type':'application/json',...extraHeaders},...(body?{body:JSON.stringify(body)}:{})});
  if(!res.ok)throw Error('Supabase-Anfrage fehlgeschlagen (HTTP '+res.status+')');
  return res.json();
 }
 let feedbackBusy=false;
 const feedbackKey=owner=>'deutsch_feedback_outbox_v1:'+owner;
 function feedbackQueue(owner){const rows=JSON.parse(localStorage.getItem(feedbackKey(owner))||'[]');if(!Array.isArray(rows)||rows.length>50)throw Error('Die Hinweisliste konnte nicht gelesen werden');return rows;}
 function feedbackPayload(value){
  const limits={word_key:200,german:200,translation:4000,reason:600,suggestion:200};
  if(!value||typeof value.id!=='string'||!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value.id))throw Error('Ungültige Anfrage');
  const result={id:value.id.toLowerCase()};for(const [name,max] of Object.entries(limits)){if(typeof value[name]!=='string'||value[name].length>max)throw Error('Ungültiger Hinweis');result[name]=value[name];}if(!result.word_key||!result.german)throw Error('Wähle zuerst ein Wort aus');return result;
 }
 async function flushFeedback(){
  if(!session||!ready||blocked||busy||feedbackBusy)return;
  const owner=session.user.id;let queue;try{queue=feedbackQueue(owner)}catch{return}if(!queue.length)return;
  feedbackBusy=true;
  try{
   for(const item of queue){
    if(!session||session.user.id!==owner||blocked)break;
    const row={...feedbackPayload(item),user_id:owner};
    const result=await request('/rest/v1/translation_feedback_reports?on_conflict=id',row,true,{Prefer:'resolution=ignore-duplicates,return=representation'});
    if(!Array.isArray(result))throw Error('Keine Bestätigung erhalten');
    if(!result.some(r=>r.id===row.id)){const found=await request('/rest/v1/translation_feedback_reports?select=id&id=eq.'+row.id);if(!found.some(r=>r.id===row.id))throw Error('Keine Bestätigung erhalten');}
    const current=feedbackQueue(owner);localStorage.setItem(feedbackKey(owner),JSON.stringify(current.filter(r=>r.id!==row.id)));
    if(session?.user.id===owner)globalThis.dispatchEvent?.(new CustomEvent('trainer-feedback-delivery',{detail:{id:row.id}}));
   }
  }catch{ /* Durable outbox remains for the next online/focus/periodic retry. */ }
  finally{feedbackBusy=false;}
 }
 async function submitTranslationFeedback(value){
  if(!session||!ready||blocked)throw Error('Melde dich bei einem eingerichteten Cloud-Profil an');
  const owner=session.user.id,payload=feedbackPayload(value),queue=feedbackQueue(owner),old=queue.find(r=>r.id===payload.id);
  if(old&&JSON.stringify(feedbackPayload(old))!==JSON.stringify(payload))throw Error('Die Anfrage hat sich geändert. Sende eine neue Version.');
  if(!old){if(queue.length>=50)throw Error('Die Warteschlange ist voll. Warte, bis die Verbindung wiederhergestellt ist.');localStorage.setItem(feedbackKey(owner),JSON.stringify([...queue,payload]));}
  await flushFeedback();return {delivery:feedbackQueue(owner).some(r=>r.id===payload.id)?'queued':'sent',id:payload.id};
 }
 async function pull(){return (await request('/rest/v1/trainer_progress?select=*&user_id=eq.'+encodeURIComponent(session.user.id)))[0]||null;}
 function conflict(){blocked=true;lock();status('Versionskonflikt. Der lokale Fortschritt ist gesichert. Exportiere ihn vor dem Laden der Cloud-Version.');el('loadCloud').disabled=false;}
 async function sync(){
  if(!session||!ready||blocked||busy||feedbackBusy)return;busy=true;
  try{
   if(cache.pending){
    const snapshot=Progress.clone(cache.state),rev=cache.revision;
    const rows=await request('/rest/v1/rpc/save_trainer_progress',{expected_revision:rev,next_state:snapshot});
    if(!rows.length){conflict();return;}
    cache.revision=rows[0].revision;cache.pending=JSON.stringify(cache.state)!==JSON.stringify(snapshot);persist();
    status(cache.pending?'Synchronisierung…':'In der Cloud gespeichert');
   }else{
    const baseRevision=cache.revision;
    const row=await pull();
    // A response arriving after a local answer must never replace that answer.
    if(cache.pending||cache.revision!==baseRevision)return;
    if(row&&row.revision!==cache.revision){cache={revision:row.revision,state:Progress.validate(row.state),pending:false};persist();adapter.apply(cache.state,{resume:true});status('Aus der Cloud aktualisiert');}
   }
  }catch(e){status('Offline / Synchronisierungsfehler: '+e.message+'. Lokale Änderungen sind gespeichert.');}
  finally{busy=false;if(cache?.pending&&!blocked&&dirty){dirty=false;setTimeout(sync,100);}else flushFeedback();}
 }
 async function connect(){
  ready=false;blocked=false;lock();
  cache=JSON.parse(localStorage.getItem(cacheKey())||'null');
  try{
   const row=await pull();
   if(cache?.pending){Progress.validate(cache.state);adapter.apply(cache.state);ready=true;if((row?.revision??-1)!==cache.revision){conflict();return;}}
   else if(row){cache={revision:row.revision,state:Progress.validate(row.state),pending:false};persist();adapter.apply(cache.state);ready=true;}
   else{status('Die Cloud ist leer. Exportiere den Safari-Fortschritt und bestätige den Import oder erstelle ein neues Profil.');el('importProgress').disabled=false;el('newProfile').disabled=false;return;}
   lock();await sync();status(blocked?el('syncStatus').textContent:cache.pending?'Synchronisierung ausstehend':'Cloud-Profil bereit');
  }catch(e){
   if(cache){adapter.apply(Progress.validate(cache.state));ready=true;lock();status('Offline: Zwischenspeicher dieses Kontos. '+e.message);}
   else status('Die Cloud konnte nicht geladen werden: '+e.message);
  }
 }
 function download(value,name){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function initialize(state){
  if(!session||busy)return;busy=true;
  try{
   const checked=Progress.validate(state),rows=await request('/rest/v1/rpc/save_trainer_progress',{expected_revision:-1,next_state:checked});
   if(!rows.length)throw Error('Das Cloud-Profil existiert bereits. Der Import überschreibt es nicht.');
   cache={revision:rows[0].revision,state:checked,pending:false};persist();adapter.apply(checked);ready=true;blocked=false;lock();el('importProgress').disabled=el('newProfile').disabled=true;status('Import in der Cloud gespeichert');
  }catch(e){status(e.message);}finally{busy=false;}
 }
 return {
  submitTranslationFeedback,
  lookupDictionary(q,alternatives=false){if(!ready||blocked)throw Error('Melde dich bei einem eingerichteten Cloud-Profil an');return request('/functions/v1/dictionary-lookup',alternatives?{q,alternatives:true}:{q});},
  translateSentence(q){if(!ready||blocked)throw Error('Melde dich bei einem eingerichteten Cloud-Profil an');return request('/functions/v1/dictionary-lookup',{q,kind:'sentence'});},
  save(state){if(!ready||blocked)throw Error('Das Cloud-Profil ist nicht bereit');cache.state=Progress.validate(state);cache.pending=true;try{persist();}catch(e){blocked=true;lock();status('Der Zwischenspeicher konnte nicht gesichert werden. Exportiere den Fortschritt vor dem Schließen der Seite.');throw e;}dirty=true;sync();},
  init(a){
   if(!navigator.locks){a.lock(true);status('Dieser Browser unterstützt keine Tab-Sperren. Öffne eine aktuelle Version von Safari oder Chrome.');return;}
   navigator.locks.request('deutsch-trainer-writer',{ifAvailable:true},async lease=>{
    if(!lease){a.lock(true);status('Das Training ist bereits in einem anderen Tab geöffnet. Schließe ihn und lade diese Seite neu.');return;}
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
   el('importFile').onchange=async e=>{el('importFileName').textContent=e.target.files[0]?.name||'Keine Datei ausgewählt';if(!e.target.files[0])return;try{const text=await e.target.files[0].text(),v=JSON.parse(text);adapter.preview(Progress.validate(v.state));previewed=true;}catch(err){status('Import abgelehnt: '+(err.name==='SyntaxError'?'Ungültige JSON-Datei.':err.message));}};
   el('importProgress').onclick=()=>{if(!exported){status('Klicke zuerst auf Export / Sicherungskopie.');return;}try{const state=adapter.importCandidate();adapter.preview(state);if(!previewed){previewed=true;status('Prüfe die Wortzahl in der Vorschau. Klicke zum Bestätigen erneut auf Import.');return;}if(confirm('Den angezeigten Fortschritt in die leere Cloud importieren? Lade zuerst eine Sicherungskopie herunter.'))initialize(state);}catch(e){status(e.message);}};
   el('newProfile').onclick=()=>{if(confirm('Ein leeres Cloud-Profil erstellen? Der Safari-Fortschritt bleibt im ursprünglichen Speicher erhalten.'))initialize({schema:1,stats:{},hidden:[],cycle:{seen:[]}});};
   el('loadCloud').onclick=async()=>{download(cache,'deutsch-conflict-'+Date.now()+'.json');if(!confirm('Die lokale Version wurde exportiert. Cloud-Version laden?'))return;try{const row=await pull();if(!row)throw Error('Kein Cloud-Profil vorhanden');const state=Progress.validate(row.state);cache={revision:row.revision,state,pending:false};persist();adapter.apply(state);blocked=false;ready=true;lock();el('loadCloud').disabled=true;status('Aus der Cloud geladen');}catch(e){status(e.message);}};
   el('loginForm').onsubmit=async e=>{e.preventDefault();if(busy)return;try{if(ready&&cache?.pending)throw Error('Synchronisiere oder exportiere zuerst den aktuellen Fortschritt');session=await request('/auth/v1/token?grant_type=password',{email:el('email').value,password:el('password').value},false);session.expires_at=Math.floor(Date.now()/1000)+session.expires_in;localStorage.setItem(sessionKey,JSON.stringify(session));el('password').value='';await connect();}catch(err){status(err.message);}};
   el('logout').onclick=()=>{
    if(busy){status('Warte, bis die Synchronisierung abgeschlossen ist.');return;}
    if(cache?.pending&&!exported){status('Synchronisiere oder exportiere ungesicherten Fortschritt vor dem Abmelden.');return;}
    session=null;cache=null;ready=false;blocked=false;localStorage.removeItem(sessionKey);lock();status('Abgemeldet. Der Zwischenspeicher dieses Kontos bleibt erhalten.');
   };
   el('syncNow').onclick=sync;
   if(!cfg.url||!cfg.publishableKey){status('Supabase ist noch nicht eingerichtet. Safari-Export ist verfügbar; das Training ist zum Schutz des Fortschritts gesperrt.');return;}
   try{session=JSON.parse(localStorage.getItem(sessionKey)||'null');if(session)connect();else status('Melde dich beim Cloud-Profil an. Der Safari-Fortschritt ist gesichert.');}catch(e){status(e.message);}
   addEventListener('online',sync);addEventListener('focus',sync);document.addEventListener?.('visibilitychange',()=>{if(!document.hidden)sync();});setInterval(sync,15000);
  }
 };
})();
