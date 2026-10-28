const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function harness(){
 const elements=new Map(),timers=[],storage=new Map();
 function el(id){if(!elements.has(id))elements.set(id,{id,style:{},value:id==='mode'?'translation':id==='focus'?'all':'',innerHTML:'',textContent:'',dataset:{},classList:{items:new Set(['training','recallTraining','verbWriteTraining','articleReviewTraining','contextTraining','matchExample'].includes(id)?['hidden']:[]),add(...x){x.forEach(v=>this.items.add(v))},remove(...x){x.forEach(v=>this.items.delete(v))},contains(x){return this.items.has(x)},toggle(){}},children:[],listeners:{},appendChild(child){this.children.push(child)},addEventListener(type,fn){this.listeners[type]=fn},setAttribute(name,value){this[name]=value},focus(){},scrollIntoView(){}});return elements.get(id)}
 const ctx=vm.createContext({crypto:require('node:crypto').webcrypto,console,Date,Math,Set,JSON,Map,window:{},document:{getElementById:id=>{assert(!['prevBtn','stopBtn','nextBtn'].includes(id));return el(id)},querySelectorAll:()=>[],createElement:()=>el('card'+Math.random())},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout:fn=>timers.push(fn),clearTimeout(){},confirm:()=>true,Cloud:{save(){},init(a){ctx.adapter=a}}});
 vm.runInContext(fs.readFileSync('context-spans.js','utf8'),ctx);vm.runInContext(fs.readFileSync('context.js','utf8'),ctx);vm.runInContext(fs.readFileSync('lessons.js','utf8'),ctx);ctx.Lessons=ctx.window.Lessons;vm.runInContext(fs.readFileSync('examples.js','utf8'),ctx);vm.runInContext(fs.readFileSync('synonyms.js','utf8'),ctx);vm.runInContext(fs.readFileSync('verb-forms.js','utf8'),ctx);vm.runInContext(fs.readFileSync('progress.js','utf8'),ctx);ctx.Progress=ctx.window.Progress;
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
test('one-click feedback is sent without leaving the app and preserves vocabulary, examples, cycles and learning counters',async()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.word=data[0];openTranslationReport(word);');const before=h.run('JSON.stringify(snapshot())'),corpus=h.run('JSON.stringify(data)');
 h.el('reportReason').value='Незрозумілий переклад';h.el('reportSuggestion').value='Краще пояснення';h.ctx.Cloud.submitTranslationFeedback=async value=>{h.ctx.submitted=value;return {id:value.id,delivery:'sent'}};await h.el('translationReportForm').onsubmit({preventDefault(){}});
 assert.equal(h.run('s(word).translationFeedback.reason'),'Незрозумілий переклад');assert.equal(h.ctx.submitted.german,h.ctx.word.de);assert.equal(h.run('s(word).translationFeedback.delivery'),'sent');assert(h.el('reportStatus').textContent.includes('✓ Надіслано'));assert(!html.includes('id="reportGitHub"'));
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
 assert.equal(r.sourcePhotosReviewed,24);assert.equal(r.uniqueCorpusKeys,274);assert.equal(r.matchedHeadwordOccurrences,317);assert.equal(h.run('data.length'),JSON.parse(fs.readFileSync('tests/vocabulary-counts.json')).records);
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


test('quick add automatically fills Ukrainian, keeps LEO reflexivity, and saves one confirmed word without extra steps',async()=>{
 const h=harness();h.run('trainingLocked=false;cyclePool();markCycleSeen(data[0]);hiddenWords.add("legacy-hidden")');const before=h.run('JSON.stringify({seed,cycle,hidden:[...hiddenWords],stats})');
 h.ctx.Cloud.lookupDictionary=async()=>({ukrainian:['сподіватися'],translationSource:'MyMemory',grammar:null});h.el('newWordGerman').value='sich etwas erhoffen';h.el('newWordGerman').oninput();assert.equal(h.el('newWordLeo').hidden,false);assert(decodeURIComponent(h.el('newWordLeo').href).includes('sich etwas erhoffen'));
 await h.run('lookupNewWord()');assert.equal(h.el('newWordTranslation').value,'сподіватися');assert(h.el('newWordSuggestions').children.some(e=>e.textContent?.includes('Автоматичний переклад')));assert(h.el('newWordSuggestions').children.some(e=>e.href==='https://mymemory.translated.net/en/German/Ukrainian/sich%20etwas%20erhoffen'));h.el('newWordTranslation').value='сподіватися на щось';h.el('newWordTranslation').oninput();h.el('newWordType').value='verb';h.el('newWordType').onchange();h.el('newWordForm').onsubmit({preventDefault(){}});
 assert.equal(h.run('data.filter(w=>w.de==="sich etwas erhoffen").length'),1);assert.equal(h.run('stats["sich etwas erhoffen"].customWord.uk'),'сподіватися на щось');assert.equal(h.run('stats["sich etwas erhoffen"].customWord.translationOrigin'),'user');assert.equal(h.run('stats["sich etwas erhoffen"].translationSuggestion.provider'),'MyMemory');assert(h.run('Progress.validate(snapshot()).stats["sich etwas erhoffen"].translationSuggestion'));
 h.run('globalThis.onlyOldStats={...stats};delete onlyOldStats["sich etwas erhoffen"]');assert.equal(h.run('JSON.stringify({seed,cycle,hidden:[...hiddenWords],stats:onlyOldStats})'),before);assert.equal(h.el('newWordGerman').value,'');assert.equal(h.el('newWordLeo').hidden,true);
});
test('late lookup cannot overwrite a new word or a manual Ukrainian correction, and manual save invalidates pending results',async()=>{
 const h=harness();h.run('trainingLocked=false');let finish;h.ctx.Cloud.lookupDictionary=()=>new Promise(resolve=>finish=resolve);h.el('newWordGerman').value='erste Anfrage';h.el('newWordGerman').oninput();const old=h.run('lookupNewWord()');h.el('newWordGerman').value='zweite Anfrage';h.el('newWordGerman').oninput();finish({ukrainian:['старе'],translationSource:'MyMemory'});await old;assert.equal(h.el('newWordTranslation').value,'');
 const current=h.run('lookupNewWord()');h.el('newWordTranslation').value='мій переклад';h.el('newWordTranslation').oninput();finish({ukrainian:['автоматичне'],translationSource:'MyMemory'});await current;assert.equal(h.el('newWordTranslation').value,'мій переклад');
 h.el('newWordGerman').value='dritte Anfrage';h.el('newWordGerman').oninput();const pending=h.run('lookupNewWord()');h.el('newWordTranslation').value='власний варіант';h.el('newWordType').value='phrase';h.el('newWordType').onchange();h.el('newWordForm').onsubmit({preventDefault(){}});finish({ukrainian:['запізніле'],translationSource:'MyMemory'});await pending;assert.equal(h.el('newWordGerman').value,'');assert.equal(h.el('newWordTranslation').value,'');assert.equal(h.run('stats["dritte anfrage"].customWord.uk'),'власний варіант');
});
test('dictionary grammar supplies noun article without mandatory type selection; unavailable lookup still leaves LEO and manual add',async()=>{
 const h=harness();h.run('trainingLocked=false');h.ctx.Cloud.lookupDictionary=async()=>({ukrainian:['впевненість'],translationSource:'Wiktionary',grammar:{type:'noun',article:'die'},wiktionary:{url:'https://de.wiktionary.org/w/index.php?title=Zuversicht&oldid=123'}});h.el('newWordGerman').value='Zuversicht';h.el('newWordGerman').oninput();await h.run('lookupNewWord()');assert.equal(h.el('newWordGerman').value,'die Zuversicht');assert.equal(h.el('newWordType').value,'noun');h.el('newWordForm').onsubmit({preventDefault(){}});assert.equal(h.run('stats["die zuversicht"].customWord.article'),'die');
 h.ctx.Cloud.lookupDictionary=async()=>{throw Error('offline')};h.el('newWordGerman').value='eigene Testphrase';h.el('newWordGerman').oninput();await h.run('lookupNewWord()');assert.equal(h.el('newWordLeo').hidden,false);h.el('newWordTranslation').value='тестовий вираз';h.el('newWordType').value='phrase';h.el('newWordType').onchange();h.el('newWordForm').onsubmit({preventDefault(){}});assert(h.run('stats["eigene testphrase"].customWord'));
});

test('multiple lesson selection is a deduplicated union across all practice modes with shared hidden/mastered filtering',()=>{
 const h=harness();h.run('document.getElementById("focus").value="unmastered";hiddenWords.add("die anrede");s(data.find(w=>w.de==="erforderlich")).mastered=true');const before=h.run('JSON.stringify(snapshot())');chooseLesson(h,'b2','3,1,3,99');assert.equal(h.run('selectedLesson()'),'1,3');
 const expected=h.run('data.filter(w=>(Lessons.matches(w,"b2","1")||Lessons.matches(w,"b2","3"))&&!hiddenWords.has(key(w))&&!s(w).mastered).map(key)');assert.deepEqual(Array.from(h.run('pool().map(key)')),Array.from(expected));assert.equal(h.run('pool().length'),new Set(expected).size);assert.match(h.el('lessonStatus').textContent,/Уроки 1, 3/);assert.equal(h.run('JSON.stringify(snapshot())'),before);
 h.run('data.forEach(w=>{s(w).mastered=true;if(w.type==="noun"){s(w).articleWrong=1;s(w).articleNeedsReview=true}})');for(const fn of ['recallPool','articleReviewPool'])assert(h.run(`${fn}().every(w=>(Lessons.matches(w,"b2","1")||Lessons.matches(w,"b2","3"))&&!hiddenWords.has(key(w)))`));h.run('document.getElementById("focus").value="all";document.getElementById("mode").value="verbWrite"');assert(h.run('verbWritePool().every(w=>lessonMatches(w)&&!hiddenWords.has(key(w)))'));
});
test('multi-lesson scopes are stable in selection order and complete cycles never repeat successful shared words',()=>{
 const h=harness();h.run('trainingLocked=false;cyclePool();globalThis.shared=data.find(w=>w.de==="die Kenntnis");markCycleSeen(shared)');chooseLesson(h,'b2','3,1');const signature=h.run('cycleSignature()');chooseLesson(h,'b2','1,3');assert.equal(h.run('cycleSignature()'),signature);assert(signature.endsWith('|lesson:1,3'));assert.equal(h.run('cyclePool().some(w=>key(w)===key(shared))'),false);
 const eligible=Array.from(h.run('pool().map(key)')),seen=new Set([h.run('key(shared)')]);for(let i=0;i<Math.ceil((eligible.length-1)/5);i++){const keys=Array.from(h.run('pick5().map(key)'));for(const k of keys){assert(!seen.has(k),k);seen.add(k)}h.ctx.keys=keys;h.run('keys.forEach(k=>markCycleSeen(data.find(w=>key(w)===k)))')}
 assert.equal(seen.size,eligible.length);assert.equal(h.run('pick5().length'),5);chooseLesson(h,'all');assert.equal(h.run('cyclePool().some(w=>key(w)===key(shared))'),false);
});
test('lesson toggles remember each book during the session without touching progress, and preserve legacy single/all scopes',()=>{
 const h=harness(),before=h.run('JSON.stringify(snapshot())');chooseLesson(h,'b2','1');const one=h.run('cycleSignature()');assert(one.endsWith('|lesson:1'));h.run('toggleLesson("3")');assert.equal(h.run('selectedLesson()'),'1,3');h.run('toggleLesson("1")');assert.equal(h.run('selectedLesson()'),'3');chooseLesson(h,'b1plus','2,5');h.el('bookFilter').value='b2';h.el('bookFilter').onchange();assert.equal(h.run('selectedLesson()'),'3');h.run('toggleLesson("3")');assert.equal(h.run('selectedLesson()'),'all');assert(!h.run('cycleSignature()').includes('|lesson:'));
 chooseLesson(h,'b2','1,2,3,4,5,6,7,8,9,10,11,12');assert.equal(h.run('selectedLesson()'),'all');h.el('bookFilter').value='b1plus';h.el('bookFilter').onchange();assert.equal(h.run('selectedLesson()'),'2,5');assert.equal(h.run('JSON.stringify(snapshot())'),before);
});

test('every canonical word has a literal context gap and five distinct options without changing any stored example',()=>{
 const h=harness(),before=h.run('JSON.stringify(data)');h.run('data.forEach(w=>s(w).mastered=true)');assert.equal(h.run('contextPool().length'),h.run('data.length'));
 const cards=h.run('contextInventory().cards');for(const card of cards){assert.equal(card.before+card.answer+card.after,card.sentence);assert.equal(card.sentence.slice(card.start,card.start+card.answer.length),card.answer);assert(card.answer.length>=2);if(card.word.example){assert.equal(card.source,'stored');assert.equal(card.sentence,card.word.example);}}
 assert.equal(h.run('JSON.stringify(data)'),before);assert.equal(h.run('window.ContextPractice.cards({de:"laufen",type:"verb",uk:"бігти",example:"Die Katze schläft hier."},["Wir laufen nach Hause."]).length'),0);
});
test('context practice requires existing mastery, respects multi-lesson/hidden filters and ignores the matching-only unmastered focus',()=>{
 const h=harness();h.run('trainingLocked=false;document.getElementById("mode").value="context";document.getElementById("focus").value="unmastered"');assert.equal(h.run('contextPool().length'),0);h.run('data.forEach(w=>s(w).mastered=true);hiddenWords.add("die anrede")');chooseLesson(h,'b2','1,3');assert.equal(h.run('contextPool().length'),h.run('recallPool().length'));assert(h.run('pool().every(w=>s(w).mastered&&lessonMatches(w)&&!hiddenWords.has(key(w)))'));assert(h.run('baseCycleSignature().endsWith("|ready")'));h.run('updateStats()');assert.equal(h.el('focus').hidden,true);assert.equal(h.el('contextFocusLabel').hidden,false);
});
test('context answer records separate counters exactly once, keeps feedback visible, and never changes matching/recall mastery',()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.word=data.find(w=>w.de==="die Kenntnis");Object.assign(s(word),{correct:3,wrong:2,streak:3,mastered:true,recallCorrect:2,recallWrong:1,customMetadata:{keep:7}})');h.el('startContext').onclick();assert.equal(h.run('contextQuestion.options.length'),5);assert.equal(new Set(h.run('contextQuestion.options.map(window.ContextPractice.norm)')).size,5);assert.equal(h.el('contextNext').hidden,true);h.ctx.stale=h.run('contextQuestion');h.run('answerContext(contextQuestion.answer);answerContext(contextQuestion.answer)');assert.equal(h.run('s(word).contextCorrect'),1);assert.equal(h.run('s(word).contextStreak'),1);assert.equal(h.el('contextNext').hidden,false);assert.equal(h.run('contextQuestion.answered'),true);assert.equal(h.run('contextQuestion'),h.ctx.stale);assert(h.el('contextFeedback').textContent.includes('Правильно'));assert.equal(h.el('contextHint').open,false);
 h.el('contextNext').onclick();h.run('answerContext(stale.answer,stale);answerContext(contextQuestion.options.find(t=>t!==contextQuestion.answer))');assert.equal(h.run('s(word).contextCorrect'),1);assert.equal(h.run('s(word).contextWrong'),1);assert.equal(h.run('s(word).contextStreak'),0);assert.equal(h.run('JSON.stringify([s(word).correct,s(word).wrong,s(word).streak,s(word).mastered,s(word).recallCorrect,s(word).recallWrong,s(word).customMetadata.keep])'),'[3,2,3,true,2,1,7]');assert.equal(h.run('s(word).lastWorked'),h.run('today()'));assert.equal(h.run('dailyCoverage(today()).count'),1);
});
test('context cycles resume independently and do not repeat any answered target until the complete eligible set',()=>{
 const h=harness();h.run('trainingLocked=false;cyclePool();markCycleSeen(data[0]);globalThis.originalScope=cycle.scope;globalThis.originalSeen=[...cycle.seen];data.slice(0,7).forEach(w=>s(w).mastered=true);document.getElementById("mode").value="context";renderContext()');const count=h.run('contextPool().length'),seen=new Set();assert.equal(count,7);
 for(let i=0;i<count;i++){const k=h.run('key(contextQuestion.w)');assert(!seen.has(k));seen.add(k);h.run('answerContext(contextQuestion.answer)');h.el('contextNext').onclick();}
 assert.equal(seen.size,count);assert.equal(h.run('cycle.number'),1);assert.deepEqual(Array.from(h.run('cycle.scopes[originalScope].seen')),Array.from(h.run('originalSeen')));h.ctx.restore=h.run('Progress.clone(snapshot())');h.run('adapter.apply(restore)');assert.equal(h.run('cycle.seen.length'),0);
});
test('context distractors omit known synonyms, duplicate meanings and different noun articles',()=>{
 const h=harness();h.run(`globalThis.target={key:'der beruf',word:{de:'der Beruf',uk:'професія',article:'der',type:'noun'},kind:'noun',answer:'Beruf',sentence:'Dieser Beruf passt zu mir.',start:7};globalThis.inventory=[{key:'der job',word:{de:'der Job',uk:'робота',article:'der'},kind:'noun',answer:'Job'},{key:'die firma',word:{de:'die Firma',uk:'компанія',article:'die'},kind:'noun',answer:'Firma'},{key:'der keller',word:{de:'der Keller',uk:'підвал',article:'der'},kind:'noun',answer:'Keller'},{key:'der keller2',word:{de:'der Keller2',uk:'цоколь',article:'der'},kind:'noun',answer:'KELLER'}]`);const choices=h.run('window.ContextPractice.alternatives(target,inventory,{"der beruf":{terms:["der Job"]}})');assert.deepEqual(Array.from(choices),['Keller']);
});
test('remote apply and filter changes invalidate context questions; new counters validate and preserve legacy state',()=>{
 const h=harness();h.run('trainingLocked=false;s(data[0]).mastered=true;s(data[1]).mastered=true;document.getElementById("mode").value="context";document.getElementById("contextTraining").classList.remove("hidden");renderContext();globalThis.oldQuestion=contextQuestion');assert.equal(h.ctx.adapter.active(),true);h.ctx.remote=h.run('Progress.clone(snapshot())');h.ctx.remote.stats[h.run('key(contextQuestion.w)')].contextCorrect=10;h.run('adapter.apply(remote,{resume:true});answerContext(oldQuestion.answer,oldQuestion)');assert.equal(h.run('s(oldQuestion.w).contextCorrect'),10);h.run('cancelTraining()');assert.equal(h.run('contextQuestion'),null);assert(h.el('contextTraining').classList.contains('hidden'));
 for(const field of ['contextCorrect','contextWrong','contextStreak']){h.ctx.invalid={schema:1,stats:{legacy:{[field]:-1}},hidden:['old-hidden'],cycle:{seen:['old-seen']}};assert.throws(()=>h.run('Progress.validate(invalid)'));}
 h.ctx.good={schema:1,stats:{legacy:{correct:8,contextCorrect:2,contextWrong:1,contextStreak:2,unknownMetadata:{keep:true}}},hidden:['old-hidden'],cycle:{seen:['old-seen']}};assert.equal(JSON.stringify(h.run('Progress.validate(good)')),JSON.stringify(h.ctx.good));
});


test('hiding a current context target immediately replaces it and blocks the old answer without recording work',()=>{
 const h=harness();h.run('trainingLocked=false;data.slice(0,2).forEach(w=>s(w).mastered=true);document.getElementById("mode").value="context";renderContext();globalThis.oldQuestion=contextQuestion');const old=h.run('key(oldQuestion.w)');h.run('hideWord(oldQuestion.w);answerContext(oldQuestion.answer,oldQuestion)');assert.equal(h.run('hiddenWords.has(key(oldQuestion.w))'),true);assert.notEqual(h.run('key(contextQuestion.w)'),old);assert.equal(h.run('s(oldQuestion.w).contextCorrect'),undefined);assert.equal(h.run('s(oldQuestion.w).lastWorked'),undefined);
});

test('context hint translates the full sentence on demand, caches it, and does not record learning activity',async()=>{
 const h=harness();let calls=0,received;h.ctx.Cloud.translateSentence=async q=>{calls++;received=q;return {query:q,translation:'Це український переклад усього речення.',translationSource:'MyMemory'}};h.run('trainingLocked=false;s(data[0]).mastered=true;document.getElementById("mode").value="context";renderContext()');const before=h.run('JSON.stringify(snapshot())');assert.equal(calls,0);const word=h.el('contextHintText').textContent;await h.run('loadContextSentenceTranslation()');assert.equal(received,h.run('contextQuestion.sentence'));assert(received.includes(h.run('contextQuestion.answer')));assert.equal(h.el('contextSentenceUk').textContent,'Це український переклад усього речення.');assert.equal(h.el('contextHintText').textContent,word);assert(h.el('contextSentenceTranslationSource').textContent.includes('Автоматичний'));
 h.ctx.Cloud.translateSentence=async()=>{throw Error('offline')};await h.run('loadContextSentenceTranslation()');assert.equal(calls,1);assert.equal(h.el('contextSentenceUk').textContent,'Це український переклад усього речення.');assert.equal(h.run('JSON.parse(localStorage.getItem(contextTranslationCacheKey)).length'),1);assert.equal(h.run('JSON.stringify(snapshot())'),before);
});
test('a late sentence translation cannot appear in the next context question; failed translation can be retried',async()=>{
 const h=harness();let finish;h.ctx.Cloud.translateSentence=()=>new Promise(resolve=>finish=resolve);h.run('trainingLocked=false;data.slice(0,2).forEach(w=>s(w).mastered=true);document.getElementById("mode").value="context";renderContext();globalThis.first=contextQuestion');const pending=h.run('loadContextSentenceTranslation()');await Promise.resolve();h.run('hiddenWords.add(key(first.w));renderContext()');assert.notEqual(h.run('contextQuestion.sentence'),h.run('first.sentence'));finish({query:h.run('first.sentence'),translation:'Переклад попереднього речення.',translationSource:'MyMemory'});await pending;assert.notEqual(h.el('contextSentenceUk').textContent,'Переклад попереднього речення.');
 h.ctx.Cloud.translateSentence=async()=>{throw Error('quota')};await h.run('loadContextSentenceTranslation()');assert(h.el('contextSentenceUk').textContent.includes('недоступний'));assert(h.el('contextHintText').textContent);h.ctx.Cloud.translateSentence=async q=>({query:q,translation:'Правильне нове речення.',translationSource:'MyMemory'});await h.run('loadContextSentenceTranslation()');assert.equal(h.el('contextSentenceUk').textContent,'Правильне нове речення.');assert.equal(h.run('contextQuestion.answered'),false);
});

test('an empty search result offers adding its exact German query and immediately looks up Ukrainian without saving progress',async()=>{
 const h=harness();h.run('trainingLocked=false');const before=h.run('JSON.stringify(snapshot())');let requests=[];h.ctx.Cloud.lookupDictionary=async q=>{requests.push(q);return {ukrainian:['використовувати'],translationSource:'MyMemory',grammar:{type:'verb'},wordCheck:{verified:true,typeConfirmed:true,canonical:q}}};h.el('wordSearchInput').value='suchtestwortxyz';h.el('wordSearchInput').oninput();assert.equal(h.el('wordSearchAdd').hidden,false);assert.equal(h.el('wordSearchAdd').textContent,'＋ Додати «suchtestwortxyz»');await h.el('wordSearchAdd').onclick();assert.deepEqual(requests,['suchtestwortxyz']);assert.equal(h.el('newWordGerman').value,'suchtestwortxyz');assert.equal(h.el('newWordTranslation').value,'використовувати');assert.equal(h.run('JSON.stringify(snapshot())'),before);
 h.el('newWordForm').onsubmit({preventDefault(){}});assert.equal(h.run('data.filter(w=>w.de==="suchtestwortxyz").length'),1);assert.equal(h.el('wordSearchAdd').hidden,true);assert(h.el('wordSearchStatus').textContent.includes('Знайдено:'));h.run('globalThis.oldState=Progress.clone(snapshot());delete oldState.stats.suchtestwortxyz');assert.equal(h.run('JSON.stringify(oldState)'),before);
});
test('search-add stays hidden for empty, matching and hidden-word results; Ukrainian queries are not sent as German',()=>{
 const h=harness();h.run('trainingLocked=false');let calls=0;h.ctx.Cloud.lookupDictionary=async()=>{calls++;return {ukrainian:[]}};for(const q of ['', '   ','der Betrieb']){h.el('wordSearchInput').value=q;h.el('wordSearchInput').oninput();assert.equal(h.el('wordSearchAdd').hidden,true);}
 h.run('hiddenWords.add("der betrieb")');h.el('wordSearchInput').value='der Betrieb';h.el('wordSearchInput').oninput();assert.equal(h.el('wordSearchAdd').hidden,true);
 h.el('wordSearchInput').value='меганевідомеслово';h.el('wordSearchInput').oninput();assert.equal(h.el('wordSearchAdd').hidden,false);h.el('wordSearchAdd').onclick();assert.equal(h.el('newWordGerman').value,'');assert.equal(calls,0);assert(h.el('newWordStatus').textContent.includes('німецьке слово'));
 h.el('wordSearchInput').value='x'.repeat(151);h.el('wordSearchInput').oninput();assert.equal(h.el('wordSearchAdd').hidden,true);
});
test('stale search-add and locked profiles cannot add duplicates or invoke lookup without a ready profile',()=>{
 const h=harness();let calls=0;h.ctx.Cloud.lookupDictionary=async()=>{calls++;return {ukrainian:[]}};h.el('wordSearchInput').value='suchtestwortxyz';h.el('wordSearchInput').oninput();h.el('wordSearchInput').value='der Betrieb';h.el('wordSearchAdd').onclick();assert.equal(h.el('wordSearchAdd').hidden,true);assert.equal(calls,0);
 h.el('wordSearchInput').value='suchtestwortxyz';h.el('wordSearchInput').oninput();const before=h.run('JSON.stringify(snapshot())');h.el('wordSearchAdd').onclick();assert.equal(h.el('newWordGerman').value,'suchtestwortxyz');assert.equal(calls,0);assert.equal(h.run('JSON.stringify(snapshot())'),before);
});

test('personal lesson membership validates independently of custom word data and preserves unknown progress fields',()=>{
 const h=harness();h.ctx.valid={schema:1,stats:{legacy:{correct:8,lessonMemberships:[{book:'b1plus',lesson:'7'},{book:'b2',lesson:'12'}],unknown:{keep:1}}},hidden:['legacy-hidden'],cycle:{seen:['old-seen']}};assert.equal(JSON.stringify(h.run('Progress.validate(valid)')),JSON.stringify(h.ctx.valid));
 for(const value of [[{book:'b2',lesson:'13'}],[{book:'b1plus',lesson:'8'}],[{book:'other',lesson:'1'}],[{book:'b2',lesson:'01'}],[{book:'b2',lesson:2}],'b2']){h.ctx.invalid={schema:1,stats:{w:{lessonMemberships:value}},hidden:[],cycle:{seen:[]}};assert.throws(()=>h.run('Progress.validate(invalid)'));}
 assert.equal(h.run('Progress.lessonMemberships([{book:"b2",lesson:"3"},{book:"b2",lesson:"3"}]).length'),1);
});
test('assigned personal words participate in book/multi-lesson filters and every relevant mode with one shared progress record',()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.word=addPersonalWord({de:"testverbzuordnen",uk:"тестова дія",type:"verb",praeteritum:"testete",perfekt:"hat getestet",example:"Wir müssen die Unterlagen testverbzuordnen."},null,[{book:"b2",lesson:"3"}])');assert.equal(h.run('Lessons.memberships(word).length'),0);chooseLesson(h,'b2','3');assert(h.run('pool().some(w=>key(w)===key(word))'));chooseLesson(h,'b2','2');assert.equal(h.run('pool().some(w=>key(w)===key(word))'),false);chooseLesson(h,'unassigned');assert.equal(h.run('pool().some(w=>key(w)===key(word))'),false);chooseLesson(h,'b2','1,3');assert.equal(h.run('pool().filter(w=>key(w)===key(word)).length'),1);
 h.run('s(word).mastered=true;document.getElementById("focus").value="unmastered"');assert.equal(h.run('pool().some(w=>key(w)===key(word))'),false);assert(h.run('recallPool().some(w=>key(w)===key(word))'));h.run('document.getElementById("mode").value="context"');assert(h.run('pool().some(w=>key(w)===key(word))'));h.run('document.getElementById("mode").value="verbWrite";document.getElementById("focus").value="all"');assert(h.run('verbWritePool().some(w=>key(w)===key(word))'));
 h.run('hiddenWords.add(key(word))');assert.equal(h.run('pool().some(w=>key(w)===key(word))'),false);assert.equal(h.run('recallPool().some(w=>key(w)===key(word))'),false);h.ctx.restored=h.run('Progress.clone(snapshot())');h.run('adapter.apply(restored)');assert.equal(h.run('stats[key(word)].lessonMemberships[0].lesson'),'3');assert(h.run('hiddenWords.has(key(word))'));
});
test('new-word form suggests the current single lesson, keeps an explicit choice, and requires a lesson only after choosing a book',()=>{
 const h=harness();h.run('trainingLocked=false');chooseLesson(h,'b1plus','4');h.el('newWordGerman').value='testwortmitquelle';h.el('newWordGerman').oninput();assert.equal(h.el('newWordBook').value,'b1plus');assert.equal(h.el('newWordLesson').value,'4');h.el('newWordBook').value='b2';h.el('newWordBook').onchange();assert.equal(h.el('newWordLesson').value,'');assert.equal(h.el('newWordLesson').required,true);h.el('newWordTranslation').value='тестове слово';const before=h.run('JSON.stringify(snapshot())');h.el('newWordForm').onsubmit({preventDefault(){}});assert.equal(h.run('JSON.stringify(snapshot())'),before);assert(h.el('newWordStatus').textContent.includes('Обери урок'));
 h.el('newWordLesson').value='9';h.el('newWordType').value='phrase';h.el('newWordType').onchange();h.el('newWordForm').onsubmit({preventDefault(){}});assert.equal(h.run('stats.testwortmitquelle.lessonMemberships[0].book'),'b2');assert.equal(h.run('stats.testwortmitquelle.lessonMemberships[0].lesson'),'9');assert(h.el('newWordStatus').textContent.includes('B2 · Урок 9'));h.el('newWordGerman').value='nächstestestwort';h.el('newWordGerman').oninput();assert.equal(h.el('newWordBook').value,'b2');assert.equal(h.el('newWordLesson').value,'9');h.el('newWordBook').value='';h.el('newWordBook').onchange();assert.equal(h.el('newWordLesson').required,false);assert.equal(h.run('newWordLessonMemberships().length'),0);
});

