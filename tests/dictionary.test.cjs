const {test}=require('node:test'),assert=require('node:assert/strict');
const modulePromise=import('../supabase/functions/dictionary-lookup/handler.mjs');
const wiki={parse:{title:'Zuversicht',revid:123,wikitext:{'*':'== Zuversicht ({{Sprache|Deutsch}}) ==\n{{Wortart|Substantiv|Deutsch}}\n|Genus=f\n*{{uk}}: {{Üt|uk|впевненість}}, {{Üt|uk|надія}}\n== Other ({{Sprache|Englisch}}) ==\n{{Üt|uk|зайве}}'}}};
async function fixture({member=true,wikiData=wiki,machineStatus=200,quotaFinished=false,providerError=false}={}){
 const {createHandler}=await modulePromise,calls=[],env={PONS_API_SECRET:'legacy-unused-secret',SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'public'};
 const handler=createHandler({env:k=>env[k],fetch:async(url,opts={})=>{const s=String(url);calls.push({url:s,options:opts});if(s.includes('/auth/v1/user'))return Response.json({id:'user'});if(s.includes('/trainer_progress?'))return Response.json(member?[{user_id:'user'}]:[]);if(s.includes('wiktionary'))return Response.json(wikiData);if(s.includes('api.mymemory.translated.net')){if(providerError)throw Error('offline');return Response.json({responseStatus:machineStatus,quotaFinished,responseData:{translatedText:'самовпевненість'}})}throw Error('Unexpected endpoint: '+s)}});
 return {handler,calls,req:(body={q:'Zuversicht'},headers={})=>new Request('https://test.supabase.co/functions/v1/dictionary-lookup',{method:'POST',headers:{authorization:'Bearer user-session','Content-Type':'application/json',...headers},body:JSON.stringify(body)})};
}
test('open lookup supplies dictionary Ukrainian with exact provenance and never calls PONS or quota RPC',async()=>{
 const f=await fixture(),r=await f.handler(f.req()),body=await r.json();assert.equal(r.status,200);assert.deepEqual(body.ukrainian,['впевненість','надія']);assert.equal(body.translationSource,'Wiktionary');assert.equal(body.grammar.article,'die');assert(body.translationUrl.endsWith('&oldid=123'));assert.equal(body.translationUrl,body.wiktionary.url);assert.equal(body.pons.status,'not_used');assert.equal(body.pons.url,undefined);assert(!JSON.stringify(body).includes('legacy-unused-secret'));assert(!f.calls.some(c=>/pons|reserve_/.test(c.url)));assert(!f.calls.some(c=>c.url.includes('mymemory')));
});
test('no Ukrainian dictionary result automatically produces a free de→uk suggestion and a word-specific source link',async()=>{
 const f=await fixture({wikiData:{}}),body=await(await f.handler(f.req({q:'die Zuversicht'}))).json();assert.deepEqual(body.ukrainian,['самовпевненість']);assert.equal(body.translationSource,'MyMemory');assert.equal(body.automatic.isDictionary,false);assert.equal(body.translationUrl,'https://mymemory.translated.net/en/German/Ukrainian/Zuversicht');assert.equal(body.automatic.url,body.translationUrl);const u=new URL(f.calls.find(c=>c.url.includes('api.mymemory')).url);assert.equal(u.searchParams.get('langpair'),'de|uk');assert.equal(u.searchParams.get('q'),'Zuversicht');assert.equal(u.searchParams.has('key'),false);assert.equal(u.searchParams.has('de'),false);
});
test('unauthenticated, wrong-origin, malformed and nonmember requests cannot use any translation provider',async()=>{
 for(const kind of ['auth','origin','input','member']){const f=await fixture({member:kind!=='member'}),req=kind==='auth'?new Request('https://test.supabase.co/lookup',{method:'POST',body:'{}'}):f.req(kind==='input'?{q:''}:{q:'word'},kind==='origin'?{origin:'https://untrusted.test'}:{});assert((await f.handler(req)).status>=400);assert(!f.calls.some(c=>/wiktionary|mymemory|pons|reserve_/.test(c.url)));}
});
test('empty, quota-limited and failed automatic providers remain honest rather than inserting service errors',async()=>{
 for(const options of [{machineStatus:403},{machineStatus:429},{quotaFinished:true},{providerError:true}]){const f=await fixture({wikiData:{},...options}),body=await(await f.handler(f.req())).json();assert.deepEqual(body.ukrainian,[]);assert.equal(body.translationSource,null);assert.equal(body.translationUrl,null);assert.notEqual(body.automatic.status,'ok');}
});
test('formatter decodes text safely and takes Ukrainian only from the German language section',async()=>{
 const {plain,wikiEntry,automaticTranslation}=await modulePromise;assert.equal(plain('<b>hat</b>&nbsp;ge&#228;ndert'),'hat geändert');assert.deepEqual(wikiEntry({parse:{title:'unknown',wikitext:{'*':'== Unknown ({{Sprache|Englisch}}) ==\n{{Üt|uk|зайве}}'}}}).translations,[]);assert.equal(automaticTranslation({responseStatus:200,responseData:{translatedText:'QUERY LENGTH LIMIT EXCEEDED'}}),'');assert.equal(automaticTranslation({responseStatus:403,responseData:{translatedText:'помилка'}}),'');
});
test('automatic requests and word-specific source links preserve reflexivity and prepositions',async()=>{
 const f=await fixture({wikiData:{}}),q='sich halten an',body=await(await f.handler(f.req({q}))).json();assert.equal(new URL(f.calls.find(c=>c.url.includes('api.mymemory')).url).searchParams.get('q'),q);assert.equal(decodeURIComponent(body.translationUrl.split('/Ukrainian/')[1]),q);assert(!f.calls.some(c=>/langpair=de%7Cru|l=deru/.test(c.url)));
});
test('automatic cache avoids repeat calls but still authenticates every lookup',async()=>{
 const f=await fixture({wikiData:{}});for(let i=0;i<2;i++)await f.handler(f.req());assert.equal(f.calls.filter(c=>c.url.includes('api.mymemory')).length,1);assert.equal(f.calls.filter(c=>c.url.includes('/auth/v1/user')).length,2);await f.handler(f.req({q:'anderes Wort'}));assert.equal(f.calls.filter(c=>c.url.includes('api.mymemory')).length,2);
});
test('health advertises only open Ukrainian providers and does not require or expose a PONS key',async()=>{
 const f=await fixture(),body=await(await f.handler(new Request('https://test.supabase.co/health'))).json();assert.deepEqual(body.providers,['Wiktionary','MyMemory']);assert.equal(body.targetLanguage,'uk');assert.equal(body.paidProviders,false);assert.equal(f.calls.length,0);assert(!JSON.stringify(body).includes('secret'));
});
test('open lookup retains CORS and rejects control characters and unsupported methods',async()=>{
 const f=await fixture(),r=await f.handler(f.req({}, {origin:'https://akadirektor.github.io'}));assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://akadirektor.github.io');assert.equal((await f.handler(f.req({q:'a\nb'}))).status,400);assert.equal((await f.handler(new Request('https://test.supabase.co/lookup',{method:'DELETE'}))).status,405);
});

