// No provider secret or raw provider HTML is ever returned to the browser.
export function plain(value=''){
 return String(value).replace(/<[^>]*>/g,'').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(_,e)=>{
  const n=e[0]==='#'?parseInt(e.slice(e[1]?.toLowerCase()==='x'?2:1),e[1]?.toLowerCase()==='x'?16:10):null;
  return n!==null?(n>0&&n<=0x10ffff?String.fromCodePoint(n):''):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[e.toLowerCase()]||'';
 }).trim().slice(0,700);
}
export function ponsEntries(data){
 const result=[];
 function hit(h){
  if(h.type==='entry_with_secondary_entries'){hit(h.primary_entry||{});(h.secondary_entries||[]).forEach(hit);return;}
  if(h.type==='translation'){result.push({source:plain(h.source),target:plain(h.target)});return;}
  for(const rom of h.roms||[])for(const group of rom.arabs||[])for(const t of group.translations||[])result.push({source:plain(t.source||rom.headword_full||rom.headword),target:plain(t.target)});
 }
 for(const direction of Array.isArray(data)?data:[])if(direction.lang==='de')(direction.hits||[]).forEach(hit);
 return result.filter(x=>x.source&&x.target).slice(0,12);
}
export function wikiEntry(data){
 const page=data?.parse,text=page?.wikitext?.['*']||'';
 const sections=text.split(/(?=^==[^=].*==\s*$)/m).filter(x=>/^==[^=].*\{\{Sprache\|Deutsch\}\}.*==/m.test(x));
 const german=sections.join('\n');
 const translations=[...german.matchAll(/\{\{Ü(?:t|xx)?\|uk\|([^|{}\n]+)(?:\|[^{}]*)?\}\}/g)].map(m=>m[1].replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,(_,a,b)=>b||a).replace(/[\u0300\u0301]/g,'').trim()).filter(s=>/[А-Яа-яІіЇїЄєҐґ]/.test(s)&&s.length<200);
 const type=german.includes('{{Wortart|Substantiv|Deutsch}}')?'noun':german.includes('{{Wortart|Verb|Deutsch}}')?'verb':german.includes('{{Wortart|Adjektiv|Deutsch}}')?'adjective':german.includes('{{Wortart|Adverb|Deutsch}}')?'adverb':'phrase';
 const genus=/\|Genus\s*=\s*([mfn])\s*(?:\n|\|)/.exec(german)?.[1];
 return {translations:[...new Set(translations)].slice(0,3),type,article:({m:'der',f:'die',n:'das'})[genus]||'',title:page?.title||'',revision:page?.revid||null};
}
export function createHandler({env,fetch:request=fetch}){
 const allowed='https://akadirektor.github.io';
 const key=name=>env(name)||'';
 const jsonKeys=name=>{try{return JSON.parse(key(name)).default||''}catch{return ''}};
 const anonymous=()=>jsonKeys('SUPABASE_PUBLISHABLE_KEYS')||key('SUPABASE_ANON_KEY');
 const service=()=>jsonKeys('SUPABASE_SECRET_KEYS')||key('SUPABASE_SERVICE_ROLE_KEY');
 const authHeaders=k=>({apikey:k,...(k.startsWith('eyJ')?{Authorization:'Bearer '+k}:{})});
 return async req=>{
  const origin=req.headers.get('origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origin===allowed?{'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,GET,OPTIONS'}:{})};
  const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
  if(origin&&origin!==allowed)return reply({error:'Origin not allowed'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method==='GET'&&new URL(req.url).pathname.endsWith('/health'))return reply({configured:Boolean(key('PONS_API_SECRET')),monthlyAppLimit:900,targetLanguage:'uk'});
  if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  const authorization=req.headers.get('authorization');if(!authorization?.startsWith('Bearer '))return reply({error:'Увійди до профілю'},401);
  try{
   const body=await req.text();if(body.length>1000)return reply({error:'Завеликий запит'},400);
   const q=JSON.parse(body).q;if(typeof q!=='string'||!q.trim()||q.length>150||/[\u0000-\u001f]/.test(q))return reply({error:'Введи слово німецькою'},400);
   const term=q.trim();
   const user=await request(key('SUPABASE_URL')+'/auth/v1/user',{headers:{apikey:anonymous(),Authorization:authorization},signal:AbortSignal.timeout(10000)});
   if(!user.ok)return reply({error:'Потрібен чинний вхід'},401);
   const membership=await request(key('SUPABASE_URL')+'/rest/v1/trainer_progress?select=user_id&limit=1',{headers:{apikey:anonymous(),Authorization:authorization},signal:AbortSignal.timeout(10000)});
   if(!membership.ok||!(await membership.json()).length)return reply({error:'Спочатку підготуй хмарний профіль'},403);
   // An optional open source supplies Ukrainian candidates, never a paid translator.
   const lemma=term.replace(/^(der|die|das)\s+/i,'');
   const wikiPromise=(async()=>{try{const u=new URL('https://de.wiktionary.org/w/api.php');u.search=new URLSearchParams({action:'parse',page:lemma,prop:'wikitext|revid',format:'json',redirects:'1'}).toString();const r=await request(u,{headers:{'User-Agent':'Deutsch-Trainer/1.0 (https://akadirektor.github.io/Deutsch-Trainer/)'},signal:AbortSignal.timeout(12000)});return r.ok?wikiEntry(await r.json()):null}catch{return null}})();
   let entries=[],ponsStatus='not_configured',used=null,dictionary=null;
   if(key('PONS_API_SECRET')){
    // Resolve the actual Ukrainian dictionary key; never fall back to Russian.
    try{const catalog=await request('https://api.pons.com/v1/dictionaries?language=en',{headers:{'X-Secret':key('PONS_API_SECRET')},signal:AbortSignal.timeout(10000)});if(catalog.ok){const list=await catalog.json();dictionary=Array.isArray(list)?list.find(d=>Array.isArray(d.languages)&&d.languages.includes('de')&&d.languages.includes('uk')&&typeof d.key==='string'):null;ponsStatus=dictionary?'ready':'language_unavailable';}else ponsStatus='unavailable';}catch{ponsStatus='unavailable';}
    if(dictionary){
     const quota=await request(key('SUPABASE_URL')+'/rest/v1/rpc/reserve_pons_query',{method:'POST',headers:{...authHeaders(service()),'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});
     if(!quota.ok)return reply({error:'Ліміт запитів не вдалося перевірити. PONS не викликався.'},503);
     used=await quota.json();
     if(typeof used!=='number'||used<0)ponsStatus='quota_reached';
     else{
      const u=new URL('https://api.pons.com/v1/dictionary');u.search=new URLSearchParams({q:term,l:dictionary.key,in:'de',ref:'true'}).toString();
      try{const r=await request(u,{headers:{'X-Secret':key('PONS_API_SECRET')},signal:AbortSignal.timeout(12000)});ponsStatus=r.status===200?'ok':r.status===204?'empty':r.status===403?'not_authorized':r.status===429?'provider_limit':'unavailable';if(r.status===200)entries=ponsEntries(await r.json())}catch{ponsStatus='unavailable'}
     }
    }
   }
   const wiki=await wikiPromise;
   const ponsUkrainian=[...new Set(entries.map(entry=>entry.target))].slice(0,3);
   const ukrainian=ponsUkrainian.length?ponsUkrainian:wiki?.translations||[];
   return reply({query:term,pons:{status:ponsStatus,entries,targetLanguage:'uk',dictionary:dictionary?.key||null,url:'https://en.pons.com/translate/german-ukrainian/'+encodeURIComponent(term),used,limit:900},ukrainian,translationSource:ponsUkrainian.length?'PONS':ukrainian.length?'Wiktionary':null,grammar:wiki?{type:wiki.type,article:wiki.article}:null,wiktionary:wiki?.title?{url:'https://de.wiktionary.org/w/index.php?title='+encodeURIComponent(wiki.title)+(wiki.revision?'&oldid='+wiki.revision:''),license:'CC BY-SA 4.0'}:null});
  }catch{return reply({error:'Не вдалося виконати словниковий пошук. Спробуй ще раз.'},502)}
 };
}