test('saved lesson metadata survives promotion into the canonical corpus and never replaces original textbook memberships',()=>{
 const h=harness(),before=h.run('JSON.stringify(data)');h.run('globalThis.word=data.find(w=>w.de==="der Betrieb");s(word).correct=9;s(word).lessonMemberships=[{book:"b2",lesson:"12"},{book:"b1plus",lesson:"1"}]');assert.equal(h.run('wordLessonMemberships(word).length'),3);assert.equal(h.run('Lessons.memberships(word).length'),2);chooseLesson(h,'b2','12');assert.equal(h.run('pool().filter(w=>key(w)===key(word)).length'),1);assert.equal(h.run('s(word).correct'),9);assert.equal(h.run('JSON.stringify(data)'),before);
});

test('a verified noun gets dictionary capitalization and the correct article before save, even if a wrong article was typed',async()=>{
 const h=harness();h.run('trainingLocked=false');h.ctx.Cloud.lookupDictionary=async()=>({ukrainian:['пільга'],translationSource:'Wiktionary',wiktionary:{url:'https://de.wiktionary.org/w/index.php?title=Verg%C3%BCnstigung&oldid=789'},grammar:{type:'noun',article:'die'},wordCheck:{verified:true,typeConfirmed:true,canonical:'die Vergünstigung',suggestions:[]}});h.el('newWordGerman').value='der vergünstigung';h.el('newWordGerman').oninput();const before=h.run('JSON.stringify(snapshot())');await h.run('lookupNewWord()');assert.equal(h.el('newWordGerman').value,'die Vergünstigung');assert.equal(h.el('newWordType').value,'noun');assert.equal(h.el('newWordTypeField').hidden,true);assert.equal(h.run('JSON.stringify(snapshot())'),before);h.el('newWordForm').onsubmit({preventDefault(){}});assert.equal(h.run('stats["die vergünstigung"].customWord.article'),'die');
});
test('a spelling correction must be selected and rechecked; user draft examples, lesson choice and manual Ukrainian survive',async()=>{
 const h=harness();h.run('trainingLocked=false');h.ctx.Cloud.lookupDictionary=async q=>q==='vergünsigung'?{ukrainian:['знижка'],translationSource:'MyMemory',grammar:null,wordCheck:{verified:false,suggestions:[{de:'die Vergünstigung',source:'https://de.wiktionary.org/wiki/Verg%C3%BCnstigung'}]}}:{ukrainian:['пільга'],translationSource:'Wiktionary',grammar:{type:'noun',article:'die'},wiktionary:{url:'https://de.wiktionary.org/wiki/Verg%C3%BCnstigung'},wordCheck:{verified:true,typeConfirmed:true,canonical:'die Vergünstigung',suggestions:[]}};
 h.el('newWordGerman').value='vergünsigung';h.el('newWordGerman').oninput();await h.run('lookupNewWord()');const before=h.run('JSON.stringify(snapshot())');h.el('newWordForm').onsubmit({preventDefault(){}});assert.equal(h.run('JSON.stringify(snapshot())'),before);assert.equal(h.el('newWordType').value,'');h.el('newWordExample').value='Mein eigenes Beispiel bleibt exakt.';h.el('newWordTranslation').value='знижка для працівників';h.el('newWordBook').value='b2';h.el('newWordBook').onchange();h.el('newWordLesson').value='4';const button=h.el('newWordSpelling').children.find(e=>e.textContent==='Виправити: die Vergünstigung');assert(button);await button.onclick();assert.equal(h.el('newWordGerman').value,'die Vergünstigung');assert.equal(h.el('newWordTranslation').value,'знижка для працівників');assert.equal(h.el('newWordExample').value,'Mein eigenes Beispiel bleibt exakt.');assert.equal(h.el('newWordLesson').value,'4');h.el('newWordForm').onsubmit({preventDefault(){}});assert.equal(h.run('stats["die vergünstigung"].customWord.type'),'noun');assert.equal(h.run('stats["die vergünstigung"].lessonMemberships[0].lesson'),'4');assert.equal(h.run('stats["vergünsigung"]'),undefined);
});
test('unverified machine suggestions never silently save a noun as a phrase; explicit manual type still requires a noun article',async()=>{
 const h=harness();h.run('trainingLocked=false');h.ctx.Cloud.lookupDictionary=async()=>({ukrainian:['тестове слово'],translationSource:'MyMemory',grammar:null,wordCheck:{verified:false,suggestions:[]}});h.el('newWordGerman').value='unbekannteswortxyz';h.el('newWordGerman').oninput();await h.run('lookupNewWord()');const before=h.run('JSON.stringify(snapshot())');h.el('newWordForm').onsubmit({preventDefault(){}});assert.equal(h.run('JSON.stringify(snapshot())'),before);assert.equal(h.el('newWordTypeField').hidden,false);h.el('newWordType').value='noun';h.el('newWordType').onchange();h.el('newWordForm').onsubmit({preventDefault(){}});assert(h.el('newWordStatus').textContent.includes('артикль'));assert.equal(h.run('JSON.stringify(snapshot())'),before);
});

