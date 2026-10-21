const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function harness(){
 const elements=new Map(),timers=[],storage=new Map();
 function el(id){if(!elements.has(id))elements.set(id,{id,style:{},value:id==='mode'?'translation':id==='focus'?'all':'',innerHTML:'',textContent:'',dataset:{},classList:{items:new Set(['training','recallTraining','verbWriteTraining','matchExample'].includes(id)?['hidden']:[]),add(...x){x.forEach(v=>this.items.add(v))},remove(...x){x.forEach(v=>this.items.delete(v))},contains(x){return this.items.has(x)},toggle(){}},children:[],listeners:{},appendChild(child){this.children.push(child)},addEventListener(type,fn){this.listeners[type]=fn},setAttribute(name,value){this[name]=value},focus(){},scrollIntoView(){}});return elements.get(id)}
 const ctx=vm.createContext({console,Date,Math,Set,JSON,Map,window:{},document:{getElementById:id=>{assert(!['prevBtn','stopBtn','nextBtn'].includes(id));return el(id)},querySelectorAll:()=>[],createElement:()=>el('card'+Math.random())},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:fn=>timers.push(fn),clearTimeout(){},confirm:()=>true,Cloud:{save(){},init(a){ctx.adapter=a}}});
 vm.runInContext(fs.readFileSync('examples.js','utf8'),ctx);vm.runInContext(fs.readFileSync('progress.js','utf8'),ctx);ctx.Progress=ctx.window.Progress;
 const files=[...html.matchAll(/src="(words[^\"]+)"/g)].map(m=>m[1]);for(const file of files)vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
 vm.runInContext(html.match(/<script>\n([\s\S]*?)<\/script>/)[1],ctx);
 return {ctx,el,timers,run:s=>vm.runInContext(s,ctx)};
}
test('LEO preserves reflexive verbs and their prepositions as distinct searches',()=>{
 const h=harness();
 for(const [de,type,query] of [['die Abteilung','noun','Abteilung'],['halten','verb','halten'],['sich halten','verb','sich halten'],['sich halten in + Dat.','preposition','sich halten in'],['sich bewerben um + Akk.','preposition','sich bewerben um'],['jdm. etw. raten','verb','raten'],['(eine Prüfung) bestehen','verb','bestehen'],['sich etw. überlegen','verb','sich überlegen'],['(sich) ändern','verb','sich ändern'],['eine Entscheidung treffen','phrase','eine Entscheidung treffen']]){
  h.ctx.lookupWord={de,type};assert.equal(h.run('leoLookup(lookupWord)'),'https://dict.leo.org/russisch-deutsch/'+encodeURIComponent(query));
 }
});
test('repeat click keeps the original example and exposes LEO without recording an answer; long press still hides',()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.word=data.find(w=>w.example);addCard("leftCol","L",word,word.de)');
 const card=h.el('leftCol').children[0],before=h.run('JSON.stringify(snapshot())');
 card.onclick();assert(h.el('matchExample').classList.contains('hidden'));
 card.onclick();const box=h.el('matchExample');assert(box.innerHTML.includes(h.ctx.word.example));assert(!box.classList.contains('hidden'));
 const link=box.children.find(e=>e.textContent==='LEO ↗');assert(link);assert.equal(link.href,h.run('leoLookup(word)'));assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');assert.equal(h.run('JSON.stringify(snapshot())'),before);
 card.listeners.pointerdown();h.timers.at(-1)();card.onclick();assert(h.run('hiddenWords.has(key(word))'));assert.equal(h.run('s(word).correct'),0);assert.equal(h.run('selectedL'),null);
});
test('all repository vocabulary scripts load without changing corpus; startup handlers work',()=>{const h=harness();assert.equal(h.run('data.length'),h.run('rawSeed.length'));assert.equal(typeof h.el('startBtn').onclick,'function');assert(h.run('data.length')>=1079);});
test('complete cycles have no repeated successful words, including final partial round',()=>{const h=harness();h.run('trainingLocked=false');const seen=new Set();for(let i=0;i<Math.ceil(h.run('data.length')/5);i++){const keys=h.run('pick5().map(key)');for(const k of keys){assert(!seen.has(k));seen.add(k);}h.ctx.keys=keys;h.run('keys.forEach(k=>markCycleSeen(data.find(w=>key(w)===k)))');}assert.equal(seen.size,h.run('data.length'));assert.equal(h.run('pick5().length'),5);});
test('switching filters and returning preserves the original cycle',()=>{const h=harness();h.run('cyclePool();markCycleSeen(data[0]);typeFilter="noun";cyclePool();typeFilter="all";cyclePool()');assert.equal(h.run('cycle.seen.includes(key(data[0]))'),true);});
test('persisted state resumes cycle and preserves every per-word field',()=>{const h=harness();h.run('cyclePool();markCycleSeen(data[0]);s(data[0]).verbWriteCorrect=9;s(data[0]).lastWorked="2026-10-20"');const state=h.run('Progress.clone(snapshot())');h.ctx.restored=state;h.run('adapter.apply(restored)');assert.equal(h.run('cyclePool().some(w=>key(w)===key(data[0]))'),false);assert.equal(h.run('s(data[0]).verbWriteCorrect'),9);});
test('hidden words excluded from matching, recall and verb writing',()=>{const h=harness();h.run('data.forEach(w=>{s(w).mastered=true;hiddenWords.add(key(w))})');assert.equal(h.run('pool().length+recallPool().length+verbWritePool().length'),0);});
test('a rapid second click on a solved pair cannot count twice',()=>{const h=harness();h.run('trainingLocked=false;renderRound();selectedL={w:currentRound[0],e:document.createElement("div")};selectedR={w:currentRound[0],e:document.createElement("div")};globalThis.card=selectedL.e;globalThis.word=selectedL.w;check();select("L",card,word)');assert.equal(h.run('s(word).correct'),1);assert.equal(h.run('selectedL'),null);});
test('mastery after three successes; mistakes and recall counters retained',()=>{const h=harness();h.run('trainingLocked=false');for(let i=0;i<3;i++)h.run('selectedL={w:data[0],e:document.createElement("div")};selectedR={w:data[0],e:document.createElement("div")};check()');assert.equal(h.run('s(data[0]).mastered'),true);});
test('malformed import rejected without writing original storage',()=>{const h=harness();assert.throws(()=>h.run('Progress.validate({schema:1,stats:{x:{correct:-1}},hidden:[],cycle:{seen:[]}})'));assert.throws(()=>h.run('Progress.validate({})'));});
test('vocabulary and all historical backups remain byte-for-byte unchanged',()=>{const crypto=require('node:crypto');const manifest=JSON.parse(fs.readFileSync('tests/corpus-hashes.json'));for(const [name,hash] of Object.entries(manifest))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex'),hash,name);});

test("legacy Safari cycle without scope retains all seen keys",()=>{const h=harness();h.run("cycle={seen:data.slice(0,323).map(key)}");assert.equal(h.run("cyclePool().length"),h.run("data.length")-323);assert.equal(h.run("cycle.seen.length"),323);});

test('readiness counters show current streaks, exclude hidden/mastered and ignore lifetime correct totals',()=>{const h=harness();h.run(`s(data[0]).correct=9;s(data[0]).streak=1;s(data[1]).streak=2;s(data[2]).streak=1;hiddenWords.add(key(data[2]));s(data[3]).streak=2;s(data[3]).mastered=true;s(data[4]).correct=20;s(data[4]).streak=0;updateStats()`);assert.equal(h.el('matchingOnceCount').textContent,1);assert.equal(h.el('matchingTwiceCount').textContent,1);h.run('s(data[0]).streak=2;updateStats()');assert.equal(h.el('matchingOnceCount').textContent,0);assert.equal(h.el('matchingTwiceCount').textContent,2);h.run('s(data[0]).streak=3;s(data[0]).mastered=true;s(data[1]).streak=0;updateStats()');assert.equal(h.el('matchingTwiceCount').textContent,0);});

test('progress lists use current streaks and recorded errors, exclude hidden words and never write progress',()=>{
 const h=harness();
 h.run("globalThis.samples=data.slice(0,6);stats={};samples.forEach((w,i)=>{stats[key(w)]={correct:10,wrong:i===2?4:0,streak:[1,2,0,1,1,3][i],mastered:i===5,recallWrong:i===4?2:0}});hiddenWords=new Set([key(samples[3])]);");
 const before=h.run('JSON.stringify(snapshot())');
 assert.deepEqual(Array.from(h.run('wordProgressWords("once").map(key)')).sort(),Array.from(h.run('[key(samples[0]),key(samples[4])]')).sort());
 assert.deepEqual(Array.from(h.run('wordProgressWords("twice").map(key)')),Array.from(h.run('[key(samples[1])]')));
 assert.deepEqual(Array.from(h.run('wordProgressWords("mistakes").map(key)')),Array.from(h.run('[key(samples[2]),key(samples[4])]')));
 h.el('showMatchingOnce').onclick();assert.equal(h.el('wordProgressPanel').hidden,false);assert.equal(h.el('showMatchingOnce')['aria-expanded'],'true');
 assert.equal(h.el('wordProgressList').children[0].children[0].textContent,h.run('wordProgressWords("once")[0].de'));
 h.el('closeWordProgress').onclick();assert.equal(h.el('wordProgressPanel').hidden,true);
 h.el('showMistakes').onclick();assert.match(h.el('wordProgressTitle').textContent,/2$/);
 h.el('showMistakes').onclick();assert.equal(h.el('wordProgressPanel').hidden,true);
 assert.equal(h.run('JSON.stringify(snapshot())'),before);
});

test('search covers German, Ukrainian and hidden words without changing progress',()=>{
 const h=harness();h.run('hiddenWords.add(key(data[0]))');const before=h.run('JSON.stringify(snapshot())');
 assert.equal(h.run('findWords(data[0].de.toUpperCase()).some(w=>key(w)===key(data[0]))'),true);
 assert.equal(h.run('findWords(data[0].uk.split(";")[0]).some(w=>key(w)===key(data[0]))'),true);
 assert.equal(h.run('searchText("GRÖẞER")'), 'grosser');assert.equal(h.run('findWords("   ").length'),0);
 h.el('wordSearchInput').value=h.run('data[0].de');h.el('wordSearchInput').oninput();
 const button=h.el('wordSearchResults').children[0].children[0];assert.match(button.children[0].textContent,/приховане/);button.onclick();assert(!h.el('wordSearchDetail').classList.contains('hidden'));
 assert.equal(h.run('JSON.stringify(snapshot())'),before);
});
test('solved German cards and recent matches open examples without another answer, including after round changes',()=>{
 const h=harness();h.run('trainingLocked=false;renderRound(data.slice(0,2));globalThis.word=currentRound[0]');
 const left=h.el('leftCol').children.find(e=>e.dataset.k===h.run('key(word)')),right=h.el('rightCol').children.find(e=>e.dataset.k===h.run('key(word)'));
 left.onclick();right.onclick();assert.equal(h.run('s(word).correct'),1);const before=h.run('JSON.stringify(snapshot())');
 left.onclick();assert(!h.el('matchExample').classList.contains('hidden'));assert.equal(h.run('selectedL'),null);
 left.onkeydown({key:'Enter',preventDefault(){}});assert.equal(h.run('JSON.stringify(snapshot())'),before);
 h.run('renderRound(data.slice(2,4))');h.el('recentMatchWords').children.at(-1).onclick();assert(!h.el('matchExample').classList.contains('hidden'));assert.equal(h.run('JSON.stringify(snapshot())'),before);
 const css=fs.readFileSync('app.css','utf8');assert(css.includes('.card.done.reviewable{pointer-events:auto}'));
});

test('every word without an imported example has a unique authored sentence; vocabulary examples take permanent priority',()=>{
 const h=harness(),before=h.run('JSON.stringify(snapshot())');
 const result=h.run(`(()=>{const sentences=new Set();let provided=0,supplemented=0,variants=0;for(const w of data){const choices=window.WORD_EXAMPLES[key(w)];if(w.example){provided++;for(let i=0;i<4;i++)if(makeExample(w)!==w.example)throw Error('Original example replaced: '+w.de);if(exampleLabel(w)!=='Збережений приклад')throw Error('Wrong source');continue;}supplemented++;if(!choices?.length)throw Error('Missing example: '+w.de);for(const text of choices){if(typeof text!=='string'||text.length<20||/[<>]/.test(text))throw Error('Invalid sentence: '+w.de);if(sentences.has(text))throw Error('Duplicate sentence: '+text);sentences.add(text);}if(choices.length>1){variants++;let previous=makeExample(w);for(let i=0;i<choices.length*2;i++){const next=makeExample(w);if(next===previous)throw Error('Immediate repeat: '+w.de);previous=next;}}if(exampleLabel(w)!=='Авторський приклад (ШІ)')throw Error('Wrong source');}return {provided,supplemented,variants};})()`);
 assert(result.provided>=291);assert.equal(result.supplemented,h.run('data.filter(w=>!w.example).length'));assert(result.variants>=72);assert.equal(h.run('JSON.stringify(snapshot())'),before);
 h.run('globalThis.importedWord=data.find(w=>w.example);window.WORD_EXAMPLES[key(importedWord)]=["This must never replace the imported sentence.","Nor should this sentence."]');
 for(let i=0;i<5;i++)assert.equal(h.run('makeExample(importedWord)'),h.ctx.importedWord.example);
 assert.equal(h.run('makeExample({de:"future word"})'),'Для цього слова приклад ще не підготовлено. Значення можна перевірити в LEO.');
 assert(!html.includes('Im Berufsalltag spielt'));assert(!html.includes('Im Arbeitsalltag muss man oft'));
});
test('matching, search and recall share the same source priority and safe rendering',()=>{
 const h=harness();h.run('globalThis.word=data.find(w=>w.example);showMatchExample(word);');
 assert(h.el('matchExample').innerHTML.includes(h.ctx.word.example));assert.match(h.el('matchExample').innerHTML,/Збережений приклад/);
 h.run('recallWord=word;showRecallAnswer()');assert(h.el('recallAnswer').innerHTML.includes(h.ctx.word.example));
 h.run('globalThis.word=data.find(w=>w.de==="das Wohlbefinden");showMatchExample(word,"wordSearchDetail")');assert.match(h.el('wordSearchDetail').innerHTML,/Авторський приклад/);assert(!h.el('wordSearchDetail').innerHTML.includes('spielt'));
 assert.equal(h.run('escapeExample("<img>&")'),'&lt;img&gt;&amp;');
});

test('daily history counts unique words across modes, retains today legacy work and survives cloud snapshots',()=>{
 const h=harness();h.run('data=data.slice(0,10);stats={};globalThis.oldDay="2026-10-01";s(data[0]).lastWorked=today();s(data[1]).lastWorked=today();s(data[2]).lastWorked=oldDay;globalThis.beforeCounters=JSON.stringify(stats);');
 assert.equal(h.run('activitySeries().at(-1).count'),2);assert.equal(h.run('activitySeries().at(-1).percent'),20);assert.equal(h.run('activitySeries().filter(x=>x.known).length'),1);
 h.run('markWorked(data[1]);markWorked(data[1]);markWorked(data[3])');assert.equal(h.run('activitySeries().at(-1).count'),3);assert.equal(h.run('s(data[1]).workedDays.length'),1);assert.equal(h.run('s(data[0]).workedDays[0]'),h.run('today()'));assert.equal(h.run('s(data[2]).lastWorked'),h.ctx.oldDay);
 h.run('hiddenWords.add(key(data[0]))');assert.equal(h.run('activitySeries().at(-1).count'),3);assert.equal(h.run('activitySeries().at(-1).total'),10);
 h.run('globalThis.saved=Progress.validate(snapshot());adapter.apply(saved)');assert.equal(h.run('activitySeries().at(-1).count'),3);assert.equal(h.run('s(data[1]).correct'),0);assert.equal(h.run('s(data[1]).wrong'),0);
 const before=h.run('JSON.stringify(snapshot())');h.el('dailyChart').children.at(-1).onclick();assert.equal(h.run('JSON.stringify(snapshot())'),before);
});
test('daily series distinguishes unavailable dates, zero activity, day rollover and current-base percentages',()=>{
 const h=harness();h.run('data=data.slice(0,4);stats={};s(data[0]).workedDays=["2026-10-19"];s(data[0]).lastWorked="2026-10-21";s(data[1]).workedDays=["2026-10-21"];s(data[1]).lastWorked="2026-10-21";s(data[2]).lastWorked="2026-10-18";');
 const series=Array.from(h.run('activitySeries("2026-10-21")'));assert.equal(series[3].day,'2026-10-18');assert.equal(series[3].known,false);assert.equal(series[3].count,null);assert.equal(series[4].count,1);assert.equal(series[4].percent,25);assert.equal(series[5].count,0);assert.equal(series[6].count,2);
 assert.equal(h.run('activitySeries("2026-10-22").at(-1).count'),0);
 h.run('addWorkedDay(s(data[0]),"2026-10-22")');assert.equal(h.run('s(data[0]).workedDays.includes("2026-10-19")'),true);assert.equal(h.run('activitySeries("2026-10-22").at(-1).count'),1);
 h.run('s(data[3]).workedDays=["2026-01-01"];addWorkedDay(s(data[3]),"2026-10-22")');assert.equal(h.run('s(data[3]).workedDays.length'),1);
 assert.equal(h.run('activitySeries("2026-03-31").map(x=>x.day).join(",")'),'2026-03-25,2026-03-26,2026-03-27,2026-03-28,2026-03-29,2026-03-30,2026-03-31');
});
test('workedDays validation rejects malformed dates without changing legacy progress',()=>{
 const h=harness();for(const days of [["2026-02-30"],["bad"],["2026-10-21","2026-10-21"],{},[42]]){h.ctx.badDays=days;assert.throws(()=>h.run('Progress.validate({schema:1,stats:{word:{correct:1,workedDays:badDays}},hidden:[],cycle:{seen:[]}})'));}
 assert.equal(h.run('Progress.validate({schema:1,stats:{word:{correct:1,workedDays:["2024-02-29"]}},hidden:[],cycle:{seen:[]}}).stats.word.correct'),1);
});

test('an open example follows the next German selection with one click, until explicitly closed',()=>{
 const h=harness();h.run('trainingLocked=false;renderRound(data.slice(0,3))');
 const cards=h.el('leftCol').children;
 cards[0].onclick();assert(h.el('matchExample').classList.contains('hidden'));cards[0].onclick();assert(!h.el('matchExample').classList.contains('hidden'));
 const before=h.run('JSON.stringify(snapshot())');cards[1].onclick();assert(h.el('matchExample').innerHTML.includes(cards[1].textContent));assert.equal(h.run('JSON.stringify(snapshot())'),before);assert.equal(h.run('selectedL.w.de'),cards[1].textContent);
 const close=h.el('matchExample').children.filter(e=>e.className==='exampleClose').at(-1);assert(close);close.onclick();assert(h.el('matchExample').classList.contains('hidden'));assert.equal(h.run('followMatchExamples'),false);
 cards[2].onclick();assert(h.el('matchExample').classList.contains('hidden'));cards[2].onclick();assert(!h.el('matchExample').classList.contains('hidden'));
 h.run('renderRound(data.slice(3,5))');assert(h.el('matchExample').classList.contains('hidden'));h.el('leftCol').children.at(-1).onclick();assert(!h.el('matchExample').classList.contains('hidden'));assert.equal(h.run('followMatchExamples'),true);
});

test('holding a Ukrainian translation prepares feedback without an answer or hiding a word',()=>{
 const h=harness();h.run('trainingLocked=false;renderRound(data.slice(0,2))');const card=h.el('rightCol').children[0],before=h.run('JSON.stringify(snapshot())');
 card.listeners.pointerdown();h.timers.at(-1)();card.onclick();assert.equal(h.el('translationReport').open,true);assert.equal(h.el('reportGerman').textContent,h.run('reportWord.de'));assert.equal(h.run('JSON.stringify(snapshot())'),before);assert.equal(h.run('selectedR'),null);assert.equal(h.run('hiddenWords.size'),0);
 h.el('closeTranslationReport').onclick();assert.equal(h.el('translationReport').open,false);
 h.run('document.getElementById("mode").value="nounPlural";addCard("rightCol","R",data[0],data[0].plural)');assert.equal(h.el('rightCol').children.at(-1).listeners.pointerdown,undefined);
});
test('feedback drafts persist with progress but do not change vocabulary, examples, cycles or learning counters',()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.word=data[0];openTranslationReport(word);');const before=h.run('JSON.stringify(snapshot())'),corpus=h.run('JSON.stringify(data)');
 h.el('reportReason').value='Незрозумілий переклад';h.el('reportSuggestion').value='Краще пояснення';h.el('translationReportForm').onsubmit({preventDefault(){}});
 assert.equal(h.run('s(word).translationFeedback.reason'),'Незрозумілий переклад');assert.equal(h.el('reportGitHub').hidden,false);const url=h.el('reportGitHub').href;assert(url.startsWith('https://github.com/akaDirektor/Deutsch-Trainer/issues/new?'));assert(decodeURIComponent(url).includes(h.ctx.word.de));assert(!url.includes('access_token'));
 const after=h.run('Progress.validate(snapshot())');delete after.stats[h.run('key(word)')].translationFeedback;assert.equal(JSON.stringify(after),before);assert.equal(h.run('JSON.stringify(data)'),corpus);
 h.run('globalThis.saved=Progress.validate(snapshot());adapter.apply(saved);openTranslationReport(word)');assert.equal(h.el('reportReason').value,'Незрозумілий переклад');assert.equal(h.run('wordProgressWords("feedback").length'),1);
 h.run('hiddenWords.add(key(word))');assert.equal(h.run('wordProgressWords("feedback").length'),1);
});
test('feedback refuses unauthenticated writes and malformed imported drafts',()=>{
 const h=harness();h.run('openTranslationReport(data[0])');const before=h.run('JSON.stringify(snapshot())');h.el('translationReportForm').onsubmit({preventDefault(){}});assert.equal(h.run('JSON.stringify(snapshot())'),before);
 for(const draft of [[],{},'bad',{translation:'x',reason:'x'.repeat(601),suggestion:'',updatedAt:new Date().toISOString(),status:'draft'}]){h.ctx.invalidFeedback=draft;assert.throws(()=>h.run('Progress.validate({schema:1,stats:{word:{translationFeedback:invalidFeedback}},hidden:[],cycle:{seen:[]}})'));}
});
