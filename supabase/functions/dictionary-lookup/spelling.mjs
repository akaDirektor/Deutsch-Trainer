// Only dictionary-attested entries become corrections. No suffix-based gender guesses.
export function editDistance(a,b){a=a.toLocaleLowerCase('de');b=b.toLocaleLowerCase('de');let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=next}return row[b.length]}
export function createLexicalLookup(request,parseEntry){
 const cache=new Map(),pending=new Map();
 const userAgent={'User-Agent':'Deutsch-Trainer/1.0 (https://akadirektor.github.io/Deutsch-Trainer/)'};
 async function api(params){const u=new URL('https://de.wiktionary.org/w/api.php');u.search=new URLSearchParams({...params,format:'json'}).toString();const r=await request(u,{headers:userAgent,signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Dictionary unavailable');return r.json()}
 async function page(title,options={}){const entry=parseEntry(await api({action:'parse',page:title,prop:'wikitext|revid',redirects:'1'}),options);return entry.german?entry:null}
 function checked(entry,provided){const article=entry.articles.length===1?entry.articles[0]:entry.articles.includes(provided)?provided:'';return {...entry,article,de:entry.type==='noun'&&article?article+' '+entry.title:entry.title,source:'https://de.wiktionary.org/w/index.php?title='+encodeURIComponent(entry.title)+(entry.revision?'&oldid='+entry.revision:'')};}
 return async term=>{
  const old=cache.get(term);if(old&&old.expires>Date.now())return old.value;if(pending.has(term))return pending.get(term);
  const work=(async()=>{try{
   const provided=/^(der|die|das)\s+/i.exec(term)?.[1].toLowerCase()||'',lemma=term.replace(/^(der|die|das)\s+/i,'').normalize('NFC'),capital=lemma[0]?.toLocaleUpperCase('de')+lemma.slice(1);
   const titles=[...new Set(provided?[capital,lemma]:[lemma,capital])];let fallback=null;
   for(const title of titles){const entry=await page(title);if(entry){fallback=entry;if(entry.typeConfirmed)return {entry:checked(entry,provided),suggestions:[],status:'verified'}}}
   // Reflexive constructions live on the base lemma in Wiktionary, but retain
   // their own user-visible word identity, translation senses and LEO query.
   const reflexive=/^\(?sich\)?\s+([\p{L}-]+)(?:\s+(?:an|auf|aus|bei|für|gegen|in|mit|nach|über|um|unter|von|vor|zu)(?:\s+\(?\+?\s*(?:Akk\.?|Dat\.?)\)?)?)?$/u.exec(lemma);
   if(reflexive){const entry=await page(reflexive[1],{reflexive:true});if(entry?.type==='verb'&&entry.reflexive){return {entry:{...checked(entry,provided),de:lemma,type:lemma.replace(/^\(?sich\)?\s+/,'').includes(' ')?'preposition':'verb'},suggestions:[],status:'verified'}}}
   if(fallback)return {entry:checked(fallback,provided),suggestions:[],status:'verified'};
   const suggestions=[];
   if(/^[\p{L}-]{3,80}$/u.test(lemma)){
    const result=await api({action:'query',list:'search',srsearch:lemma+'~',srinfo:'suggestion',srlimit:'6',srprop:''});
    const titles=[result.query?.searchinfo?.suggestion,...(result.query?.search||[]).map(r=>r.title)].filter(t=>typeof t==='string'&&t.length<=100);
    const candidates=[...new Set(titles)].map(title=>({title,distance:editDistance(lemma,title)})).filter(c=>c.distance>0&&c.distance<=(lemma.length<=4?1:2)).sort((a,b)=>a.distance-b.distance).slice(0,3);
    const entries=await Promise.allSettled(candidates.map(async c=>({entry:await page(c.title),distance:c.distance})));
    for(const r of entries)if(r.status==='fulfilled'&&r.value.entry?.typeConfirmed)suggestions.push({...checked(r.value.entry,provided),distance:r.value.distance});
   }
   const best=suggestions.length?Math.min(...suggestions.map(s=>s.distance)):0;
   return {entry:null,suggestions:suggestions.filter(s=>s.distance===best),status:suggestions.length?'suggested':'unverified'};
  }catch{return {entry:null,suggestions:[],status:'unavailable'}}})();pending.set(term,work);
  try{const value=await work;if(cache.size>=128)cache.delete(cache.keys().next().value);cache.set(term,{value,expires:Date.now()+(value.entry?1800000:120000)});return value;}finally{pending.delete(term)}
 };
}
