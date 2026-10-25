/* Context exercise helpers. Extract literal attested spans; never conjugate or rewrite examples. */
(function(root){
 const key=w=>w.de.toLowerCase().trim(),norm=s=>String(s).normalize('NFC').toLocaleLowerCase('de').replace(/\s+/g,' ').trim();
 const letters=/[\p{L}\p{N}]/u,escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 function bare(s){return s.replace(/\([^)]*\)/g,' ').replace(/\+\s*(?:Akk|Dat|Gen|Nom)\.?/gi,' ').replace(/\b(?:etw|jdn|jdm|jmdn|jmdm)\./g,' ').replace(/\s+/g,' ').trim()}
 function candidates(w,forms={}){
  const base=bare(w.de).replace(/&/g,'und'),result=[];
  const add=(text,kind)=>{text=String(text||'').trim();if(text.length>=2&&!/[|/{}]/.test(text)&&!result.some(x=>norm(x.text)===norm(text)))result.push({text,kind})};
  const noun=text=>{text=text.replace(/^(der|die|das)\s+/i,'');add(text,'noun');if(!text.includes(' ')){for(const ending of ['s','es','n','en','r'])add(text+ending,'noun')}};
  const adjective=text=>{add(text,'adjective');for(const ending of ['e','en','em','er','es','ere','eren','erem','erer','eres','ste','sten'])add(text+ending,'adjective')};
  if(w.type==='noun'){
   noun(base);if(w.plural&&!/^[-–]/.test(w.plural))noun(bare(w.plural));
  }else{
   add(base,w.type==='verb'?'verb:infinitive':w.type==='preposition'?'phrase':w.type||'phrase');
   if(w.type==='adjective')adjective(base);
   const stop=new Set(['sich','sein','haben','einen','einem','einer','eines','einen','einem','etwas','jemand','jemanden','jemandem','durch','gegen','unter','über','nach','ohne']);
   const tokens=base.split(/\s+/),verbs=tokens.filter(t=>/^[a-zäöüß]+(?:en|ern|eln)$/.test(t)&&(!stop.has(t)||w.type==='verb'));
   for(const lemma of verbs){
    add(lemma,'verb:infinitive');
    const stems=[lemma.replace(/(?:en|n)$/,'')];
    const particle=/^(zusammen|zurück|weiter|wieder|statt|teil|frei|fest|fort|nach|vor|weg|mit|aus|ein|auf|ab|an|zu)(.+(?:en|ern|eln))$/.exec(lemma);
    if(particle)stems.push(particle[2].replace(/(?:en|n)$/,''));
    for(const stem of stems){
     // Recognition patterns only: a candidate is used solely if it literally occurs in the source sentence.
     const variants=new Set([stem,stem.replace('a','ä'),stem.replace('au','äu'),stem.replace('e','i'),stem.replace('e','ie')]);
     for(const v of variants)for(const ending of ['e','st','t','en','et','est'])add(v+ending,'verb:present');
     if(stem.endsWith('el')){add(stem.slice(0,-2)+'le','verb:present')}
    }
   }
   if(w.type==='phrase'||w.type==='preposition'){
    // Nominal/adjectival part of a stored multiword construction can be its gap.
    for(const token of tokens)if(token.length>=4&&!stop.has(token)&&!/^(Akk|Dat|Gen|Nom)\.?$/.test(token)){
     if(/^[A-ZÄÖÜ]/.test(token))noun(token);else if(!verbs.includes(token))adjective(token);
    }
   }
   const past=w.praeteritum||forms.praeteritum||'',perfect=w.perfekt||forms.perfekt||'';
   for(const variant of past.split(/\s*\/\s*/)){const token=variant.trim().split(/\s+/)[0];if(token&&!/^(?:ich|er|sie|es|wir|ihr|du|sich)$/.test(token))add(token,'verb:past')}
   for(const variant of perfect.split(/\s*\/\s*/)){const tokens=variant.trim().split(/\s+/);if(tokens.length>1){const token=tokens[tokens.length-1];if(!/^(?:sich|an|auf|aus|bei|in|mit|von|vor|zu)$/.test(token))add(token,'verb:participle')}}
  }
  return result.sort((a,b)=>b.text.length-a.text.length);
 }
 function cards(w,supplement=[],forms={},reviewed=root.CONTEXT_SPANS||{}){
  const sentences=w.example?[w.example]:supplement,output=[];
  for(const sentence of sentences||[]){
   if(typeof sentence!=='string'||sentence.length<12||sentence.length>1200)continue;
   const exact=reviewed[key(w)];
   if(exact&&exact.sentence===sentence&&sentence.slice(exact.start,exact.start+exact.answer.length)===exact.answer){output.push({key:key(w),word:w,kind:exact.kind,answer:exact.answer,sentence,before:sentence.slice(0,exact.start),after:sentence.slice(exact.start+exact.answer.length),start:exact.start,source:w.example?'stored':'authored'});continue;}
   for(const candidate of candidates(w,forms)){
    const pattern=new RegExp(escape(candidate.text).replace(/\s+/g,'\\s+'),'giu');let m,found=[];
    while((m=pattern.exec(sentence))){const start=m.index,end=start+m[0].length;if((!start||!letters.test(sentence[start-1]))&&(end===sentence.length||!letters.test(sentence[end])))found.push({start,end,text:m[0]})}
    if(found.length!==1)continue;
    const match=found[0];output.push({key:key(w),word:w,kind:candidate.kind,answer:match.text,sentence,before:sentence.slice(0,match.start),after:sentence.slice(match.end),start:match.start,source:w.example?'stored':'authored'});break;
   }
  }
  return output;
 }
 const ukCache=new WeakMap();
 function ukTokens(w){const old=ukCache.get(w);if(old?.uk===w.uk)return old.tokens;const tokens=new Set(w.uk.toLocaleLowerCase('uk').split(/[^\p{L}]+/u).filter(t=>t.length>=4).map(t=>t.slice(0,5)));ukCache.set(w,{uk:w.uk,tokens});return tokens}
 function alternatives(card,inventory,synonyms={}){
  const result=[],seen=new Set([norm(card.answer)]),sentence=norm(card.sentence),roots=ukTokens(card.word),entry=synonyms[card.key],known=new Set((entry?.terms||[]).map(norm));
  for(const other of inventory){
   if(other.key===card.key||other.kind!==card.kind||seen.has(norm(other.answer)))continue;
   if(card.kind==='noun'&&card.word.article&&other.word.article!==card.word.article)continue;
   if(norm(bare(other.word.de))===norm(bare(card.word.de)))continue;
   if(known.has(norm(bare(other.word.de)))||known.has(norm(other.answer))||(synonyms[other.key]?.terms||[]).some(t=>norm(t)===norm(bare(card.word.de))))continue;
   if([...ukTokens(other.word)].some(t=>roots.has(t)))continue;
   // A distractor already present in the sentence creates an avoidable cue.
   if(sentence.includes(norm(other.answer)))continue;
   const text=card.start===0?other.answer[0].toLocaleUpperCase('de')+other.answer.slice(1):other.answer;
   if(seen.has(norm(text)))continue;seen.add(norm(text));result.push(text);
  }
  return result;
 }
 root.ContextPractice={cards,candidates,alternatives,norm};
})(typeof window==='undefined'?globalThis:window);
