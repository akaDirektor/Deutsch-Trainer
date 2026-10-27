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
test('translation-feedback draft is written to cloud and read by another device without changing counters',async()=>{
 const first=setup();await first.login();await first.initialize();const state=empty();state.stats.word={correct:5,wrong:1,translationFeedback:{translation:'старий переклад',reason:'незрозуміло',suggestion:'уточнення',updatedAt:'2026-10-21T12:00:00.000Z',status:'draft'}};first.save(state);await first.settle();await first.sync();assert.equal(first.row.state.stats.word.translationFeedback.reason,'незрозуміло');
 const second=setup();second.row=JSON.parse(JSON.stringify(first.row));await second.login();await second.settle();assert.equal(second.applied.stats.word.translationFeedback.suggestion,'уточнення');assert.equal(second.applied.stats.word.correct,5);assert.equal(second.applied.stats.word.wrong,1);
});

test('pending article and separate article counters survive cross-device cloud restoration',async()=>{
 const first=setup();await first.login();await first.initialize();const state=empty();state.stats.noun={correct:8,wrong:1,streak:2,mastered:false,articleCorrect:2,articleWrong:1,pendingArticle:true,articleNeedsReview:true};state.cycle.seen=['noun'];first.save(state);await first.settle();await first.sync();
 const second=setup();second.row=JSON.parse(JSON.stringify(first.row));await second.login();await second.settle();assert.equal(second.applied.stats.noun.pendingArticle,true);assert.equal(second.applied.stats.noun.articleWrong,1);assert.equal(second.applied.stats.noun.correct,8);assert.deepEqual(second.applied.cycle.seen,['noun']);
});
test('personal vocabulary and its provenance survive an offline write and load on another device',async()=>{
 const first=setup();await first.login();await first.initialize();first.offline=true;const state=empty();state.stats['die zuversicht']={correct:0,wrong:0,streak:0,customWord:{de:'die Zuversicht',uk:'впевненість',type:'noun',addedAt:'2026-10-22',approvedBy:'user',translationOrigin:'Wiktionary',sources:[{provider:'Wiktionary',url:'https://de.wiktionary.org/wiki/Zuversicht'}]}};state.cycle.seen=['old'];first.save(state);await first.settle();first.offline=false;await first.sync();
 const second=setup();second.row=JSON.parse(JSON.stringify(first.row));await second.login();await second.settle();assert.equal(second.applied.stats['die zuversicht'].customWord.uk,'впевненість');assert.equal(second.applied.stats['die zuversicht'].customWord.sources[0].provider,'Wiktionary');assert.deepEqual(second.applied.cycle.seen,['old']);
});

test('context results survive cross-device synchronization without modifying existing mastery, recall or hidden keys',async()=>{
 const first=setup();await first.login();await first.initialize();const state=empty();state.hidden=['kept-hidden'];state.stats.word={correct:3,wrong:1,streak:3,mastered:true,recallCorrect:2,contextCorrect:4,contextWrong:1,contextStreak:2};first.save(state);await first.settle();await first.sync();const second=setup();second.row=JSON.parse(JSON.stringify(first.row));await second.login();await second.settle();assert.deepEqual(second.applied.stats.word,state.stats.word);assert.deepEqual(second.applied.hidden,state.hidden);
});

test('sentence lookup sends only the selected sentence through authenticated read-only function without changing progress',async()=>{
 const h=setup();assert.throws(()=>h.ctx.window.Cloud.translateSentence('Ein Satz.'),/Увійди/);await h.login();await h.initialize();const before=JSON.stringify(h.row);let call;h.ctx.fetch=async(url,options)=>{call={url,options};return {ok:true,json:async()=>({query:'Ein vollständiger Satz.',translation:'Повне речення.'})}};await h.ctx.window.Cloud.translateSentence('Ein vollständiger Satz.');assert(call.url.endsWith('/functions/v1/dictionary-lookup'));assert.deepEqual(JSON.parse(call.options.body),{q:'Ein vollständiger Satz.',kind:'sentence'});assert.equal(call.options.headers.Authorization,'Bearer access');assert.equal(JSON.stringify(h.row),before);
});

test('a personal word and its lesson assignment synchronize as shared per-word metadata with original counters and hidden state',async()=>{
 const a=setup();await a.login();await a.initialize();const state=empty();state.hidden=['old-hidden'];state.stats.testlernwort={correct:2,wrong:1,streak:2,mastered:false,customWord:{de:'testlernwort',uk:'тестове слово',type:'phrase',addedAt:'2026-10-26',approvedBy:'user'},lessonMemberships:[{book:'b2',lesson:'4'}],unknownMetadata:{keep:true}};a.save(state);await a.settle();await a.sync();const b=setup();b.row=JSON.parse(JSON.stringify(a.row));await b.login();await b.settle();assert.deepEqual(b.applied.stats.testlernwort,state.stats.testlernwort);assert.deepEqual(b.applied.hidden,state.hidden);
});

test('canonical search lesson assignments sync to another device without creating a custom word or changing learning/hidden state',async()=>{
 const first=setup();await first.login();await first.initialize();const state=empty();state.stats['die kenntnis']={correct:7,wrong:1,streak:3,mastered:true,articleWrong:2,lessonMemberships:[{book:'b1plus',lesson:'2'},{book:'b2',lesson:'6'}],retained:{example:'unchanged'}};state.hidden=['die kenntnis'];state.cycle.seen=['die kenntnis'];first.save(state);await first.settle();await first.sync();const second=setup();second.row=JSON.parse(JSON.stringify(first.row));await second.login();await second.settle();assert.deepEqual(second.applied,state);assert.equal(second.applied.stats['die kenntnis'].customWord,undefined);
});
