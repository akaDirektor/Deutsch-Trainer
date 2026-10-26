import {createLexicalLookup} from './spelling.mjs';
// No provider secret or raw provider HTML is ever returned to the browser.
export function plain(value=''){
 return String(value).replace(/<[^>]*>/g,'').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,e)=>{
  const n=e[0]==='#'?parseInt(e.slice(e[1]?.toLowerCase()==='x'?2:1),e[1]?.toLowerCase()==='x'?16:10):null;
  return n!==null?(n>0&&n<=0x10ffff?String.fromCodePoint(n):''):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[e.toLowerCase()]||'';
 }).trim().slice(0,700);
}
export function wikiEntry(data){
 const page=data?.parse,text=page?.wikitext?.['*']||'';
 const sections=text.split(/(?=^==[^=].*==\s*$)/m).filter(x=>/^==[^=].*\{\{Sprache\|Deutsch\}\}.*==/m.test(x));
 const german=sections.join('\n');
 const translations=[...german.matchAll(/\{\{Ü(?:t|xx)?\|uk\|([^|{}\n]+)(?:\|[^{}]*)?\}\}/g)].map(m=>m[1].replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,(_,a,b)=>b||a).replace(/[\u0300\u0301]/g,'').trim()).filter(s=>/[А-Яа-яІіЇїЄєҐґ]/.test(s)&&s.length<200);
 const type=german.includes('{{Wortart|Substantiv|Deutsch}}')?'noun':german.includes('{{Wortart|Verb|Deutsch}}')?'verb':german.includes('{{Wortart|Adjektiv|Deutsch}}')?'adjective':german.includes('{{Wortart|Adverb|Deutsch}}')?'adverb':'phrase';
 const genders=[...german.matchAll(/\|Genus(?:\s*\d+)?\s*=\s*([mfn])\s*(?=\n|\|)/g)].map(m=>m[1]);
 const headingGender=/^===.*\{\{Wortart\|Substantiv\|Deutsch\}\}.*\{\{([mfn])\}\}/m.exec(german)?.[1];if(!genders.length&&headingGender)genders.push(headingGender);
 const articles=[...new Set(genders.map(g=>({m:'der',f:'die',n:'das'})[g]))];
 const typeConfirmed=/\{\{Wortart\|(Substantiv|Verb|Adjektiv|Adverb|Redewendung|Wendung|Sprichwort|Präposition|Konjunktion|Interjektion)\|Deutsch\}\}/.test(german);
 return {translations:[...new Set(translations)].slice(0,3),type,typeConfirmed,german:!!german.trim(),articles,article:articles.length===1?articles[0]:'',title:page?.title||'',revision:page?.revid||null};
}
// Anonymous free endpoint only; no API key, billing, email or private user data.
export function automaticTranslation(data){
 if(Number(data?.responseStatus)!==200||data?.quotaFinished)return '';
 const text=plain(data?.responseData?.translatedText||'');
 return text.length<=500&&/[А-Яа-яІіЇїЄєҐґ]/.test(text)?text:'';
}
export function createHandler({env,fetch:request=fetch}){
 const allowed='https://akadirektor.github.io';
 const lexical=createLexicalLookup(request,wikiEntry);
 const cached=new Map(),pending=new Map();
 async function automatic(term){
  if(new TextEncoder().encode(term).length>500)return {text:'',status:'too_long'};
  const old=cached.get(term);if(old&&old.expires>Date.now())return old.value;
  if(pending.has(term))return pending.get(term);
  const work=(async()=>{try{const u=new URL('https://api.mymemory.translated.net/get');u.search=new URLSearchParams({q:term,langpair:'de|uk',mt:'1'}).toString();const r=await request(u,{signal:AbortSignal.timeout(10000)});const body=r.ok?await r.json():null;const text=automaticTranslation(body);return {text,status:text?'ok':body?.quotaFinished||Number(body?.responseStatus)===429?'quota_reached':'unavailable'};}catch{return {text:'',status:'unavailable'}}})();
  pending.set(term,work);try{const value=await work;if(cached.size>=128)cached.delete(cached.keys().next().value);cached.set(term,{value,expires:Date.now()+(value.text?1800000:60000)});return value;}finally{pending.delete(term)}
 }
 const key=name=>env(name)||'';
 const jsonKeys=name=>{try{return JSON.parse(key(name)).default||''}catch{return ''}};
 const anonymous=()=>jsonKeys('SUPABASE_PUBLISHABLE_KEYS')||key('SUPABASE_ANON_KEY');
 return async req=>{
  const origin=req.headers.get('origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origin===allowed?{'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,GET,OPTIONS'}:{})};
  const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
  if(origin&&origin!==allowed)return reply({error:'Origin not allowed'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method==='GET'&&new URL(req.url).pathname.endsWith('/health'))return reply({providers:['Wiktionary','MyMemory'],targetLanguage:'uk',paidProviders:false});
  if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  const authorization=req.headers.get('authorization');if(!authorization?.startsWith('Bearer '))return reply({error:'Увійди до профілю'},401);
  try{
   const body=await req.text();if(body.length>6000)return reply({error:'Завеликий запит'},400);
   const input=JSON.parse(body),q=input.q,kind=input.kind||'word';if(!['word','sentence'].includes(kind)||typeof q!=='string'||!q.trim()||q.length>(kind==='sentence'?1200:150)||(kind==='sentence'?/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/:/[\u0000-\u001f]/).test(q))return reply({error:'Введи слово німецькою'},400);
   const term=q.trim();
   const user=await request(key('SUPABASE_URL')+'/auth/v1/user',{headers:{apikey:anonymous(),Authorization:authorization},signal:AbortSignal.timeout(10000)});
   if(!user.ok)return reply({error:'Потрібен чинний вхід'},401);
   const membership=await request(key('SUPABASE_URL')+'/rest/v1/trainer_progress?select=user_id&limit=1',{headers:{apikey:anonymous(),Authorization:authorization},signal:AbortSignal.timeout(10000)});
   if(!membership.ok||!(await membership.json()).length)return reply({error:'Спочатку підготуй хмарний профіль'},403);
   if(kind==='sentence'){const translated=await automatic(term);return reply({query:term,translation:translated.text||null,translationSource:translated.text?'MyMemory':null,automatic:true,status:translated.status});}
   // An optional open source supplies Ukrainian candidates, never a paid translator.
   const lemma=term.replace(/^(der|die|das)\s+/i,'');
   const spelling=await lexical(term),wiki=spelling.entry;
   let ukrainian=wiki?.translations||[];
   let translationSource=ukrainian.length?'Wiktionary':null;
   let machine={text:'',status:'not_needed'};
   if(!ukrainian.length&&!spelling.suggestions.length){machine=await automatic(wiki?.de||lemma);if(machine.text){ukrainian=[machine.text];translationSource='MyMemory';}}
   const wiktionary=wiki?.title?{url:'https://de.wiktionary.org/w/index.php?title='+encodeURIComponent(wiki.title)+(wiki.revision?'&oldid='+wiki.revision:''),license:'CC BY-SA 4.0'}:null;
   const automaticUrl='https://mymemory.translated.net/en/German/Ukrainian/'+encodeURIComponent(lemma);
   // Empty legacy object keeps older clients compatible; no PONS calls or links.
   return reply({query:term,pons:{status:'not_used',entries:[],targetLanguage:'uk'},ukrainian,translationSource,translationUrl:translationSource==='Wiktionary'?wiktionary?.url:translationSource==='MyMemory'?automaticUrl:null,automatic:{status:machine.status,provider:'MyMemory',url:automaticUrl,isDictionary:false},wordCheck:{status:spelling.status,verified:!!wiki,canonical:wiki?.de||null,typeConfirmed:!!wiki?.typeConfirmed,suggestions:spelling.suggestions.map(e=>({de:e.de,type:e.type,article:e.article,articles:e.articles,source:e.source}))},grammar:wiki?{type:wiki.type,article:wiki.article,articles:wiki.articles}:null,wiktionary});
  }catch{return reply({error:'Не вдалося виконати словниковий пошук. Спробуй ще раз.'},502)}
 };
}