test('search shows exactly the same saved example and checked reflexive forms as exercises without changing any progress',()=>{
 const h=harness();h.run(`globalThis.w=data.find(w=>w.de.startsWith('sich ')&&(exampleVerbForms(w).praeteritum||exampleVerbForms(w).perfekt));showMatchExample(w);`);
 const before=h.run('JSON.stringify(snapshot())'),expected=h.el('matchExample').children.find(e=>e.className==='exampleVerbForms');assert(expected);
 h.el('wordSearchInput').value=h.ctx.w.de;h.el('wordSearchInput').oninput();h.el('wordSearchResults').children[0].children[0].onclick();
 const box=h.el('wordSearchDetail'),actual=box.children.find(e=>e.className==='exampleVerbForms');assert(actual);assert.equal(actual.children[0].children[1].textContent,expected.children[0].children[1].textContent);assert(box.children.some(e=>e.textContent==='LEO ↗'));assert.equal(h.run('JSON.stringify(snapshot())'),before);
});
test('new verified verbs automatically fill type, dictionary example and past forms and preserve manual edits',async()=>{
 const h=harness();h.run('trainingLocked=false');h.ctx.Cloud.lookupDictionary=async()=>({wordCheck:{verified:true,typeConfirmed:true,canonical:'sich erinnern'},grammar:{type:'verb',praeteritum:'erinnerte sich',perfekt:'hat sich erinnert'},example:'Ich erinnere mich an dich.',wiktionary:{url:'https://de.wiktionary.org/wiki/erinnern'},ukrainian:['пам’ятати'],translationSource:'Wiktionary'});
 h.el('newWordGerman').value='sich erinnern';h.el('newWordGerman').oninput();h.el('newWordExample').value='Mein Beispiel bleibt unverändert.';await h.run('lookupNewWord()');
 assert.equal(h.el('newWordType').value,'verb');assert.equal(h.el('newWordTypeField').hidden,true);assert.equal(h.el('newWordPast').value,'erinnerte sich');assert.equal(h.el('newWordPerfect').value,'hat sich erinnert');assert.equal(h.el('newWordExample').value,'Mein Beispiel bleibt unverändert.');
 h.el('newWordForm').onsubmit({preventDefault(){}});assert.equal(h.run('stats["sich erinnern"].customWord.perfekt'),'hat sich erinnert');
});
test('missing personal-word search details enrich read-only and stale replies cannot replace another word or saved example',async()=>{
 const h=harness();h.run('trainingLocked=false');let reply;h.ctx.Cloud.lookupDictionary=()=>new Promise(r=>reply=r);
 const before=h.run('JSON.stringify(snapshot())');h.run('showMatchExample({de:"sich erinnern",uk:"пам’ятати",type:"verb"},"wordSearchDetail")');await new Promise(r=>setImmediate(r));
 reply({wordCheck:{verified:true,typeConfirmed:true},grammar:{type:'verb',praeteritum:'erinnerte sich',perfekt:'hat sich erinnert'},example:'Ich erinnere mich an dich.'});await new Promise(r=>setImmediate(r));
 const box=h.el('wordSearchDetail');assert(box.innerHTML.includes('Ich erinnere mich an dich.'));assert(box.children.some(e=>e.className==='exampleVerbForms'));assert.equal(h.run('JSON.stringify(snapshot())'),before);
 h.run('showMatchExample({de:"neues Verb",uk:"тест",type:"verb"},"wordSearchDetail")');await new Promise(r=>setImmediate(r));h.run('showMatchExample(data.find(w=>w.example),"wordSearchDetail")');const current=box.innerHTML;reply({wordCheck:{verified:true,typeConfirmed:true},grammar:{type:'verb'},example:'A stale response.'});await new Promise(r=>setImmediate(r));assert.equal(box.innerHTML,current);assert.equal(h.run('JSON.stringify(snapshot())'),before);
});


