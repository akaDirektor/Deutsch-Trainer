const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function harness(){
 const elements=new Map(),timers=[],storage=new Map();
 function el(id){if(!elements.has(id))elements.set(id,{id,style:{},value:id==='mode'?'translation':id==='focus'?'all':'',innerHTML:'',textContent:'',dataset:{},classList:{items:new Set(['training','recallTraining','verbWriteTraining','articleReviewTraining','matchExample'].includes(id)?['hidden']:[]),add(...x){x.forEach(v=>this.items.add(v))},remove(...x){x.forEach(v=>this.items.delete(v))},contains(x){return this.items.has(x)},toggle(){}},children:[],listeners:{},appendChild(child){this.children.push(child)},addEventListener(type,fn){this.listeners[type]=fn},setAttribute(name,value){this[name]=value},focus(){},scrollIntoView(){}});return elements.get(id)}
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
test('mastery after three successes; mistakes and recall counters retained',()=>{const h=harness();h.run('trainingLocked=false');for(let i=0;i<3;i++)h.run('selectedL={w:data[0],e:document.createElement("div")};selectedR={w:data[0],e:document.createElement("div")};check();answerArticle(data[0].article);acknowledgeArticle()');assert.equal(h.run('s(data[0]).mastered'),true);});
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
 h.run('hiddenWords.add(key(data[0]))');assert.equal(h.run('activitySeries().at(-1).count'),2);assert.equal(h.run('activitySeries().at(-1).total'),9);
 h.run('globalThis.saved=Progress.validate(snapshot());adapter.apply(saved)');assert.equal(h.run('activitySeries().at(-1).count'),2);assert.equal(h.run('s(data[1]).correct'),0);assert.equal(h.run('s(data[1]).wrong'),0);
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
 const before=h.run('JSON.stringify(snapshot())');cards[1].onclick();assert(h.el('matchExample').innerHTML.includes(cards[1].textContent));assert.equal(h.run('JSON.stringify(snapshot())'),before);assert.equal(h.run('selectedL.e.textContent'),cards[1].textContent);
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

test('today counter and chart share active vocabulary and daily history after every mode, hide and restore',()=>{
 const h=harness();h.run('data=data.slice(0,10);stats={};s(data[0]).lastWorked=today();s(data[1]).workedDays=[today()];s(data[1]).lastWorked="2026-01-01";s(data[2]).lastWorked=today();hiddenWords.add(key(data[2]));updateStats()');
 const assertSame=()=>{const coverage=h.run('activitySeries().at(-1)');assert.equal(h.el('todayWorked').textContent,coverage.count+' / '+coverage.total);assert.equal(h.el('totalCount').textContent,coverage.total);};
 assertSame();assert.equal(h.el('todayWorked').textContent,'2 / 9');const original=h.run('JSON.stringify(snapshot())');
 h.run('markWorked(data[3])');assert.equal(h.el('todayWorked').textContent,'3 / 9');assertSame();
 h.run('hiddenWords.add(key(data[0]));updateStats()');assert.equal(h.el('todayWorked').textContent,'2 / 8');assertSame();
 h.ctx.restored=JSON.parse(original);h.run('adapter.apply(restored)');assertSame();assert.equal(h.el('todayWorked').textContent,'2 / 9');
 h.run('data.forEach(w=>hiddenWords.add(key(w)));updateStats()');assertSame();assert.equal(h.el('todayWorked').textContent,'0 / 0');assert.equal(h.run('activitySeries().at(-1).percent'),0);
 assert.equal(h.run('s(data[2]).lastWorked'),h.run('today()'));assert.equal(h.run('s(data[1]).workedDays[0]'),h.run('today()'));
});

test('noun translation requires an article before gaining mastery and preserves original keys',()=>{
 const h=harness();h.run('trainingLocked=false;renderRound(data.slice(0,2));globalThis.word=currentRound[0];s(word).streak=2;selectedL={w:word,e:document.createElement("div")};selectedR={w:word,e:document.createElement("div")};check()');
 assert.equal(h.run('leftText(word)'),h.run('word.de.replace(/^(der|die|das)\\s+/,"")'));
 assert.equal(h.run('s(word).correct'),1);assert.equal(h.run('s(word).streak'),2);assert.equal(h.run('s(word).mastered'),false);assert.equal(h.run('s(word).pendingArticle'),true);assert.equal(h.el('articleQuiz').open,true);
 h.run('answerArticle(word.article);answerArticle(word.article)');assert.equal(h.run('s(word).streak'),3);assert.equal(h.run('s(word).mastered'),true);assert.equal(h.run('s(word).articleCorrect'),1);assert.equal(h.run('s(word).pendingArticle'),false);
 h.run('acknowledgeArticle()');assert.equal(h.el('articleQuiz').open,false);assert.equal(h.run('key(word)'),h.run('word.de.toLowerCase().trim()'));
 h.run('document.getElementById("mode").value="nounPlural"');assert.equal(h.run('needsArticle(word)'),false);assert.equal(h.run('leftText(word)'),h.ctx.word.de);
});
test('wrong article has separate accounting, blocks success and prevents a noun repeating in its vocabulary cycle',()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.word=data.find(w=>w.type==="noun");s(word).streak=2;s(word).recallCorrect=7;selectedL={w:word,e:document.createElement("div")};selectedR={w:word,e:document.createElement("div")};check();answerArticle(word.article==="der"?"das":"der")');
 assert.equal(h.run('s(word).correct'),1);assert.equal(h.run('s(word).wrong'),0);assert.equal(h.run('s(word).articleWrong'),1);assert.equal(h.run('s(word).articleNeedsReview'),true);assert.equal(h.run('s(word).streak'),0);assert.equal(h.run('s(word).mastered'),false);assert.equal(h.run('s(word).recallCorrect'),7);assert.equal(h.run('wordProgressWords("articles")[0].de'),h.ctx.word.de);assert.equal(h.run('cyclePool().some(w=>key(w)===key(word))'),false);
 h.run('acknowledgeArticle();selectedL={w:word,e:document.createElement("div")};selectedR={w:word,e:document.createElement("div")};check();answerArticle(word.article)');assert.equal(h.run('s(word).articleNeedsReview'),false);assert.equal(h.run('s(word).articleWrong'),1);assert.equal(h.run('s(word).articleCorrect'),1);assert.equal(h.run('s(word).streak'),1);assert.equal(h.run('wordProgressWords("articles").length'),1);
});
test('pending article survives cloud snapshot restore; a stale question cannot count twice',()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.word=data[0];selectedL={w:word,e:document.createElement("div")};selectedR={w:word,e:document.createElement("div")};check();globalThis.saved=Progress.validate(snapshot());adapter.apply(saved)');assert.equal(h.run('articleQuestion.w.de'),h.ctx.word.de);assert.equal(h.run('s(word).correct'),1);
 h.run('answerArticle(word.article);acknowledgeArticle();answerArticle(word.article)');assert.equal(h.run('s(word).articleCorrect'),1);assert.equal(h.run('s(word).streak'),1);
 h.run('globalThis.finished=Progress.validate(snapshot());adapter.apply(finished)');assert.equal(h.run('articleQuestion'),null);
 for(const bad of [{articleCorrect:-1},{articleWrong:0.5},{pendingArticle:'yes'},{articleNeedsReview:1}]){h.ctx.badArticle=bad;assert.throws(()=>h.run('Progress.validate({schema:1,stats:{word:badArticle},hidden:[],cycle:{seen:[]}})'));}
});
test('automatic next round waits for the final noun article, then continues without repeats',()=>{
 const h=harness();h.run('trainingLocked=false;document.getElementById("training").classList.remove("hidden");globalThis.batch=data.filter(w=>w.type==="verb").slice(0,4).concat(data.find(w=>w.type==="noun"));renderRound(batch)');
 for(let i=0;i<5;i++){h.ctx.index=i;h.run('selectedL={w:batch[index],e:document.createElement("div")};selectedR={w:batch[index],e:document.createElement("div")};check()');}
 let cursor=0;while(cursor<h.timers.length)h.timers[cursor++]();assert.equal(h.run('currentRound[4].de'),h.run('batch[4].de'));assert.equal(h.run('solved.size'),4);assert.equal(h.run('articleQuestion.w.de'),h.run('batch[4].de'));
 h.run('answerArticle(batch[4].article);acknowledgeArticle()');while(cursor<h.timers.length)h.timers[cursor++]();assert.equal(h.run('currentRound.some(w=>batch.some(old=>key(old)===key(w)))'),false);assert.equal(h.run('currentRound.length'),5);
});

