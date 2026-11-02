/* Four exercise types; progress remains in the existing authenticated snapshot. */
window.StageTraining=(()=>{
 const el=id=>document.getElementById(id),names={matching:'Karten 5 × 5',choice:'Aktives Erinnern',context:'Wort im Kontext',writing:'Wort schreiben'};
 let question=null,rows=[],epoch=0,seen=new Set(),archiveOpen=false;
 const type=()=>names[el('exerciseType').value]?el('exerciseType').value:'matching';
 const reverse=()=>el('exerciseDirection').value!=='de-uk';
 function terms(w){
  const mode=el('mode').value,forms=exampleVerbForms(w);
  const target=mode==='nounPlural'?w.plural:(mode==='verbPast'||mode==='verbWrite')?[forms.praeteritum,forms.perfekt].filter(Boolean).join(' · '):wordTranslation(w);
  return reverse()?{prompt:target,answer:w.de,lang:'de'}:{prompt:w.de,answer:target,lang:mode==='translation'?'uk':'de'};
 }
 function variants(w){const t=terms(w);return reverse()?Progress.germanWritingForms(w.de):t.lang==='uk'?[t.answer,...wordTranslationVariants(w)]:[t.answer];}
 function pool(kind=type()){
  const focus=el('focus').value;
  return data.filter(w=>{
   if(!eligibleForFocus(w,'all'))return false;
   const st=stats[key(w)]||{},v=Progress.learning(st);
   if(el('mode').value==='articleReview'&&!articleReviewPool().some(x=>key(x)===key(w)))return false;
   if(focus==='learned'&&!v.learned||focus==='unmastered'&&v.learned)return false;
   if(focus==='weak'&&!((st.wrong||0)+(st.articleWrong||0)+v.choiceWrong+v.writingWrong>0||v.matchingCorrect===0))return false;
   if(kind==='matching')return focus!=='unmastered'||!v.ready;
   if(!v.ready)return false;
   if(kind==='choice')return focus!=='unmastered'||v.choiceCorrect<2;
   if(kind==='writing')return v.choiceCorrect>=2&&(focus!=='unmastered'||v.writingCorrect<2);
   return focus!=='unmastered'||(st.contextCorrect||0)<1;
  });
 }
 function label(){return names[type()]}
 function totals(words){const result={total:words.length,matching:0,choice:0,writing:0,learned:0,context:0,once:0,twice:0};for(const w of words){const v=Progress.learning(stats[key(w)]);result[v.learned?'learned':v.ready?(v.choiceCorrect>=2?'writing':'choice'):'matching']++;if(v.matchingCorrect===1)result.once++;if(v.matchingCorrect===2)result.twice++;if((stats[key(w)]?.contextCorrect||0)>=1)result.context++;}return result;}
 function renderStats(){
  const all=activeVocabulary(),selected=all.filter(lessonMatches),global=totals(all),local=totals(selected);
  el('stageGlobalSummary').textContent='Gesamter Wortschatz: '+global.total+' Wörter · gelernt '+global.learned;el('stageGlobalSummary').hidden=selectedBook()==='all';el('lessonStatus').hidden=selectedBook()==='all';
  el('stageScopeTitle').textContent=(lessonSelectionLabel()||'Gesamter Wortschatz')+' · '+local.total+' Wörter';
  const box=el('stageScopeStats');box.innerHTML='';
  for(const [name,value] of [['Karten · bis 3',local.matching],['1 von 3',local.once],['2 von 3',local.twice],['Erinnern · bis 2',local.choice],['Schreiben · bis 2',local.writing],['Gelernt',local.learned],['Kontext · einmal',local.context]]){const item=document.createElement('span');item.className='stageMetric';const caption=document.createElement('span'),number=document.createElement('strong');caption.className='stageMetricLabel';caption.textContent=({'Karten · bis 3':'Karten','Erinnern · bis 2':'Erinnern','Schreiben · bis 2':'Schreiben','Kontext · einmal':'Kontext'}[name]||name)+': ';item.setAttribute('aria-label',name+': '+value);item.title=name;number.textContent=value;item.appendChild(caption);item.appendChild(number);box.appendChild(item);}
  el('showLearnedArchive').textContent=(archiveOpen?'Schließen':'Archiv')+' · '+local.learned;el('showLearnedArchive').setAttribute('aria-expanded',String(archiveOpen));el('showLearnedArchive').setAttribute('aria-label',(archiveOpen?'Archiv gelernter Wörter schließen':'Archiv gelernter Wörter')+' · '+local.learned);
  const list=el('learnedArchive');list.hidden=!archiveOpen;list.innerHTML='';if(archiveOpen){const words=selected.filter(w=>Progress.learning(stats[key(w)]).learned);if(!words.length){const li=document.createElement('li');li.textContent='In dieser Auswahl gibt es noch keine vollständig gelernten Wörter.';list.appendChild(li);}for(const w of words){const li=document.createElement('li'),button=document.createElement('button');button.type='button';button.textContent=w.de+' — '+wordTranslation(w);button.onclick=()=>{el('wordSearchInput').value=w.de;renderSearch();showMatchExample(w,'wordSearchDetail');el('wordSearchDetail').scrollIntoView({block:'nearest'})};li.appendChild(button);list.appendChild(li);}}
 }
 function configure(){
  el('exerciseDirectionField').hidden=!['choice','writing'].includes(type());el('writingSizeField').hidden=type()!=='writing';
 }
 function cancel(){epoch++;question=null;rows=[];seen.clear();}
 function pick(words){let available=words.filter(w=>!seen.has(key(w)));if(!available.length){seen.clear();available=words;}return shuffle(available);}
 function options(w){const expected=variants(w).map(Progress.writtenKey),target=terms(w).answer,found=new Set(expected),answers=[],meanings=new Set(wordTranslationVariants(w).map(Progress.translationKey)),synonyms=new Set((exampleSynonyms(w)?.terms||[]).map(Progress.writtenKey));for(const candidate of [...shuffle(data.filter(x=>x.type===w.type)),...shuffle(data)]){if(key(candidate)===key(w)||hiddenWords.has(key(candidate)))continue;if(el('mode').value==='translation'&&(wordTranslationVariants(candidate).some(t=>meanings.has(Progress.translationKey(t)))||Progress.germanWritingForms(candidate.de).some(t=>synonyms.has(Progress.writtenKey(t)))||(exampleSynonyms(candidate)?.terms||[]).some(t=>Progress.germanWritingForms(w.de).some(v=>Progress.writtenKey(v)===Progress.writtenKey(t)))))continue;const t=terms(candidate).answer,k=Progress.writtenKey(t);if(!t||found.has(k)||variants(candidate).some(v=>expected.includes(Progress.writtenKey(v))))continue;found.add(k);answers.push(t);if(answers.length===4)break;}return answers.length===4?shuffle([target,...answers]):[];}
 function commit(w,kind,ok){
  if(trainingLocked)throw Error('Melde dich an, um das Ergebnis zu speichern.');
  const k=key(w),before=stats[k]?Progress.clone(stats[k]):null;
  try{const st=s(w);st.learningV2=Progress.recordLearning(st,kind,ok);markWorked(w);save();}catch(error){if(before)stats[k]=before;else delete stats[k];throw error;}updateStats();
 }
 function showChoice(){
  question=null;const words=pool('choice'),w=pick(words)[0],box=el('choiceOptions');box.innerHTML='';el('choiceFeedback').textContent='';el('choiceDetail').classList.add('hidden');el('choiceNext').hidden=true;
  el('choiceStatus').textContent='In dieser Auswahl: '+words.length+' · 2 richtige Antworten nötig, nicht unbedingt in Folge.';
  if(!w){el('choicePrompt').textContent='Keine Wörter für diese Stufe. Schließe zuerst 3 Zuordnungen ab oder wähle „Alle“ zum Wiederholen.';return;}
  const answers=options(w);if(answers.length!==5){el('choicePrompt').textContent='Für diese Übung werden 5 verschiedene Antwortmöglichkeiten benötigt.';return;}
  const q=question={w,answers,expected:terms(w).answer,answered:false,epoch};el('choicePrompt').textContent=terms(w).prompt;el('choicePrompt').lang=reverse()?'uk':'de';
  for(const text of answers){const b=document.createElement('button');b.type='button';b.textContent=text;b.lang=terms(w).lang;b.onclick=()=>answerChoice(text,q);box.appendChild(b);}
 }
 function answerChoice(answer,q=question){
  if(trainingLocked||!q||q!==question||q.answered||q.epoch!==epoch||type()!=='choice'||!q.answers.includes(answer))return;
  if(!pool('choice').some(w=>key(w)===key(q.w))){showChoice();return;}
  const ok=answer===q.expected;try{commit(q.w,'choice',ok)}catch(error){el('choiceFeedback').textContent=error.message;return;}q.answered=true;seen.add(key(q.w));
  for(const b of el('choiceOptions').children){b.disabled=true;if(b.textContent===q.expected)b.classList.add('correct');else if(b.textContent===answer)b.classList.add('wrong');}
  const v=Progress.learning(stats[key(q.w)]);el('choiceFeedback').textContent=(ok?'✓ Richtig':'✕ Richtig: '+q.expected)+' · '+Math.min(2,v.choiceCorrect)+' / 2';showMatchExample(q.w,'choiceDetail');el('choiceNext').hidden=false;
 }
 function showWriting(draft={}){
  rows=[];const words=pool('writing'),size=[5,10,15,20].includes(Number(el('writingSize').value))?Number(el('writingSize').value):15;
  const preferred=(draft.order||[]).map(k=>words.find(w=>key(w)===k)).filter(Boolean),keys=new Set(preferred.map(key)),chosen=[...preferred,...pick(words).filter(w=>!keys.has(key(w)))].slice(0,size),box=el('writingRows');box.innerHTML='';
  el('writingStatus').textContent=words.length?'In der Auswahl '+words.length+' Wörter · auf dieser Seite '+chosen.length+'. Jedes Wort muss zweimal richtig geschrieben werden.':'Keine Wörter zum Schreiben. Schließe zuerst 3 Zuordnungen und 2 richtige Übersetzungswahlen ab.';el('writingNext').hidden=!chosen.length;
  for(const [i,w] of chosen.entries()){
   const row=document.createElement('div');row.className='writingRow';const label=document.createElement('label');label.textContent=(i+1)+'. '+terms(w).prompt;label.htmlFor='writtenWord'+i;label.lang=reverse()&&el('mode').value==='translation'?'uk':'de';
   const input=document.createElement('input');input.id='writtenWord'+i;input.type='text';input.lang=terms(w).lang;input.autocomplete='off';input.autocapitalize='off';input.spellcheck=false;input.setAttribute('autocorrect','off');input.setAttribute('enterkeyhint','done');input.setAttribute('aria-describedby','writingFeedback'+i);input.value=draft.values?.[key(w)]||'';
   const button=document.createElement('button');button.type='button';button.textContent='Prüfen';const feedback=document.createElement('p');feedback.id='writingFeedback'+i;feedback.className='writingFeedback';feedback.setAttribute('role','status');
   const item={w,row,input,button,feedback,answered:false,epoch};rows.push(item);button.onclick=()=>answerWriting(item);input.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();answerWriting(item)}};
   row.appendChild(label);row.appendChild(input);row.appendChild(button);row.appendChild(feedback);box.appendChild(row);
  }
 }
 function answerWriting(item){
  if(trainingLocked||!rows.includes(item)||item.answered||item.epoch!==epoch||type()!=='writing')return;
  if(!item.input.value.trim()){item.feedback.textContent='Schreibe zuerst eine Antwort.';return;}
  if(!pool('writing').some(w=>key(w)===key(item.w))){item.feedback.textContent='Das Wort hat bereits die Stufe gewechselt. Lade die Übungsseite neu.';return;}
  const ok=Progress.writtenMatches(item.input.value,variants(item.w));try{commit(item.w,'writing',ok)}catch(error){item.feedback.textContent=error.message;return;}
  item.answered=true;seen.add(key(item.w));item.input.disabled=true;item.button.disabled=true;item.row.classList.add(ok?'writtenCorrect':'writtenWrong');item.feedback.textContent=(ok?'✓ Richtig':'✕ Richtig: '+terms(item.w).answer)+' · '+Math.min(2,Progress.learning(stats[key(item.w)]).writingCorrect)+' / 2';
 }
 function draft(){return {order:rows.filter(r=>!r.answered).map(r=>key(r.w)),values:Object.fromEntries(rows.filter(r=>!r.answered).map(r=>[key(r.w),r.input.value]))};}
 function resume(panel,values){if(panel==='choiceTraining')showChoice();else showWriting(values);}
 function start(){
  if(type()==='matching')return false;
  cancelTraining();el('trainingSettings').open=false;
  const panel=type()==='choice'?'choiceTraining':type()==='writing'?'writingTraining':'contextTraining';el(panel).classList.remove('hidden');if(type()==='choice')showChoice();else if(type()==='writing')showWriting();else renderContext();el(panel).scrollIntoView({behavior:'smooth',block:'start'});return true;
 }
 function init(){
  if(!el('exerciseType').value)el('exerciseType').value='matching';if(!el('exerciseDirection').value)el('exerciseDirection').value='uk-de';el('writingSize').value=typeof innerWidth==='number'&&innerWidth<600?'5':'15';
  el('exerciseType').onchange=()=>{cancelTraining();configure();updateStats()};el('exerciseDirection').onchange=()=>{cancelTraining();updateStats()};el('writingSize').onchange=()=>{cancelTraining();updateStats()};
  el('choiceNext').onclick=()=>{if(question?.answered&&!trainingLocked)showChoice()};el('writingNext').onclick=()=>{if(trainingLocked)return;if(rows.some(r=>!r.answered&&r.input.value.trim())){el('writingStatus').textContent='Es gibt ungeprüfte Antworten. Prüfe sie vor der nächsten Seite.';return;}showWriting()};el('showLearnedArchive').onclick=()=>{archiveOpen=!archiveOpen;renderStats()};configure();
 }
 return {init,start,resume,cancel,configure,pool,totals,label,renderStats,answerChoice,answerWriting,showChoice,showWriting,draft};
})();
