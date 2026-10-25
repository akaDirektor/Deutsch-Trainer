const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function harness(){
 const elements=new Map(),timers=[],storage=new Map();
 function el(id){if(!elements.has(id))elements.set(id,{id,style:{},value:id==='mode'?'translation':id==='focus'?'all':'',innerHTML:'',textContent:'',dataset:{},classList:{items:new Set(['training','recallTraining','verbWriteTraining','articleReviewTraining','matchExample'].includes(id)?['hidden']:[]),add(...x){x.forEach(v=>this.items.add(v))},remove(...x){x.forEach(v=>this.items.delete(v))},contains(x){return this.items.has(x)},toggle(){}},children:[],listeners:{},appendChild(child){this.children.push(child)},addEventListener(type,fn){this.listeners[type]=fn},setAttribute(name,value){this[name]=value},focus(){},scrollIntoView(){}});return elements.get(id)}
 const ctx=vm.createContext({console,Date,Math,Set,JSON,Map,window:{},document:{getElementById:id=>{assert(!['prevBtn','stopBtn','nextBtn'].includes(id));return el(id)},querySelectorAll:()=>[],createElement:()=>el('card'+Math.random())},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:fn=>timers.push(fn),clearTimeout(){},confirm:()=>true,Cloud:{save(){},init(a){ctx.adapter=a}}});
 vm.runInContext(fs.readFileSync('lessons.js','utf8'),ctx);ctx.Lessons=ctx.window.Lessons;vm.runInContext(fs.readFileSync('examples.js','utf8'),ctx);vm.runInContext(fs.readFileSync('synonyms.js','utf8'),ctx);vm.runInContext(fs.readFileSync('verb-forms.js','utf8'),ctx);vm.runInContext(fs.readFileSync('progress.js','utf8'),ctx);ctx.Progress=ctx.window.Progress;
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
 const h=harness();h.run('seed.splice(10);data=seed;stats={};s(data[0]).lastWorked=today();s(data[1]).workedDays=[today()];s(data[1]).lastWorked="2026-01-01";s(data[2]).lastWorked=today();hiddenWords.add(key(data[2]));updateStats()');
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

test('personal vocabulary is restored from cloud metadata without replacing corpus or existing statistics',()=>{
 const h=harness(),before=h.run('JSON.stringify(seed)');
 h.run('globalThis.word={de:"der Testbegriff",uk:"тестове поняття",type:"noun",plural:"die Testbegriffe",addedAt:"2026-10-22",approvedBy:"user"};globalThis.state=Progress.clone(snapshot());state.stats["der testbegriff"]={correct:4,wrong:1,streak:2,customWord:word};adapter.apply(state)');
 assert.equal(h.run('data.length'),h.run('seed.length+1'));assert.equal(h.run('s(data.find(w=>w.de==="der Testbegriff")).correct'),4);assert.equal(h.run('JSON.stringify(seed)'),before);assert.equal(h.run('data.find(w=>w.de==="der Testbegriff").article'),'der');
 const backup=h.run('Progress.clone(snapshot())');h.ctx.backup=backup;h.run('adapter.apply(backup)');assert.equal(h.run('data.length'),h.run('seed.length+1'));
});
test('personal vocabulary rejects malformed nouns and mismatched keys; matching corpus always wins collisions',()=>{
 const h=harness();assert.throws(()=>h.run('Progress.customWord({de:"Testwort",uk:"слово",type:"noun",addedAt:"2026-10-22",approvedBy:"user"})'));
 assert.throws(()=>h.run('Progress.validate({schema:1,stats:{wrong:{customWord:{de:"der Testbegriff",uk:"слово",type:"noun",addedAt:"2026-10-22",approvedBy:"user"}}},hidden:[],cycle:{seen:[]}})'));
 h.run('globalThis.original=seed.find(w=>w.type==="noun");globalThis.state=Progress.clone(snapshot());state.stats[key(original)]={customWord:{...original,uk:"не замінювати",approvedBy:"user"}};adapter.apply(state)');assert.equal(h.run('data.find(w=>key(w)===key(original)).uk===original.uk'),true);
});
test('adding personal words preserves corpus, existing counters and cycle, rejects duplicates and is locked without auth',()=>{
 const h=harness();h.ctx.candidate={de:'die Testergänzung',uk:'тестове доповнення',type:'noun',example:'Dies ist eine Testergänzung.',sources:[],translationOrigin:'user'};
 assert.throws(()=>h.run('addPersonalWord(candidate)'));h.run('trainingLocked=false;cyclePool();markCycleSeen(data[0]);s(data[0]).correct=12;globalThis.oldSeed=JSON.stringify(seed);globalThis.oldCycle=JSON.stringify(cycle);addPersonalWord(candidate)');
 assert.equal(h.run('data.length'),h.run('seed.length+1'));assert.equal(h.run('s(data[0]).correct'),12);assert.equal(h.run('JSON.stringify(seed)===oldSeed&&JSON.stringify(cycle)===oldCycle'),true);assert.equal(h.run('data.at(-1).example'),h.ctx.candidate.example);assert.equal(h.run('pool().some(w=>w.de===candidate.de)'),true);assert.throws(()=>h.run('addPersonalWord(candidate)'));assert.throws(()=>h.run('addPersonalWord({...candidate,de:seed[0].de})'));
 const state=h.run('Progress.clone(snapshot())');h.ctx.restored=state;h.run('adapter.apply(restored)');assert.equal(h.run('data.length'),h.run('seed.length+1'));
});

test('every reflexive vocabulary record exposes past forms, including prepositions and phrases, without changing vocabulary or progress',()=>{
 const h=harness(),before=h.run('JSON.stringify({data,snapshot:snapshot()})');
 assert.equal(h.run("data.filter(w=>w.de.split(' ').includes('sich')).length"),140);
 assert.equal(h.run("data.filter(w=>w.de.split(' ').includes('sich')&&(!exampleVerbForms(w).praeteritum||!exampleVerbForms(w).perfekt)).length"),0);
 for(const [de,past,perfect] of [['sich halten in + Dat.','hielt sich','hat sich gehalten'],['sich auskennen mit + Dat.','kannte sich aus','hat sich ausgekannt'],['sich freuen auf (+ Akk.)','freute sich','hat sich gefreut'],['sich etw. leisten können','konnte sich etw. leisten','hat sich etw. leisten können'],['sich beraten lassen','ließ sich beraten','hat sich beraten lassen']]){
  h.ctx.de=de;assert.equal(h.run('exampleVerbForms(data.find(w=>w.de===de)).praeteritum'),past);assert.equal(h.run('exampleVerbForms(data.find(w=>w.de===de)).perfekt'),perfect);
 }
 assert.equal(h.run('exampleVerbForms({de:"sich halten in + Dat.",praeteritum:"eigene Form",perfekt:"eigene Perfektform"}).perfekt'),'eigene Perfektform');
 assert.equal(h.run('JSON.stringify({data,snapshot:snapshot()})'),before);
});
test('reflexive forms are rendered in the shared example with original sentence, sich and exact dictionary source',()=>{
 const h=harness();h.run('globalThis.word=data.find(w=>w.de==="sich halten in + Dat.");showMatchExample(word)');
 const forms=h.el('matchExample').children.find(c=>c.className==='exampleVerbForms');assert(forms);assert(forms.children.some(c=>c.children?.some(x=>x.textContent==='hielt sich')));assert(forms.children.some(c=>c.children?.some(x=>x.textContent==='hat sich gehalten')));assert(forms.children.some(c=>c.href?.startsWith('https://de.wiktionary.org/')));assert(h.el('matchExample').innerHTML.includes(h.ctx.word.example));
});

test('canonical corpus sources, runtime, hidden filtering, diagnostics and UI agree after promoting a personal word',()=>{
 const h=harness(),{loadCorpus,audit}=require('../scripts/audit-vocabulary.cjs'),root=require('node:path').resolve('.'),manifest=JSON.parse(fs.readFileSync('tests/vocabulary-counts.json'));
 const physical=loadCorpus(root);assert.equal(physical.records.length,manifest.records);assert.deepEqual(physical.counts.map(({file,records})=>({file,records})),manifest.sources);assert.deepEqual(physical.unloaded,[]);assert.deepEqual(physical.duplicates,[]);
 h.run(`globalThis.promoted=data.find(w=>w.de==='der Nebel');globalThis.restored={schema:1,stats:{[key(promoted)]:{customWord:{...promoted},correct:4,wrong:1,streak:2,lastWorked:today(),articleWrong:1}},hidden:data.slice(0,11).map(key),cycle:{seen:[key(promoted)],scopes:{all:{seen:[key(promoted)]}}}};adapter.apply(restored)`);
 const before=h.run('JSON.stringify(snapshot())');h.run('updateStats()');const report=h.run('Progress.vocabularyReport(rawSeed,stats,hiddenWords,data)');
 assert.equal(report.corpusUnique,manifest.records);assert.equal(report.personalOnly.length,0);assert.equal(report.personalInCorpus.length,1);assert.equal(report.runtimeUnique,manifest.records);assert.equal(report.hiddenPresent.length,11);assert.equal(report.active,manifest.records-11);assert.equal(report.corpusMissing.length+report.unexplainedRuntime.length,0);
 assert.equal(h.el('totalCount').textContent,report.active);assert(h.el('todayWorked').textContent.endsWith(' / '+report.active));assert(h.el('recallMasteredCount').textContent.endsWith(' / '+report.active));assert(h.el('vocabularySummary').textContent.includes('Активних: '+report.active));assert.equal(h.run('JSON.stringify(snapshot())'),before);assert.equal(h.run('data.filter(w=>key(w)===key(promoted)).length'),1);assert.equal(h.run('s(promoted).correct'),4);assert.equal(h.run('cycle.seen.includes(key(promoted))'),true);
 const cli=audit(root,h.run('snapshot()'));assert.equal(cli.active,report.active);assert.equal(cli.runtimeUnique,report.runtimeUnique);assert.deepEqual(Array.from(cli.runtimeOnly),[]);
});
test('vocabulary diagnostics distinguish approved personal entries, orphan progress and hidden keys without inventing words or deleting state',()=>{
 const h=harness();h.run(`globalThis.state=Progress.clone(snapshot());state.stats['der testbegriff']={correct:3,customWord:{de:'der Testbegriff',uk:'тестове поняття',type:'noun',addedAt:'2026-10-22',approvedBy:'user'}};state.stats['old unknown key']={correct:17};state.hidden=['der testbegriff','old unknown key',key(data[0])];adapter.apply(state)`);
 const before=h.run('JSON.stringify(snapshot())'),r=h.run('Progress.vocabularyReport(rawSeed,stats,hiddenWords,data)');
 assert.deepEqual(Array.from(r.personalOnly),['der testbegriff']);assert.deepEqual(Array.from(r.runtimeOnly),['der testbegriff']);assert.deepEqual(Array.from(r.hiddenAbsent),['old unknown key']);assert(r.progressOnly.includes('old unknown key'));assert.equal(r.hiddenPresent.length,2);assert.equal(r.active,h.run('seed.length')-1);assert.equal(h.el('totalCount').textContent,r.active);assert.equal(h.run('JSON.stringify(snapshot())'),before);
 const report=h.run('Progress.vocabularyReport(rawSeed,stats,hiddenWords,data.slice(1).concat([{de:"unexpected record"}]))');assert.equal(report.corpusMissing.length,1);assert.deepEqual(Array.from(report.unexplainedRuntime),['unexpected record']);
});

test('synonyms use exact reviewed card meanings across every vocabulary type and never change corpus or progress',()=>{
 const h=harness(),before=h.run('JSON.stringify({data,state:snapshot()})'),registry=JSON.parse(fs.readFileSync('docs/synonyms-register.json'));
 assert.equal(h.run('Object.keys(window.WORD_SYNONYMS).length'),50);assert.deepEqual(Array.from(h.run('[...new Set(Object.values(window.WORD_SYNONYMS).map(e=>e.type))].sort()')),['adjective','adverb','noun','phrase','preposition','verb']);
 for(const r of registry){h.ctx.word=r.word;assert.equal(h.run('exampleSynonyms(data.find(w=>w.de===word)).source'),r.source);assert.match(r.source,/^https:\/\/de\.wiktionary\.org\/w\/index\.php\?title=.+&oldid=\d+$/);assert(r.terms.length>0&&r.terms.length<=2);}
 assert.deepEqual(Array.from(h.run('exampleSynonyms(data.find(w=>w.de==="herstellen")).terms')),['anfertigen','produzieren']);assert.deepEqual(Array.from(h.run('exampleSynonyms(data.find(w=>w.de==="die Besprechung")).terms')),['das Meeting']);assert.deepEqual(Array.from(h.run('exampleSynonyms(data.find(w=>w.de==="sich beschweren über + Akk.")).terms')),['sich beklagen']);
 assert.equal(h.run('exampleSynonyms({...data.find(w=>w.de==="überlegen"),uk:"бути кращим",type:"adjective"})'),null);assert.equal(h.run('exampleSynonyms({de:"herstellen",uk:"встановлювати контакт",type:"verb"})'),null);assert.equal(h.run('exampleSynonyms({de:"unknown",uk:"невідоме",type:"verb"})'),null);
 assert.equal(h.run('JSON.stringify({data,state:snapshot()})'),before);
});
test('shared example renders contextual synonyms and a source beside stored sentence and verb forms without learning actions',()=>{
 for(const boxId of ['matchExample','wordSearchDetail']){
  const h=harness();h.ctx.boxId=boxId;const before=h.run('JSON.stringify(snapshot())');h.run('globalThis.word=data.find(w=>w.de==="herstellen");showMatchExample(word,boxId)');
  const box=h.el(boxId),group=box.children.find(c=>c.className==='exampleSynonyms');assert(group);assert.equal(group.children[0].textContent,'Близькі за значенням');const terms=group.children.find(c=>c.className==='synonymTerms');assert.deepEqual(terms.children.map(c=>c.textContent),['anfertigen','produzieren']);for(const link of terms.children){assert.match(link.href,/^https:\/\/dict\.leo\.org\/russisch-deutsch\//);assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');}
  assert(group.children.some(c=>c.className==='synonymSource'&&c.href.includes('oldid=')));assert(box.children.some(c=>c.className==='exampleVerbForms'));assert.equal(h.run('JSON.stringify(snapshot())'),before);
 }
 const h=harness();h.run('showMatchExample(data.find(w=>w.de==="der Nebel"))');assert(!h.el('matchExample').children.some(c=>c.className==='exampleSynonyms'));
});

function chooseLesson(h,book,lesson='all'){
 h.el('bookFilter').value=book;h.el('bookFilter').onchange();h.el('lessonFilter').value=lesson;h.el('lessonFilter').onchange();
}
test('all seven supplied B1+ pages map to existing keys only, with reviewed exceptions and shared memberships',()=>{
 const h=harness(),r=JSON.parse(fs.readFileSync('docs/b1plus-lesson-register.json')),before=h.run('JSON.stringify({data,state:snapshot()})');
 assert.equal(r.sourceOccurrences,498);assert.equal(r.matchedOccurrences,496);assert.equal(r.uniqueCorpusKeys,485);assert.equal(r.unmatched.length,2);assert.deepEqual(r.chapters.map(c=>c.number),[1,2,3,4,5,6,7]);
 assert.equal(h.run('Lessons.books.b2.lessons.length'),12);
 const corpus=new Set(h.run('data.map(key)'));for(const row of r.entries)for(const key of row.keys)assert(corpus.has(key),key);
 assert.deepEqual(Array.from(h.run('Lessons.memberships(data.find(w=>w.de==="der Betrieb")).map(p=>p.lesson)')),['1','2']);
 for(const lesson of h.ctx.Lessons.books.b1plus.lessons)assert.equal(lesson.keys.length,new Set(lesson.keys).size);
 assert.equal(h.run('Lessons.matches({de:"Recht haben"},"b1plus","4")'),false);assert.equal(h.run('Lessons.matches({de:"die Bescheinigung"},"b1plus","4")'),false);
 assert.equal(h.run('JSON.stringify({data,state:snapshot()})'),before);
});
test('book/lesson controls filter all practice modes, preserve global counters, and never classify unassigned words as B2',()=>{
 const h=harness(),before=h.run('JSON.stringify(snapshot())'),total=h.el('totalCount').textContent;chooseLesson(h,'b1plus','5');
 assert.equal(h.run('pool().length'),75);assert.equal(h.el('totalCount').textContent,total);assert.equal(h.run('JSON.stringify(snapshot())'),before);assert(h.el('lessonStatus').textContent.includes('75 слів'));
 h.run('data.forEach(w=>{s(w).mastered=true;if(w.type==="noun"){s(w).articleWrong=1;s(w).articleNeedsReview=true}})');
 for(const fn of ['pool','recallPool','articleReviewPool'])assert.equal(h.run(fn+'().every(w=>Lessons.matches(w,"b1plus","5"))'),true);
 h.run('document.getElementById("mode").value="verbWrite"');assert.equal(h.run('verbWritePool().every(w=>Lessons.matches(w,"b1plus","5")&&w.type==="verb")'),true);
 chooseLesson(h,'unassigned');assert.equal(h.run('pool().every(w=>!Lessons.memberships(w).length)'),true);chooseLesson(h,'b2');assert(h.run('pool().length')>0);assert.equal(h.run('pool().every(w=>Lessons.memberships(w).some(p=>p.book==="b2"))'),true);chooseLesson(h,'all');assert.equal(h.el('lessonFilter').disabled,true);assert.equal(h.run('selectedLesson()'),'all');
});
test('lesson cycles never repeat a successful key before all eligible lesson words and keep global-cycle exclusions',()=>{
 const h=harness();h.run('trainingLocked=false;cyclePool();globalThis.shared=data.find(w=>w.de==="der Betrieb");markCycleSeen(shared)');chooseLesson(h,'b1plus','1');
 assert.equal(h.run('cyclePool().some(w=>key(w)===key(shared))'),false);const eligible=Array.from(h.run('pool().map(key)')),seen=new Set([h.run('key(shared)')]);
 for(let i=0;i<Math.ceil((eligible.length-1)/5);i++){
  const keys=Array.from(h.run('pick5().map(key)'));for(const k of keys){assert(!seen.has(k));seen.add(k);}h.ctx.keys=keys;h.run('keys.forEach(k=>markCycleSeen(data.find(w=>key(w)===k)))');
 }
 assert.equal(seen.size,eligible.length);assert.equal(h.run('pick5().length'),5);assert.equal(h.run('cycle.number'),1);
 chooseLesson(h,'all');assert.equal(h.run('cyclePool().some(w=>key(w)===key(shared))'),false);assert.equal(h.run('cycle.seen.filter(k=>Lessons.matches({de:k},"b1plus","1")).length'),eligible.length);
});
test('three successful encounters in a lesson share mastery with all books, while learned words remain searchable and explicitly reviewable',()=>{
 const h=harness();h.run('trainingLocked=false;document.getElementById("focus").value="unmastered";typeFilter="verb"');chooseLesson(h,'b1plus','1');
 const count=h.run('pool().length');assert(count>1);const seenCycles=[];
 for(let cycle=0;cycle<3;cycle++){
  const seen=new Set();for(let i=0;i<Math.ceil(count/5);i++){
   const keys=Array.from(h.run('pick5().map(key)'));for(const k of keys){assert(!seen.has(k));seen.add(k);h.ctx.k=k;h.run('globalThis.word=data.find(w=>key(w)===k);selectedL={w:word,e:document.createElement("div")};selectedR={w:word,e:document.createElement("div")};check()');}
  }assert.equal(seen.size,count);seenCycles.push(seen);
 }
 assert.equal(h.run('pool().length'),0);assert.equal(h.run('s(word).streak'),3);assert.equal(h.run('s(word).mastered'),true);assert.match(h.run('emptyMatchingMessage()'),/пригадування/);
 chooseLesson(h,'all');assert.equal(h.run('pool().some(w=>key(w)===key(word))'),false);assert.equal(h.run('recallPool().some(w=>key(w)===key(word))'),true);assert.equal(h.run('findWords(word.de).some(w=>key(w)===key(word))'),true);h.run('document.getElementById("focus").value="all"');assert.equal(h.run('pool().some(w=>key(w)===key(word))'),true);
});
test('shared noun mastery, article results and hidden state survive lesson switching and cloud-compatible snapshot restoration',()=>{
 const h=harness();h.run('trainingLocked=false;document.getElementById("focus").value="unmastered";globalThis.word=data.find(w=>w.de==="der Betrieb");s(word).streak=2;s(word).correct=8;s(word).retainedMetadata={custom:true};hiddenWords.add(key(data.find(w=>w.de==="der Nebel")))');chooseLesson(h,'b1plus','1');h.run('cyclePool();selectedL={w:word,e:document.createElement("div")};selectedR={w:word,e:document.createElement("div")};check();answerArticle(word.article);acknowledgeArticle()');
 assert.equal(h.run('s(word).mastered'),true);assert.equal(h.run('s(word).articleCorrect'),1);const before=h.run('JSON.stringify(snapshot())'),data=h.run('JSON.stringify(data)');chooseLesson(h,'b1plus','2');assert.equal(h.run('pool().some(w=>key(w)===key(word))'),false);chooseLesson(h,'all');assert.equal(h.run('pool().some(w=>key(w)===key(word))'),false);assert.equal(h.run('JSON.stringify(snapshot())'),before);
 h.ctx.restored=h.run('Progress.clone(snapshot())');h.run('adapter.apply(restored)');assert.equal(h.run('JSON.stringify(snapshot())'),before);assert.equal(h.run('JSON.stringify(data)'),data);assert.equal(h.run('s(word).correct'),9);assert.equal(h.run('s(word).retainedMetadata.custom'),true);
});
test('default unmastered view inherits the entire legacy seen list rather than restarting the general cycle',()=>{
 const h=harness();h.run('trainingLocked=false;cycle={seen:data.slice(0,323).map(key),number:2};document.getElementById("focus").value="unmastered"');assert.equal(h.run('cyclePool().length'),h.run('data.length')-323);assert.equal(h.run('cycle.seen.length'),323);assert.equal(h.run('cycle.number'),2);assert.equal(h.run('cycle.scopes["translation|all|all|all"].seen.length'),323);
 chooseLesson(h,'b1plus','1');h.run('cyclePool()');assert.equal(h.run('cycle.scopes["translation|all|all|unmastered"].seen.length'),323);chooseLesson(h,'all');assert.equal(h.run('cyclePool().length'),h.run('data.length')-323);
});


test('all 24 B2 photos map to 12 lessons using existing keys, preserving B1 memberships and source provenance',()=>{
 const h=harness(),r=JSON.parse(fs.readFileSync('docs/b2-lesson-register.json')),b1=JSON.parse(fs.readFileSync('docs/b1plus-lesson-register.json'));
 assert.equal(r.sourcePhotosReviewed,24);assert.equal(r.uniqueCorpusKeys,271);assert.equal(r.matchedHeadwordOccurrences,313);assert.equal(h.run('data.length'),1135);
 const corpus=new Set(h.run('data.map(key)'));for(const row of r.entries)for(const k of row.keys){assert(corpus.has(k),k);assert(h.run(`Lessons.matches({de:${JSON.stringify(k)}},"b2",${JSON.stringify(String(row.lesson))})`));}
 assert.equal(new Set(r.photos.map(p=>p.photo)).size,24);
 for(let n=1;n<=12;n++){const l=h.ctx.Lessons.books.b2.lessons[n-1];assert.equal(l.id,String(n));assert(l.keys.length>0);assert.equal(l.photos.length,2);assert.equal(l.keys.length,new Set(l.keys).size);assert.equal(r.photos.filter(p=>p.lesson===n).length,2);}
 for(const [photo,lesson] of [['IMG_8576.HEIC',5],['IMG_8572.HEIC',7],['IMG_8574.HEIC',8]])assert.equal(r.photos.find(p=>p.photo===photo).lesson,lesson);
 for(const l of h.ctx.Lessons.books.b1plus.lessons){const expected=new Set(b1.entries.filter(r=>String(r.lesson)===l.id).flatMap(r=>r.keys));assert(expected.size>0);assert.deepEqual([...l.keys].sort(),[...expected].sort());}
});
test('B2 assignment preserves meaning, reflexivity and complete phrases instead of fuzzy spelling matches',()=>{
 const h=harness();for(const n of ['2','6']){assert.equal(h.run(`Lessons.matches({de:"warten"},"b2","${n}")`),false);assert.equal(h.run(`Lessons.matches({de:"eine Anlage warten"},"b2","${n}")`),true);}
 for(const [de,n] of [['kommen','5'],['sich halten in + Dat.','5'],['die Selbstständigkeit','6'],['der Betriebsrat','9'],['die Betriebsrätin','9'],['unvollständig','3'],['jdn. einstellen','7']])assert.equal(h.run(`Lessons.matches({de:${JSON.stringify(de)}},"b2",${JSON.stringify(n)})`),false,de);
});
test('B2 filters preserve hidden state and share mastery, article results, recall and global-cycle exclusions',()=>{
 const h=harness();h.run('trainingLocked=false;document.getElementById("focus").value="unmastered";globalThis.word=data.find(w=>w.de==="die Kenntnis");s(word).streak=2;s(word).correct=8;s(word).retainedMetadata={custom:true};hiddenWords.add("die anrede");cyclePool()');
 const before=h.run('JSON.stringify(snapshot())');chooseLesson(h,'b2','1');assert.equal(h.run('JSON.stringify(snapshot())'),before);assert.equal(h.run('pool().some(w=>key(w)==="die anrede")'),false);
 h.run('cyclePool();selectedL={w:word,e:document.createElement("div")};selectedR={w:word,e:document.createElement("div")};check();answerArticle(word.article);acknowledgeArticle()');assert.equal(h.run('s(word).mastered'),true);assert.equal(h.run('s(word).articleCorrect'),1);
 const mastered=h.run('JSON.stringify(snapshot())');chooseLesson(h,'b2','3');assert.equal(h.run('pool().some(w=>key(w)===key(word))'),false);chooseLesson(h,'all');assert.equal(h.run('pool().some(w=>key(w)===key(word))'),false);assert(h.run('recallPool().some(w=>key(w)===key(word))'));assert.equal(h.run('JSON.stringify(snapshot())'),mastered);assert.equal(h.run('s(word).retainedMetadata.custom'),true);
 h.run('document.getElementById("focus").value="all"');assert(h.run('pool().some(w=>key(w)===key(word))'));assert.equal(h.run('cyclePool().some(w=>key(w)===key(word))'),true); // explicit review is a separate focus scope
 h.run('document.getElementById("focus").value="unmastered"');assert.equal(h.run('cycle.seen.includes(key(word))'),false);h.run('cyclePool()');assert.equal(h.run('cycle.seen.includes(key(word))'),true);
});