test('article results stay visible until acknowledged and wrong articles retain the full noun with an error marker',()=>{
 for(const correct of [true,false]){
  const h=harness();h.ctx.correct=correct;
  h.run('trainingLocked=false;globalThis.word=data.find(w=>w.type==="noun");currentRound=[word,data.find(w=>w.type!=="noun")];globalThis.left=document.createElement("div");globalThis.right=document.createElement("div");selectedL={w:word,e:left};selectedR={w:word,e:right};check();answerArticle(correct?word.article:(word.article==="der"?"das":"der"))');
  let cursor=0;while(cursor<h.timers.length)h.timers[cursor++]();
  assert.equal(h.run('articleQuestion.answered'),true);assert.equal(h.el('articleNoun').textContent,h.ctx.word.de);assert.equal(h.el('articleContinue').hidden,false);assert(h.el('articleResult').textContent.startsWith(correct?'✓':'✕'));
  h.run('acknowledgeArticle()');assert.equal(h.run('left.textContent'),h.ctx.word.de);assert.equal(h.run('left.classList.contains("articleMistake")'),!correct);assert(h.run('left["aria-label"]').includes(correct?'✓':'✕'));
 }
});

test('previous round toggles actual cards and restores the current round without changing progress',()=>{
 const h=harness();h.run('trainingLocked=false;document.getElementById("training").classList.remove("hidden");cyclePool();globalThis.batch=data.filter(w=>w.type!=="noun").slice(0,5);renderRound(batch);globalThis.oldCards=[...document.getElementById("leftCol").children];for(const w of batch){selectedL={w,e:oldCards.find(e=>e.dataset.k===key(w))};selectedR={w,e:document.getElementById("rightCol").children.find(e=>e.dataset.k===key(w))};check()}');
 let cursor=0;while(cursor<h.timers.length)h.timers[cursor++]();
 assert.equal(h.el('previousRound').hidden,false);assert.equal(h.run('currentRound.some(w=>batch.includes(w))'),false);
 const before=h.run('JSON.stringify({snapshot:snapshot(),round:currentRound.map(key),epoch:roundEpoch,selectedL,selectedR})');
 h.el('previousRound').onclick();assert.equal(h.run('viewingPreviousRound'),true);assert.equal(h.run('previousRoundState.columns[0].nodes[0]===oldCards[0]'),true);
 h.ctx.oldCards[4].onclick();assert(h.el('matchExample').innerHTML.includes(h.ctx.batch.find(w=>w.de===h.ctx.oldCards[4].textContent).de));
 h.el('previousRound').onclick();assert.equal(h.run('viewingPreviousRound'),false);assert.equal(h.run('JSON.stringify({snapshot:snapshot(),round:currentRound.map(key),epoch:roundEpoch,selectedL,selectedR})'),before);
});