test('sentence translation preserves the entire exact German sentence and bypasses word dictionaries',async()=>{
 const f=await fixture(),q='Die Kollegin hat die Unterlagen\nsorgfältig geprüft.';
 for(let i=0;i<2;i++){const r=await f.handler(f.req({q,kind:'sentence'})),body=await r.json();assert.equal(r.status,200);assert.equal(body.query,q);assert.equal(body.translation,'самовпевненість');assert.equal(body.translationSource,'MyMemory');assert.equal(body.automatic,true);}
 const calls=f.calls.filter(c=>c.url.includes('api.mymemory'));assert.equal(calls.length,1);assert.equal(new URL(calls[0].url).searchParams.get('q'),q);assert.equal(new URL(calls[0].url).searchParams.get('langpair'),'de|uk');assert(!f.calls.some(c=>/wiktionary|pons/.test(c.url)));
});
test('sentence mode keeps authentication, input limits and honest failure handling',async()=>{
 const f=await fixture({member:false});assert.equal((await f.handler(f.req({q:'Das ist ein Satz.',kind:'sentence'}))).status,403);assert(!f.calls.some(c=>c.url.includes('mymemory')));
 const good=await fixture();assert.equal((await good.handler(good.req({q:'word',kind:'unsupported'}))).status,400);const long=await(await good.handler(good.req({q:'Ü'.repeat(260),kind:'sentence'}))).json();assert.equal(long.status,'too_long');assert.equal(long.translation,null);assert(!good.calls.some(c=>c.url.includes('mymemory')));
 const failed=await fixture({quotaFinished:true}),body=await(await failed.handler(failed.req({q:'Dies ist ein Satz.',kind:'sentence'}))).json();assert.equal(body.translation,null);assert.equal(body.translationSource,null);
});
