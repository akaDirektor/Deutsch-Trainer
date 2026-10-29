/* Pure state helpers shared by the browser and regression tests. */
(function(root){
 const clone=x=>JSON.parse(JSON.stringify(x));
 function customWord(value){
  const types=['noun','verb','adjective','adverb','phrase','preposition'];
  if(!value||typeof value!=='object'||Array.isArray(value)||!types.includes(value.type))throw Error('Вкажи частину мови');
  const result={};
  for(const [name,max] of [['de',200],['uk',500],['plural',200],['praeteritum',200],['perfekt',200],['example',3000]]){
   if(value[name]!=null&&typeof value[name]!=='string')throw Error('Некоректне поле '+name);
   const text=(value[name]||'').trim();if(text.length>max)throw Error('Завелике поле '+name);if(text)result[name]=text;
  }
  if(!result.de||!result.uk)throw Error('Потрібні слово й український переклад');
  result.type=value.type;result.article='';
  if(value.type==='noun'){const article=/^(der|die|das)\s+/i.exec(result.de);if(!article)throw Error('Додай артикль der, die або das перед іменником');result.article=article[1].toLowerCase();}
  if(typeof value.addedAt!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value.addedAt)||!Number.isFinite(Date.parse(value.addedAt+'T12:00:00Z')))throw Error('Некоректна дата слова');
  result.addedAt=value.addedAt;
  if(value.sources!=null){
   if(!Array.isArray(value.sources)||value.sources.length>3||value.sources.some(s=>!s||!['PONS','Wiktionary'].includes(s.provider)||typeof s.url!=='string'||s.url.length>1200||!/^https:\/\/(?:en\.pons\.com|de\.wiktionary\.org)\//.test(s.url)))throw Error('Некоректне джерело слова');
   result.sources=clone(value.sources);
  }
  if(value.translationOrigin!=null){if(!['user','Wiktionary','PONS'].includes(value.translationOrigin))throw Error('Некоректне походження перекладу');result.translationOrigin=value.translationOrigin;}

  if(value.approvedBy!=='user')throw Error('Потрібне підтвердження користувача');result.approvedBy='user';
  return result;
 }
 function lessonMemberships(value=[]){
  if(!Array.isArray(value)||value.length>38)throw Error('Некоректна прив’язка до уроку');
  const limits={b1plus:7,b2:12},result=[],seen=new Set();
  for(const item of value){
   if(!item||typeof item!=='object'||!Object.prototype.hasOwnProperty.call(limits,item.book)||typeof item.lesson!=='string'||!/^\d{1,2}$/.test(item.lesson)||String(Number(item.lesson))!==item.lesson||Number(item.lesson)<1||Number(item.lesson)>limits[item.book])throw Error('Некоректна прив’язка до уроку');
   const id=item.book+':'+item.lesson;if(!seen.has(id)){seen.add(id);result.push({book:item.book,lesson:item.lesson});}
  }
  return result;
 }
 const translationKey=text=>text.normalize('NFC').toLocaleLowerCase('uk').replace(/[’‘ʼ]/g,"'").replace(/\s+/g,' ').trim();
 function translationList(value,limit,message){
  if(!Array.isArray(value)||value.length>limit||value.some(t=>typeof t!=='string'||!t.trim()||t.length>200||/[\u0000-\u001f]/.test(t)))throw Error(message);
  const seen=new Set();return value.map(t=>t.trim()).filter(t=>{const k=translationKey(t);if(seen.has(k))return false;seen.add(k);return true});
 }
 function additionalTranslations(value=[]){return translationList(value,10,'Додатковий переклад: до 10 варіантів, кожен до 200 символів.');}
 function translationVariants(value){
  const variants=translationList(value,20,'Переклад: до 20 варіантів, кожен до 200 символів.');if(!variants.length)throw Error('Залиши хоча б один варіант перекладу.');return variants;
 }
 // New exercise counters are additive metadata; legacy fields remain unchanged.
 function learning(st={}){
  if(st.learningV2){validateLearning(st.learningV2);const v={...st.learningV2};return {...v,ready:v.matchingCorrect>=3,learned:v.matchingCorrect>=3&&v.choiceCorrect>=2&&v.writingCorrect>=2};}
  const v={version:2,matchingCorrect:st.mastered?3:Math.min(3,st.streak||0),matchingWrong:0,choiceCorrect:0,choiceWrong:0,writingCorrect:st.recallCorrect||0,writingWrong:st.recallWrong||0};
  return {...v,ready:v.matchingCorrect>=3,learned:false};
 }
 function validateLearning(v){
  if(!v||typeof v!=='object'||Array.isArray(v)||v.version!==2)throw Error('Некоректний облік етапів навчання');
  for(const k of ['matchingCorrect','matchingWrong','choiceCorrect','choiceWrong','writingCorrect','writingWrong'])if(!Number.isSafeInteger(v[k])||v[k]<0)throw Error('Некоректний лічильник етапу '+k);
 }
 function recordLearning(st,kind,correct){
  if(!['matching','choice','writing'].includes(kind)||typeof correct!=='boolean')throw Error('Невідомий тип вправи');
  const v=learning(st);if(kind==='choice'&&!v.ready||kind==='writing'&&(!v.ready||v.choiceCorrect<2))throw Error('Спочатку заверши попередній етап');
  delete v.ready;delete v.learned;const field=kind+(correct?'Correct':'Wrong');if(v[field]>=Number.MAX_SAFE_INTEGER)throw Error('Завеликий лічильник');v[field]++;return v;
 }
 function germanWritingForms(text){
  const clean=s=>s.replace(/\+\s*(?:Akk|Dat|Gen|Nom)\.?/gi,' ').replace(/\b(?:etw|jdn|jdm|jmdn|jmdm)\./g,' ').replace(/\s+/g,' ').trim();
  return [...new Set([text,clean(text.replace(/\([^)]*\)/g,' ')),clean(text.replace(/[()]/g,' '))].filter(Boolean))];
 }
 function writtenKey(text){return String(text).normalize('NFC').toLocaleLowerCase('de').replace(/[’‘ʼ]/g,"'").replace(/[·;|]/g,' ').replace(/\s+/g,' ').replace(/[.!?]+$/,'').trim();}
 function writtenMatches(text,variants){const typed=writtenKey(text);return !!typed&&variants.some(answer=>writtenKey(answer)===typed);}
 function vocabulary(seed,stats){
  const result=[...seed],keys=new Set(seed.map(w=>w.de.toLowerCase().trim()));
  for(const [storedKey,st] of Object.entries(stats))if(st.customWord){
   const w=customWord(st.customWord),k=w.de.toLowerCase().trim();
   if(k!==storedKey)throw Error('Ключ власного слова не збігається зі статистикою');
   if(!keys.has(k)){result.push(w);keys.add(k);}
  }
  return result;
 }
 function vocabularyReport(corpus,stats,hidden,runtime=vocabulary(corpus,stats)){
  const key=w=>w.de.toLowerCase().trim(),corpusKeys=new Set(corpus.map(key)),runtimeKeys=new Set(runtime.map(key));
  const hiddenKeys=new Set(hidden),personalKeys=new Set(Object.entries(stats).filter(([,st])=>st.customWord).map(([k])=>k));
  return {
   corpusRecords:corpus.length,corpusUnique:corpusKeys.size,corpusDuplicates:corpus.length-corpusKeys.size,
   runtimeRecords:runtime.length,runtimeUnique:runtimeKeys.size,runtimeDuplicates:runtime.length-runtimeKeys.size,
   personalOnly:[...personalKeys].filter(k=>!corpusKeys.has(k)),personalInCorpus:[...personalKeys].filter(k=>corpusKeys.has(k)),
   hiddenPresent:[...hiddenKeys].filter(k=>runtimeKeys.has(k)),hiddenAbsent:[...hiddenKeys].filter(k=>!runtimeKeys.has(k)),
   active:[...runtimeKeys].filter(k=>!hiddenKeys.has(k)).length,
   corpusMissing:[...corpusKeys].filter(k=>!runtimeKeys.has(k)),
   runtimeOnly:[...runtimeKeys].filter(k=>!corpusKeys.has(k)),
   unexplainedRuntime:[...runtimeKeys].filter(k=>!corpusKeys.has(k)&&!personalKeys.has(k)),
   progressOnly:[...Object.keys(stats)].filter(k=>!runtimeKeys.has(k))
  };
 }
 function validate(x){
  if(!x||x.schema!==1||!x.stats||typeof x.stats!=='object'||Array.isArray(x.stats)||!Array.isArray(x.hidden)||!x.cycle||!Array.isArray(x.cycle.seen))throw Error('Невідомий формат прогресу. Оригінал збережено.');
  if(x.hidden.some(k=>typeof k!=='string')||x.cycle.seen.some(k=>typeof k!=='string'))throw Error('Некоректні ключі слів');
  for(const [storedKey,st] of Object.entries(x.stats)){
   if(!st||typeof st!=='object'||Array.isArray(st))throw Error('Некоректна статистика');
   if(st.learningV2!=null)validateLearning(st.learningV2);
   if(Object.prototype.hasOwnProperty.call(st,'translationVariants'))translationVariants(st.translationVariants);
   if(st.additionalTranslations!=null)additionalTranslations(st.additionalTranslations);
   if(st.lessonMemberships!=null)lessonMemberships(st.lessonMemberships);
   if(st.customWord&&customWord(st.customWord).de.toLowerCase().trim()!==storedKey)throw Error('Ключ власного слова не збігається зі статистикою');
   for(const k of ['correct','wrong','streak','recallCorrect','recallWrong','verbWriteCorrect','verbWriteWrong','articleCorrect','articleWrong','contextCorrect','contextWrong','contextStreak'])if(st[k]!=null&&(!Number.isSafeInteger(st[k])||st[k]<0))throw Error('Некоректний лічильник '+k);
   for(const field of ['pendingArticle','articleNeedsReview'])if(st[field]!=null&&typeof st[field]!=='boolean')throw Error('Некоректний стан артикля');
   if(st.workedDays!=null&&(!Array.isArray(st.workedDays)||st.workedDays.length>366||new Set(st.workedDays).size!==st.workedDays.length||st.workedDays.some(day=>typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day+'T12:00:00Z'))||new Date(day+'T12:00:00Z').toISOString().slice(0,10)!==day)))throw Error('Некоректна історія роботи зі словом');
   if(st.translationFeedback!=null){const f=st.translationFeedback;if(f.reportId!=null&&(typeof f.reportId!=='string'||!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(f.reportId)))throw Error('Некоректний номер зауваження');if(f.delivery!=null&&!['queued','sent'].includes(f.delivery))throw Error('Некоректний стан надсилання');if(typeof f!=='object'||Array.isArray(f)||typeof f.translation!=='string'||f.translation.length>4000||typeof f.reason!=='string'||f.reason.length>600||typeof f.suggestion!=='string'||f.suggestion.length>200||f.status!=='draft'||typeof f.updatedAt!=='string'||f.updatedAt.length>40||!Number.isFinite(Date.parse(f.updatedAt)))throw Error('Некоректне зауваження до перекладу');}
  }
  if(x.cycle.scopes){
   if(typeof x.cycle.scopes!=='object'||Array.isArray(x.cycle.scopes))throw Error('Некоректні цикли');
   for(const value of Object.values(x.cycle.scopes))if(!value||!Array.isArray(value.seen)||value.seen.some(k=>typeof k!=='string'))throw Error('Некоректний цикл');
  }
  return clone(x);
 }
 function unseen(cycle,words,key){
  const seen=new Set(cycle.seen);let p=words.filter(w=>!seen.has(key(w)));
  if(!p.length&&words.length){cycle.seen=[];cycle.number=(cycle.number||0)+1;p=words;}
  return p;
 }
 root.Progress={germanWritingForms,learning,recordLearning,validateLearning,writtenKey,writtenMatches,validate,unseen,clone,customWord,lessonMemberships,additionalTranslations,translationVariants,translationKey,vocabulary,vocabularyReport};
})(typeof window==='undefined'?globalThis:window);
