const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const empty=()=>({schema:1,stats:{},hidden:[],cycle:{seen:[]}});
function setup(){
 let row=null,calls=0,offline=false,adapter,applied,locked,readHook=null;const elements={},store=new Map(),intervals=[];
 const ctx=vm.createContext({console,Date,JSON,Promise,Error,AbortSignal,Blob,URL:{createObjectURL:()=>'',revokeObjectURL(){}},navigator:{locks:{request:(name,options,fn)=>{fn({});}}},setTimeout:()=>{},setInterval:f=>intervals.push(f),addEventListener(){},confirm:()=>true,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},document:{getElementById:id=>elements[id]??(elements[id]={value:id==='email'?'test@example.test':'password',disabled:true,textContent:''}),createElement:()=>({click(){}})},window:{CLOUD_CONFIG:{url:'https://test.supabase.co',publishableKey:'sb_publishable_test'}},fetch:async(url,options)=>{
  calls++;if(offline)throw Error('Offline');
  let value;
  if(url.includes('/token?'))value={user:{id:'one-user'},access_token:'access',refresh_token:'refresh',expires_in:3600};
  else if(options.method==='GET'){if(readHook){const fn=readHook;readHook=null;fn();}value=row?[row]:[];}
  else{const body=JSON.parse(options.body);if(body.expected_revision===(row?.revision??-1)){row={revision:(row?.revision??-1)+1,state:body.next_state};value=[row]}else value=[];}
  return {ok:true,json:async()=>value};
 }});
 vm.runInContext(fs.readFileSync('progress.js','utf8'),ctx);ctx.Progress=ctx.window.Progress;
 vm.runInContext(fs.readFileSync('cloud.js','utf8'),ctx);
 ctx.window.Cloud.init(adapter={lock:x=>locked=x,active:()=>false,apply:s=>applied=s,snapshot:()=>applied,legacy:empty,rawLegacy:()=>({}),preview(){},importCandidate:empty});
 return {ctx,store,elements,adapter,set readHook(fn){readHook=fn},get row(){return row},set row(x){row=x},get locked(){return locked},get applied(){return applied},set offline(x){offline=x},async login(){await elements.loginForm.onsubmit({preventDefault(){}})},async initialize(){await elements.newProfile.onclick();await new Promise(setImmediate)},async sync(){await elements.syncNow.onclick()},save(s){ctx.window.Cloud.save(s)},async settle(){await new Promise(setImmediate)}};
}
test('empty account never automatically imports or resets legacy progress',async()=>{const h=setup();await h.login();assert.equal(h.row,null);assert(h.locked);assert.equal(h.elements.importProgress.disabled,false);});
test('cloud writes are durable and versioned; offline edits retry',async()=>{const h=setup();await h.login();await h.initialize();h.offline=true;const s=empty();s.stats.wort={correct:4};h.save(s);await h.settle();assert.equal(JSON.parse(h.store.get('deutsch_cloud_cache_v1:one-user')).pending,true);h.offline=false;await h.sync();assert.equal(h.row.state.stats.wort.correct,4);assert.equal(JSON.parse(h.store.get('deutsch_cloud_cache_v1:one-user')).pending,false);});
test('stale device cannot overwrite a newer cloud version',async()=>{const h=setup();await h.login();await h.initialize();h.row={revision:10,state:{...empty(),stats:{remote:{correct:99}}}};const s=empty();s.stats.local={correct:3};h.save(s);await h.settle();assert(h.locked);assert.equal(h.row.state.stats.remote.correct,99);assert.equal(JSON.parse(h.store.get('deutsch_cloud_cache_v1:one-user')).state.stats.local.correct,3);});
test('clean idle device loads progress from another device',async()=>{const h=setup();await h.login();await h.initialize();h.row={revision:10,state:{...empty(),stats:{remote:{correct:99}}}};await h.sync();assert.equal(h.applied.stats.remote.correct,99);});
test('import refuses to overwrite a nonempty cloud account',async()=>{const h=setup();await h.login();h.row={revision:5,state:empty()};await h.initialize();assert.equal(h.row.revision,5);assert(h.elements.syncStatus.textContent.includes('уже існує'));});

test('active training receives remote progress without waiting for the round to close',async()=>{const h=setup();await h.login();await h.initialize();h.adapter.active=()=>true;let options;h.adapter.apply=(s,o)=>{options=o};h.row={revision:8,state:{...empty(),stats:{phone:{correct:6}}}};await h.sync();assert.equal(options.resume,true);assert.equal(JSON.parse(h.store.get('deutsch_cloud_cache_v1:one-user')).state.stats.phone.correct,6);});
test('remote read arriving after a local answer never overwrites the pending answer',async()=>{const h=setup();await h.login();await h.initialize();h.row={revision:8,state:{...empty(),stats:{phone:{correct:6}}}};h.readHook=()=>h.save({...empty(),stats:{mac:{correct:4}}});await h.sync();const local=JSON.parse(h.store.get('deutsch_cloud_cache_v1:one-user'));assert.equal(local.state.stats.mac.correct,4);assert.equal(local.pending,true);assert.equal(h.row.state.stats.phone.correct,6);});