test('translation choices toggle independently, track manual changes and save only the selected meanings after Add',async()=>{
 const h=harness();h.run('trainingLocked=false');h.ctx.Cloud.lookupDictionary=async()=>({ukrainian:['комітет'],translationSource:'Wiktionary',translationChoices:[{text:'комітет',provider:'Wiktionary',automatic:false},{text:'комісія',provider:'Wiktionary',automatic:false},{text:'брак',provider:'Wiktionary',automatic:true,via:'MyMemory',dictionaryTerm:'scrap'}],wordCheck:{verified:true,typeConfirmed:true,canonical:'der Ausschuss'},grammar:{type:'noun',article:'der'},wiktionary:{url:'https://de.wiktionary.org/wiki/Ausschuss'}});
 h.el('newWordGerman').value='der Ausschuss';h.el('newWordGerman').oninput();const before=h.run('JSON.stringify(snapshot())');await h.run('lookupNewWord()');const buttons=h.el('newWordChoices').children.find(e=>e.className==='translationChoices').children;
 assert.equal(buttons[0]['aria-pressed'],'true');buttons[2].onclick();assert.equal(h.el('newWordTranslation').value,'комітет; брак');assert.equal(buttons[2]['aria-pressed'],'true');buttons[0].onclick();assert.equal(h.el('newWordTranslation').value,'брак');assert.equal(h.run('JSON.stringify(snapshot())'),before);
 h.el('newWordTranslation').value='брак; дефектна продукція';h.el('newWordTranslation').oninput();buttons[1].onclick();assert.equal(h.el('newWordTranslation').value,'брак; дефектна продукція; комісія');assert.equal(h.run('newWordEvidence.origin'),'user');h.el('newWordForm').onsubmit({preventDefault(){}});assert.equal(h.run('stats["der ausschuss"].customWord.uk'),'брак; дефектна продукція; комісія');assert.equal(h.run('stats["der ausschuss"].translationSuggestion.choices.some(c=>c.automatic)'),true);assert(h.el('newWordChoices').hidden);
});
test('a new draft clears translation choices, and choices never create answers or overwrite a manual draft during a delayed lookup',async()=>{
 const h=harness();h.run('trainingLocked=false');let reply;h.ctx.Cloud.lookupDictionary=()=>new Promise(r=>reply=r);h.el('newWordGerman').value='der Ausschuss';h.el('newWordGerman').oninput();const pending=h.run('lookupNewWord()');h.el('newWordTranslation').value='мій переклад';h.el('newWordTranslation').oninput();reply({ukrainian:['комітет','комісія'],translationSource:'Wiktionary',grammar:{type:'noun',article:'der'},wordCheck:{verified:true,typeConfirmed:true,canonical:'der Ausschuss'}});await pending;assert.equal(h.el('newWordTranslation').value,'мій переклад');const before=h.run('JSON.stringify(snapshot())');h.el('newWordGerman').value='anderes';h.el('newWordGerman').oninput();assert(h.el('newWordChoices').hidden);h.run('toggleNewWordChoice("комітет")');assert.equal(h.el('newWordTranslation').value,'');assert.equal(h.run('JSON.stringify(snapshot())'),before);
});