test('article mistake ratio and accuracy use article attempts independently of translation accuracy',()=>{
 const h=harness();assert.equal(h.el('articleAccuracy').textContent,'—');assert.equal(h.el('articleMistakesCount').textContent,'0 з 0');
 h.run('globalThis.word=data.find(w=>w.type==="noun");s(word).articleCorrect=8;s(word).articleWrong=2;s(word).correct=99;s(word).wrong=1;updateStats()');
 assert.equal(h.el('articleMistakesCount').textContent,'2 з 10');assert.equal(h.el('articleAccuracy').textContent,'80%');assert.equal(h.el('accuracy').textContent,'99%');
 const state=h.run('Progress.clone(snapshot())');h.ctx.restored=state;h.run('adapter.apply(restored)');assert.equal(h.el('articleAccuracy').textContent,'80%');assert.equal(h.el('articleMistakesCount').textContent,'2 з 10');
});

test('article error practice excludes corrected and hidden nouns, preserves matching progress, and clears unresolved errors',()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.nouns=data.filter(w=>w.type==="noun").slice(0,3);nouns.forEach(w=>{s(w).articleWrong=1;s(w).articleNeedsReview=true});s(nouns[1]).articleNeedsReview=false;hiddenWords.add(key(nouns[2]));s(nouns[0]).streak=2;globalThis.oldCycle=JSON.stringify(cycle);globalThis.oldCorrect=s(nouns[0]).correct;document.getElementById("mode").value="articleReview"');
 assert.equal(h.run('articleReviewPool().length'),1);h.el('startBtn').onclick();assert.equal(h.run('articleQuestion.review'),true);assert.equal(h.run('s(nouns[0]).pendingArticle'),undefined);
 h.run('answerArticle(nouns[0].article);answerArticle(nouns[0].article);acknowledgeArticle()');assert.equal(h.run('articleReviewPool().length'),0);assert.equal(h.run('s(nouns[0]).articleCorrect'),1);assert.equal(h.run('s(nouns[0]).articleWrong'),1);assert.equal(h.run('s(nouns[0]).streak'),2);assert.equal(h.run('s(nouns[0]).correct===oldCorrect&&JSON.stringify(cycle)===oldCycle'),true);assert.equal(h.el('articleReviewResume').hidden,true);
});
test('wrong article practice retains error and rotates through eligible nouns before repeating',()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.nouns=data.filter(w=>w.type==="noun").slice(0,2);nouns.forEach(w=>{s(w).articleWrong=1;s(w).articleNeedsReview=true});renderArticleReview();globalThis.first=articleQuestion.w;answerArticle(first.article==="der"?"das":"der");acknowledgeArticle()');
 assert.equal(h.run('articleQuestion.w!==first'),true);assert.equal(h.run('s(first).articleNeedsReview'),true);assert.equal(h.run('s(first).articleWrong'),2);h.run('closeArticleReview()');assert.equal(h.run('articleQuestion'),null);assert.equal(h.run('nouns.some(w=>s(w).pendingArticle)'),false);
});
