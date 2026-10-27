export async function dispatchFeedback({request=fetch,env=process.env,log=console.log}={}){
 const endpoint='https://igqeqhswiksjikbxfrsx.supabase.co/functions/v1/feedback-dispatch',repo='https://api.github.com/repos/akaDirektor/Deutsch-Trainer';
 const oidcUrl=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);oidcUrl.searchParams.set('audience','deutsch-trainer-feedback');
 const identity=await request(oidcUrl,{headers:{Authorization:'Bearer '+env.ACTIONS_ID_TOKEN_REQUEST_TOKEN},signal:AbortSignal.timeout(15000)});if(!identity.ok)throw Error('Workflow identity unavailable');const {value:token}=await identity.json();if(!token)throw Error('Workflow identity missing');
 const queueHeaders={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 const pending=await request(endpoint,{headers:queueHeaders,signal:AbortSignal.timeout(15000)});if(!pending.ok)throw Error('Feedback queue HTTP '+pending.status);const {reports}=await pending.json();if(!Array.isArray(reports))throw Error('Invalid feedback queue');if(!reports.length){log('No pending translation feedback.');return 0;}
 const ghHeaders={Authorization:'Bearer '+env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
 async function github(path,body){const r=await request(repo+path,{method:body?'POST':'GET',headers:ghHeaders,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('GitHub HTTP '+r.status);return r.json()}
 // Recent labelled issues provide retry deduplication even if a receipt was lost.
 const label=await request(repo+'/labels/translation-feedback',{headers:ghHeaders,signal:AbortSignal.timeout(15000)});if(label.status===404)await github('/labels',{name:'translation-feedback',color:'C2E0C6',description:'Зауваження до перекладу із застосунку'});else if(!label.ok)throw Error('GitHub label unavailable');
 const since=new Date(Math.min(...reports.map(r=>Date.parse(r.created_at)))-60000).toISOString();let existing=[];
 for(let page=1;page<=20;page++){const rows=await github('/issues?state=all&labels=translation-feedback&per_page=100&page='+page+'&since='+encodeURIComponent(since));existing.push(...rows);if(rows.length<100)break;if(page===20)throw Error('Too many issues to deduplicate safely');}
 let count=0;
 for(const r of reports){
  if(!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(r.id)||typeof r.german!=='string')throw Error('Invalid report');const marker='<!-- trainer-feedback:'+r.id+' -->';
  let issue=existing.find(i=>typeof i.body==='string'&&i.body.trimEnd().endsWith(marker));
  if(!issue){const body='Зауваження надіслано із застосунку Deutsch-Trainer. Перевірити за словниковими джерелами.\n\n```json\n'+JSON.stringify({word:r.german,key:r.word_key,current_translation:r.translation,reason:r.reason||'Потрібно перевірити переклад.',suggestion:r.suggestion||''},null,2)+'\n```\n\nЗберегти ключ слова, усі приклади та навчальний прогрес.\n\n'+marker;issue=await github('/issues',{title:('Перевірити переклад: '+r.german).slice(0,240),body,labels:['translation-feedback']});existing.push(issue);}
  const ack=await request(endpoint,{method:'POST',headers:queueHeaders,body:JSON.stringify({id:r.id,issue_url:issue.html_url}),signal:AbortSignal.timeout(15000)});if(!ack.ok)throw Error('Feedback receipt HTTP '+ack.status);count++;
 }
 log('Translation feedback delivered: '+count);return count;
}
if(process.argv[1]?.endsWith('/dispatch-feedback.mjs'))dispatchFeedback().catch(e=>{console.error(e.message);process.exitCode=1});