test('confirmed noun spelling and article are prominently shown before Add, and a wrong supplied article is explained',async()=>{
 const h=harness();h.run('trainingLocked=false');h.ctx.Cloud.lookupDictionary=async()=>({ukrainian:['пільга'],translationSource:'Wiktionary',grammar:{type:'noun',article:'die'},wordCheck:{verified:true,typeConfirmed:true,canonical:'die Vergünstigung',suggestions:[]}});
 h.el('newWordGerman').value='der vergünstigung';h.el('newWordGerman').oninput();const before=h.run('JSON.stringify(snapshot())');await h.run('lookupNewWord()');const box=h.el('newWordSpelling');assert.equal(box.hidden,false);assert(box.children.some(e=>e.className==='verifiedWord'&&e.textContent==='die Vergünstigung'));assert(box.children.some(e=>e.textContent==='Артикль виправлено: der → die'));assert.equal(h.el('newWordGerman').value,'die Vergünstigung');assert.equal(h.run('JSON.stringify(snapshot())'),before);
});


test('inflected input shows selectable noun/article and verb headwords before saving; selecting the noun rechecks its spelling',async()=>{
 const h=harness();h.run('trainingLocked=false');h.ctx.Cloud.lookupDictionary=async q=>q==='verpflicht'?{ukrainian:[],wordCheck:{verified:false,reason:'inflected',suggestions:[{de:'verpflichten',type:'verb'},{de:'die Verpflichtung',type:'noun',article:'die'}]}}:{ukrainian:['зобов’язання'],translationSource:'Wiktionary',wordCheck:{verified:true,typeConfirmed:true,canonical:'die Verpflichtung',suggestions:[]},grammar:{type:'noun',article:'die'}};
 h.el('newWordGerman').value='verpflicht';h.el('newWordGerman').oninput();const before=h.run('JSON.stringify(snapshot())');await h.run('lookupNewWord()');const box=h.el('newWordSpelling');assert(box.children.some(e=>e.textContent==='Знайдено форму слова. Обери слово для додавання:'));assert(h.el('newWordAdd').disabled);const noun=box.children.find(e=>e.textContent==='Обрати: die Verpflichtung · іменник');assert(noun);await noun.onclick();assert.equal(h.el('newWordGerman').value,'die Verpflichtung');assert.equal(h.el('newWordType').value,'noun');assert.equal(h.el('newWordTranslation').value,'зобов’язання');assert(box.children.some(e=>e.className==='verifiedWord'&&e.textContent==='die Verpflichtung'));assert.equal(h.run('JSON.stringify(snapshot())'),before);
});


