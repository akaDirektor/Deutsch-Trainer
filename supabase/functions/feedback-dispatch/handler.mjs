import {createGitHubVerifier} from './oidc.mjs';
export function createDispatcher({env,fetch:request=fetch,verify=createGitHubVerifier(request)}){
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 return async req=>{
  if(req.method==='GET'&&new URL(req.url).pathname.endsWith('/health'))return reply({service:'translation-feedback',automatic:true});
  if(!['GET','POST'].includes(req.method))return reply({error:'Method not allowed'},405);
  try{await verify(req.headers.get('authorization')?.replace(/^Bearer /,''));}catch{return reply({error:'Trusted workflow required'},401)}
  try{
   let secret=env('SUPABASE_SERVICE_ROLE_KEY')||'';try{secret=JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}').default||secret}catch{}
   if(!secret)throw Error('Server unavailable');
   const base=env('SUPABASE_URL')+'/rest/v1/translation_feedback_reports',headers={apikey:secret,...(secret.startsWith('eyJ')?{Authorization:'Bearer '+secret}:{}),'Content-Type':'application/json'};
   if(req.method==='GET'){const r=await request(base+'?select=id,word_key,german,translation,reason,suggestion,created_at&status=eq.pending&order=created_at.asc&limit=20',{headers,signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Queue unavailable');return reply({reports:await r.json()});}
   const raw=await req.text();if(raw.length>2000)return reply({error:'Invalid receipt'},400);const {id,issue_url}=JSON.parse(raw);
   if(typeof id!=='string'||!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)||typeof issue_url!=='string'||!/^https:\/\/github\.com\/akaDirektor\/Deutsch-Trainer\/issues\/[1-9]\d*$/.test(issue_url))return reply({error:'Invalid receipt'},400);
   const r=await request(base+'?id=eq.'+id+'&status=eq.pending',{method:'PATCH',headers,body:JSON.stringify({status:'dispatched',issue_url,delivered_at:new Date().toISOString()}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Receipt unavailable');return reply({ok:true});
  }catch{return reply({error:'Feedback queue temporarily unavailable'},503)}
 };
}