test('every verified headword suggestion displays its dictionary part of speech immediately without requiring manual classification',async()=>{
 const h=harness();h.run('trainingLocked=false');const suggestions=[{de:'verpflichten',type:'verb'},{de:'die Verpflichtung',type:'noun',article:'die'},{de:'verpflichtend',type:'adjective'}];h.ctx.Cloud.lookupDictionary=async()=>({ukrainian:[],wordCheck:{verified:false,reason:'inflected',suggestions}});h.el('newWordGerman').value='verpflicht';h.el('newWordGerman').oninput();const before=h.run('JSON.stringify(snapshot())');await h.run('lookupNewWord()');const text=h.el('newWordSpelling').children.map(e=>e.textContent);assert(text.includes('Обрати: verpflichten · дієслово'));assert(text.includes('Обрати: die Verpflichtung · іменник'));assert(text.includes('Обрати: verpflichtend · прикметник'));assert.equal(h.el('newWordTypeField').hidden,true);assert.equal(h.el('newWordType').value,'');assert.equal(h.run('JSON.stringify(snapshot())'),before);assert(h.el('newWordAdd').disabled);
});


test('search assigns a canonical word to another lesson without copying it or changing progress, hidden keys, examples or cycles',()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.w=data.find(w=>wordLessonMemberships(w).length);s(w).correct=9;s(w).streak=2;s(w).wrong=3;s(w).articleWrong=1;s(w).extraMetadata={keep:7};hiddenWords.add(key(w));cyclePool();markCycleSeen(w);globalThis.originalPlaces=wordLessonMemberships(w);globalThis.place=Object.entries(LessonCatalog.books).flatMap(([book,b])=>b.lessons.map(l=>({book,lesson:l.id}))).find(p=>!wordLessonMemberships(w).some(x=>x.book===p.book&&x.lesson===p.lesson));');
 const before=h.run('Progress.clone(snapshot())'),corpus=h.run('JSON.stringify(data)'),stats=h.run('Progress.clone(stats[key(w)])');h.run('showMatchExample(w,"wordSearchDetail")');assert.equal(h.el('searchLessonEditor').hidden,false);assert.equal(h.run('addWordToLesson(w,place.book,place.lesson)'),true);
 assert.equal(h.run('JSON.stringify(data)'),corpus);assert.equal(h.run('JSON.stringify(stats[key(w)])'),JSON.stringify({...stats,lessonMemberships:[h.ctx.place]}));assert.equal(h.run('JSON.stringify(snapshot().hidden)'),JSON.stringify(before.hidden));assert.equal(h.run('JSON.stringify(snapshot().cycle)'),JSON.stringify(before.cycle));assert(h.run('wordLessonMemberships(w).length===originalPlaces.length+1'));const saved=h.run('JSON.stringify(snapshot())');assert.equal(h.run('addWordToLesson(w,place.book,place.lesson)'),false);assert.equal(h.run('JSON.stringify(snapshot())'),saved);
});
test('search lesson controls use the chosen lesson, preserve an unfinished choice across detail enrichment, and update duplicate status',()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.w=data.find(w=>!wordLessonMemberships(w).length)');chooseLesson(h,'b2','4');h.run('showMatchExample(w,"wordSearchDetail")');assert.equal(h.el('searchLessonBook').value,'b2');assert.equal(h.el('searchLessonNumber').value,'4');assert.equal(h.el('searchLessonAdd').disabled,false);h.el('searchLessonNumber').value='5';h.el('searchLessonNumber').onchange();h.run('showMatchExample({...w,example:"A fetched example."},"wordSearchDetail",true)');assert.equal(h.el('searchLessonNumber').value,'5');h.el('searchLessonAdd').onclick();assert(h.el('searchLessonStatus').textContent.includes('✓ Додано до B2 · Урок 5'));assert.equal(h.el('searchLessonAdd').disabled,true);assert(h.el('searchLessonMemberships').textContent.includes('B2 · Урок 5'));
 h.el('wordSearchInput').value='another';h.el('wordSearchInput').oninput();assert.equal(h.el('searchLessonEditor').hidden,true);
});
test('lesson assignment rejects locked, invalid or stale words and rolls back an unsuccessful save',()=>{
 const h=harness(),before=h.run('JSON.stringify(snapshot())');assert.throws(()=>h.run('addWordToLesson(data[0],"b2","4")'),/Увійди/);h.run('trainingLocked=false');assert.throws(()=>h.run('addWordToLesson(data[0],"b2","13")'));assert.throws(()=>h.run('addWordToLesson({de:"absent"},"b2","4")'),/недоступне/);h.ctx.Cloud.save=()=>{throw Error('Offline cache failed')};assert.throws(()=>h.run('addWordToLesson(data.find(w=>!wordLessonMemberships(w).length),"b2","4")'),/Offline cache failed/);assert.equal(h.run('JSON.stringify(snapshot())'),before);
});


test('personal translations extend current cards and search without changing vocabulary, examples, counters, selections, hidden state or cycles',()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.w=data.find(w=>w.example);renderRound([w,data.find(x=>key(x)!==key(w))]);s(w).correct=7;s(w).wrong=2;s(w).streak=2;s(w).articleWrong=1;s(w).lessonMemberships=[{book:"b2",lesson:"4"}];s(w).legacy={keep:true};hiddenWords.add(key(w));cycle.seen=[key(w)];globalThis.card=document.getElementById("rightCol").children.find(e=>e.dataset.k===key(w));card.classList.add("done","articleMistake");globalThis.round=currentRound;globalThis.selection={w,e:card};selectedR=selection;showMatchExample(w);');
 const before=h.run('Progress.clone(snapshot())'),corpus=h.run('JSON.stringify(data)'),example=h.el('matchExample').innerHTML;assert.equal(h.run('addWordTranslation(w,"мій новий варіант")'),true);assert(h.ctx.card.textContent.includes('мій новий варіант'));assert(h.ctx.card.classList.contains('done'));assert(h.ctx.card.classList.contains('articleMistake'));assert.equal(h.run('currentRound===round&&selectedR===selection'),true);assert.equal(h.run('JSON.stringify(data)'),corpus);assert.equal(h.el('matchExample').innerHTML,example);assert(h.el('matchExample').wordMeaning.textContent.includes('мій новий варіант'));assert.equal(h.el('matchExample').wordPersonalNote.hidden,false);assert(h.run('findWords("мій новий варіант").some(x=>key(x)===key(w))'));
 h.run('globalThis.after=Progress.clone(snapshot());delete after.stats[key(w)].additionalTranslations');assert.equal(h.run('JSON.stringify(after)'),JSON.stringify(before));const saved=h.run('JSON.stringify(snapshot())');assert.equal(h.run('addWordTranslation(w,"МІЙ НОВИЙ ВАРІАНТ")'),false);assert.equal(h.run('JSON.stringify(snapshot())'),saved);
});
test('additional translations survive state restoration and are safely displayed in recall and verb writing',()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.w=data.find(w=>w.type==="verb"&&w.praeteritum&&w.perfekt);addWordTranslation(w,"мій <b>варіант</b>");globalThis.restored=Progress.clone(snapshot());adapter.apply(restored);recallWord=w;showRecallAnswer();verbWriteWord=w;showVerbWriteAnswer()');assert(h.el('recallAnswer').innerHTML.includes('мій &lt;b&gt;варіант&lt;/b&gt;'));assert(h.el('verbWriteAnswer').innerHTML.includes('мій &lt;b&gt;варіант&lt;/b&gt;'));assert.equal(h.run('stats[key(w)].customWord'),undefined);
});
test('personal translation validation and failed/locked saves preserve all original data',()=>{
 const h=harness(),before=h.run('JSON.stringify(snapshot())');assert.throws(()=>h.run('addWordTranslation(data[0],"нове")'),/Увійди/);h.run('trainingLocked=false');assert.throws(()=>h.run('addWordTranslation(data[0],"")'));assert.throws(()=>h.run('addWordTranslation({de:"missing"},"нове")'));h.ctx.Cloud.save=()=>{throw Error('Cache unavailable')};assert.throws(()=>h.run('addWordTranslation(data[0],"мій варіант")'),/Cache unavailable/);assert.equal(h.run('JSON.stringify(snapshot())'),before);
 for(const invalid of [null,'bad',[''],['x'.repeat(201)],Array(11).fill('варіант'),[1]]){h.ctx.invalid=invalid;assert.throws(()=>h.run('Progress.additionalTranslations(invalid)'));}
 h.run('globalThis.state=Progress.clone(snapshot());state.stats.orphan={correct:17,additionalTranslations:["варіант"],legacy:{keep:7}}');assert.equal(h.run('Progress.validate(state).stats.orphan.legacy.keep'),7);
});


test('saved round views refresh personal meanings and account locking closes the translation editor',()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.w=data.find(w=>w.example);renderRound([w,data.find(x=>key(x)!==key(w))]);showMatchExample(w);previousRoundState=captureRoundScreen();globalThis.meaning=previousRoundState.columns.find(c=>c.id==="matchExample").nodes.find(n=>n.className==="exampleMeaning");showMatchExample(data.find(x=>key(x)!==key(w)));addWordTranslation(w,"моя додаткова відповідь");openExtraTranslation(w,null)');assert(h.ctx.meaning.textContent.includes('моя додаткова відповідь'));assert.equal(h.el('extraTranslationDialog').open,true);h.ctx.adapter.lock(true);assert.equal(h.el('extraTranslationDialog').open,false);assert.equal(h.run('extraTranslationWord'),null);
});


test('article backdrop closes only answered questions and never changes the recorded result or closes on inside/drag clicks',()=>{
 for(const correct of [true,false]){
  const h=harness();h.run('trainingLocked=false;globalThis.word=data.find(w=>w.type==="noun");selectedL={w:word,e:document.createElement("div")};selectedR={w:word,e:document.createElement("div")};check()');const dialog=h.el('articleQuiz');dialog.getBoundingClientRect=()=>({left:100,right:300,top:100,bottom:300});const outside={target:dialog,clientX:20,clientY:20},inside={target:dialog,clientX:150,clientY:150};dialog.listeners.pointerdown(outside);dialog.listeners.click(outside);assert.equal(dialog.open,true);assert.equal(h.run('articleQuestion.answered'),false);h.run(correct?'answerArticle(word.article)':'answerArticle(word.article==="der"?"die":"der")');const saved=h.run('JSON.stringify(snapshot())');dialog.listeners.pointerdown(inside);dialog.listeners.click(inside);assert.equal(dialog.open,true);dialog.listeners.pointerdown(inside);dialog.listeners.click(outside);assert.equal(dialog.open,true);dialog.listeners.pointerdown(outside);dialog.listeners.click(outside);assert.equal(dialog.open,false);assert.equal(h.run('articleQuestion'),null);assert.equal(h.run('JSON.stringify(snapshot())'),saved);dialog.listeners.pointerdown(outside);dialog.listeners.click(outside);assert.equal(h.run('JSON.stringify(snapshot())'),saved);
 }
});


test('editing or removing original and personal meanings changes only personal metadata and refreshes solved cards and search',()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.w=data.find(w=>w.uk.includes(";")&&w.example);renderRound([w,data.find(x=>key(x)!==key(w))]);addWordTranslation(w,"прибрати мій варіант");s(w).correct=8;s(w).wrong=2;s(w).streak=2;s(w).articleWrong=1;s(w).lessonMemberships=[{book:"b2",lesson:"4"}];s(w).legacy={keep:7};hiddenWords.add(key(w));cycle.seen=[key(w)];globalThis.card=document.getElementById("rightCol").children.find(e=>e.dataset.k===key(w));card.classList.add("done");selectedR={w,e:card};showMatchExample(w);globalThis.originalVariants=wordTranslationVariants(w);');
 const before=h.run('Progress.clone(snapshot())'),corpus=h.run('JSON.stringify(data)'),round=h.run('currentRound.map(key).join()');
 assert.equal(h.run('saveWordTranslations(w,["мій змінений переклад","ще один, уточнений варіант"])'),true);assert.equal(h.ctx.card.textContent,'мій змінений переклад; ще один, уточнений варіант');assert(h.ctx.card.classList.contains('done'));assert.equal(h.run('selectedR.e===card'),true);assert.equal(h.run('currentRound.map(key).join()'),round);assert.equal(h.run('JSON.stringify(data)'),corpus);assert.equal(h.el('matchExample').wordMeaning.textContent,h.ctx.card.textContent);assert(h.run('findWords("мій змінений переклад").some(x=>key(x)===key(w))'));assert.equal(h.run('wordTranslationVariants(w).length'),2);
 h.run('globalThis.after=Progress.clone(snapshot());delete after.stats[key(w)].translationVariants');assert.equal(h.run('JSON.stringify(after)'),JSON.stringify(before));assert.equal(h.run('wordTranslation(w).includes("прибрати мій варіант")'),false);
 h.run('globalThis.restored=Progress.clone(snapshot());adapter.apply(restored)');assert.equal(h.run('wordTranslation(w)'),'мій змінений переклад; ще один, уточнений варіант');h.run('addWordTranslation(w,"новий додатковий варіант")');assert.equal(h.run('wordTranslationVariants(w).length'),3);assert.equal(h.run('wordTranslation(w).includes("прибрати мій варіант")'),false);
 h.run('saveWordTranslations(w,originalVariants)');assert.equal(h.run('wordTranslation(w).includes("прибрати мій варіант")'),true);
});
test('translation edits reject empty, invalid, locked or failed saves and never alter prior progress',()=>{
 const h=harness(),before=h.run('JSON.stringify(snapshot())');assert.throws(()=>h.run('saveWordTranslations(data[0],["варіант"])'),/Увійди/);h.run('trainingLocked=false');for(const invalid of [null,[],[''],['x'.repeat(201)],Array(21).fill('варіант'),[3]]){h.ctx.invalid=invalid;assert.throws(()=>h.run('saveWordTranslations(data[0],invalid)'));h.run('globalThis.invalidState=Progress.clone(snapshot());invalidState.stats.word={translationVariants:invalid}');assert.throws(()=>h.run('Progress.validate(invalidState)'));}
 assert.throws(()=>h.run('saveWordTranslations({de:"absent"},["варіант"])'));h.ctx.Cloud.save=()=>{throw Error('Cache failed')};assert.throws(()=>h.run('saveWordTranslations(data[0],["мій варіант"])'),/Cache failed/);assert.equal(h.run('JSON.stringify(snapshot())'),before);
});
test('edited translations are escaped in recall and verb answers and all original corpus meanings fit the editor',()=>{
 const h=harness();assert(h.run('data.every(w=>wordTranslationVariants(w).length>0)'));h.run('trainingLocked=false;globalThis.w=data.find(w=>w.type==="verb"&&w.praeteritum&&w.perfekt);saveWordTranslations(w,["мій <img src=x onerror=alert(1)> варіант"]);recallWord=w;showRecallAnswer();verbWriteWord=w;showVerbWriteAnswer()');assert(h.el('recallAnswer').innerHTML.includes('&lt;img'));assert(h.el('verbWriteAnswer').innerHTML.includes('&lt;img'));assert(!h.el('recallAnswer').innerHTML.includes('<img'));
});


test('editor retains all legacy additional meanings even when combined with corpus meanings there are more than ten',()=>{
 const h=harness();h.run('trainingLocked=false;globalThis.w=data.find(w=>w.uk.includes(";"));stats[key(w)]={correct:5,additionalTranslations:Array.from({length:10},(_,i)=>"мій варіант "+i)};globalThis.variants=wordTranslationVariants(w)');assert(h.run('variants.length>10'));assert.equal(h.run('saveWordTranslations(w,variants)'),false);h.run('saveWordTranslations(w,variants.slice(1))');assert.equal(h.run('wordTranslationVariants(w).length'),h.run('variants.length-1'));assert.equal(h.run('stats[key(w)].correct'),5);
});


test('search resolves Partizip II and past forms to their original stored verbs including reflexive and supplemental forms',()=>{
 const h=harness();h.run('globalThis.words=[{de:"schreiben",uk:"писати",type:"verb",praeteritum:"schrieb",perfekt:"hat geschrieben"},{de:"aufstehen",uk:"вставати",type:"verb",praeteritum:"stand auf",perfekt:"ist aufgestanden"},{de:"sich bewerben um + Akk.",uk:"подаватися на",type:"preposition",praeteritum:"bewarb sich",perfekt:"hat sich beworben"},{de:"sich anpassen an (+ Akk.)",uk:"пристосовуватися",type:"preposition"},{de:"testen",uk:"тестувати",type:"verb",partizipII:"getestet"}];data=words;');
 for(const [query,de] of [['geschrieben','schreiben'],['HAT GESCHRIEBEN','schreiben'],['schrieb','schreiben'],['aufgestanden','aufstehen'],['sich beworben','sich bewerben um + Akk.'],['angepasst','sich anpassen an (+ Akk.)'],['getestet','testen'],['geschrieben писати','schreiben']]){h.ctx.query=query;assert.equal(h.run('findWords(query)[0]?.de'),de,query);}
 assert.equal(h.run('findWords("gefantasiert").length'),0);assert.equal(h.run('findWords("  ").length'),0);
});
test('literal search matches remain first and form matches are unique, include hidden words and never write or mutate vocabulary/progress',()=>{
 const h=harness();h.run('globalThis.w=data.find(w=>exampleVerbForms(w).perfekt);globalThis.form=exampleVerbForms(w).perfekt.split(/\s+/).at(-1);globalThis.literal={de:form,uk:"точний запис",type:"phrase"};data=[w,literal];hiddenWords.add(key(w));s(w).correct=8;s(w).streak=2;cycle.seen=[key(w)]');const corpus=h.run('JSON.stringify(data)'),state=h.run('JSON.stringify(snapshot())');assert.equal(h.run('findWords(form)[0]===literal'),true);assert.equal(h.run('findWords(form).filter(x=>key(x)===key(w)).length'),1);h.el('wordSearchInput').value=h.ctx.form;h.el('wordSearchInput').oninput();assert.equal(h.el('wordSearchAdd').hidden,true);assert(h.el('wordSearchResults').children.some(row=>row.children[0].children[0].textContent.includes('приховане')));assert.equal(h.run('JSON.stringify(data)'),corpus);assert.equal(h.run('JSON.stringify(snapshot())'),state);
});
