const {test}=require('node:test'),assert=require('node:assert/strict');
const modulePromise=import('../supabase/functions/dictionary-lookup/handler.mjs');
const wiki={parse:{title:'Zuversicht',revid:123,wikitext:{'*':'== Zuversicht ({{Sprache|Deutsch}}) ==\n{{Wortart|Substantiv|Deutsch}}\n|Genus=f\n*{{uk}}: {{Üt|uk|впевненість}}, {{Üt|uk|надія}}\n== Other ({{Sprache|Englisch}}) ==\n{{Üt|uk|зайве}}'}}};
async function fixture({member=true,wikiData=wiki,machineStatus=200,quotaFinished=false,providerError=false,pages=null,searchTitles=[],prefixTitles=[],machineTranslations=null}={}){
 const {createHandler}=await modulePromise,calls=[],env={PONS_API_SECRET:'legacy-unused-secret',SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'public'};
 const handler=createHandler({env:k=>env[k],fetch:async(url,opts={})=>{const s=String(url);calls.push({url:s,options:opts});if(s.includes('/auth/v1/user'))return Response.json({id:'user'});if(s.includes('/trainer_progress?'))return Response.json(member?[{user_id:'user'}]:[]);if(s.includes('wiktionary')){const u=new URL(s);if(u.searchParams.get('action')==='query')return Response.json(u.searchParams.get('list')==='prefixsearch'?{query:{prefixsearch:prefixTitles.map(title=>({title}))}}:{query:{search:searchTitles.map(title=>({title}))}});return Response.json(pages?pages[u.searchParams.get('page')]||{}:wikiData);}if(s.includes('api.mymemory.translated.net')){if(providerError)throw Error('offline');return Response.json({responseStatus:machineStatus,quotaFinished,responseData:{translatedText:machineTranslations?.[new URL(s).searchParams.get('q')]||'самовпевненість'}})}throw Error('Unexpected endpoint: '+s)}});
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

const nounPage={parse:{title:'Vergünstigung',revid:789,wikitext:{'*':'== Vergünstigung ({{Sprache|Deutsch}}) ==\n=== {{Wortart|Substantiv|Deutsch}}, {{f}} ===\n|Genus=f\n|Nominativ Singular=Vergünstigung\n* {{Ü|uk|пільга}}'}}};
test('lowercase nouns and wrong supplied articles resolve to dictionary-confirmed canonical spelling and article',async()=>{
 const f=await fixture({pages:{Vergünstigung:nounPage}});for(const q of ['vergünstigung','der vergünstigung','Vergünstigung']){const body=await(await f.handler(f.req({q}))).json();assert.equal(body.wordCheck.verified,true);assert.equal(body.wordCheck.canonical,'die Vergünstigung');assert.equal(body.grammar.type,'noun');assert.equal(body.grammar.article,'die');assert.deepEqual(body.ukrainian,['пільга']);}
});
test('a typo produces only parsed German dictionary corrections, never an invented article or a silent corrected entry',async()=>{
 const f=await fixture({pages:{Vergünstigung:nounPage},searchTitles:['Vergünstigung','Verkündigung','Vergünstigungen']});const body=await(await f.handler(f.req({q:'vergünsigung'}))).json();assert.equal(body.wordCheck.verified,false);assert.equal(body.wordCheck.status,'suggested');assert.equal(body.grammar,null);assert.deepEqual(body.wordCheck.suggestions.map(s=>s.de),['die Vergünstigung']);assert(body.wordCheck.suggestions[0].source.includes('oldid=789'));assert.deepEqual(body.ukrainian,[]);assert(!f.calls.some(c=>c.url.includes('api.mymemory')));
});
test('ambiguous noun genders are not guessed, and lowercase verbs are not converted into capitalized nouns',async()=>{
 const band={parse:{title:'Band',wikitext:{'*':'== Band ({{Sprache|Deutsch}}) ==\n{{Wortart|Substantiv|Deutsch}}\n|Genus 1=m\n|Genus 2=n\n'}}},verb={parse:{title:'essen',wikitext:{'*':'== essen ({{Sprache|Deutsch}}) ==\n{{Wortart|Verb|Deutsch}}'}}};const f=await fixture({pages:{Band:band,essen:verb}});const noun=await(await f.handler(f.req({q:'Band'}))).json();assert.equal(noun.grammar.article,'');assert.deepEqual(noun.grammar.articles,['der','das']);const known=await(await f.handler(f.req({q:'das Band'}))).json();assert.equal(known.grammar.article,'das');const v=await(await f.handler(f.req({q:'essen'}))).json();assert.equal(v.wordCheck.canonical,'essen');assert.equal(v.grammar.type,'verb');
});

test('automatic noun translation keeps the confirmed article so a capitalized noun is not translated as its lowercase verb',async()=>{
 const page={parse:{title:'Essen',wikitext:{'*':'== Essen ({{Sprache|Deutsch}}) ==\n{{Wortart|Substantiv|Deutsch}}\n|Genus=n\n'}}},f=await fixture({pages:{Essen:page}});await f.handler(f.req({q:'das essen'}));assert.equal(new URL(f.calls.find(c=>c.url.includes('api.mymemory')).url).searchParams.get('q'),'das Essen');
});

const verbPage={parse:{title:'erinnern',revid:321,wikitext:{'*':`== erinnern ({{Sprache|Deutsch}}) ==
=== {{Wortart|Verb|Deutsch}} ===
{{Deutsch Verb Übersicht
|Präteritum_ich=erinnerte
|Partizip II=erinnert
|Hilfsverb=haben
}}
{{Bedeutungen}}
:[1] {{K|refl.|ft=mit Präpositionalobjekt}} im Gedächtnis behalten
:[2] {{K|trans.}} jemanden etwas nicht vergessen lassen
{{Beispiele}}
:[1] Ich ''erinnere'' mich an dich.
:[2] Bitte ''erinnern'' Sie ihn morgen noch einmal!
{{Ü-Tabelle|1|G=reflexiv|Ü-Liste=
* {{Ü|uk|пам’ятати}}
}}
{{Ü-Tabelle|2|G=transitiv|Ü-Liste=
* {{Ü|uk|нагадувати}}
}}
`}}};
test('reflexive lookup retains its identity and returns dictionary forms, reflexive example and only reflexive translations',async()=>{
 const f=await fixture({pages:{erinnern:verbPage}}),q='sich erinnern an + Akk.',body=await(await f.handler(f.req({q}))).json();
 assert.equal(body.wordCheck.canonical,q);assert.equal(body.grammar.type,'preposition');assert.equal(body.grammar.praeteritum,'erinnerte sich');assert.equal(body.grammar.perfekt,'hat sich erinnert');assert.equal(body.grammar.partizipII,'erinnert');assert.equal(body.example,'Ich erinnere mich an dich.');assert.deepEqual(body.ukrainian,['пам’ятати']);assert(body.wiktionary.url.endsWith('&oldid=321'));
 const ordinary=await(await f.handler(f.req({q:'erinnern'}))).json();assert.equal(ordinary.grammar.type,'verb');assert.equal(ordinary.grammar.praeteritum,'erinnerte');assert.equal(ordinary.grammar.perfekt,'hat erinnert');
});
test('dictionary morphology never invents a missing past form or auxiliary, and examples reject unresolved markup and quotations',async()=>{
 const {wikiEntry}=await modulePromise;const x=wikiEntry({parse:{title:'prüfen',wikitext:{'*':`== prüfen ({{Sprache|Deutsch}}) ==
{{Wortart|Verb|Deutsch}}
|Partizip II=geprüft
{{Beispiele}}
:[1] „Quoted text stays out.“<ref>External source</ref>
:[1] {{unresolved|template}}
:[1] Wir [[prüfen]] die Unterlagen sorgfältig.
{{Referenzen}}
`}}});assert.equal(x.praeteritum,'');assert.equal(x.perfekt,'');assert.equal(x.partizipII,'geprüft');assert.equal(x.example,'Wir prüfen die Unterlagen sorgfältig.');
});


test('optional translation choices cover distinct attested senses, translate to Ukrainian, cache by language and never fetch LEO',async()=>{
 const page={parse:{title:'Ausschusstest',revid:456,wikitext:{'*':`== Ausschusstest ({{Sprache|Deutsch}}) ==
{{Wortart|Substantiv|Deutsch}}
|Genus=m
{{Ü-Tabelle|1|G=Gremium|Ü-Liste=
* {{Ü|en|committee}}, {{Ü|en|panel}}
}}
{{Ü-Tabelle|2|G=Fehlproduktion|Ü-Liste=
* {{Ü|en|scrap}}, {{Ü|en|reject}}
}}
`}}};const f=await fixture({pages:{Ausschusstest:page},machineTranslations:{committee:'комітет',panel:'комісія',scrap:'брак',reject:'брак'}});
 let body=await(await f.handler(f.req({q:'der Ausschusstest'}))).json();assert.equal(f.calls.filter(c=>c.url.includes('langpair=en')).length,0);
 body=await(await f.handler(f.req({q:'der Ausschusstest',alternatives:true}))).json();assert.deepEqual(body.translationChoices.map(c=>c.text),['самовпевненість','комітет','брак','комісія']);
 const chosen=body.translationChoices.find(c=>c.text==='брак');assert.equal(chosen.dictionaryTerm,'scrap');assert.equal(chosen.via,'MyMemory');assert.equal(chosen.automatic,true);assert(chosen.sourceUrl.endsWith('&oldid=456'));assert(!f.calls.some(c=>c.url.includes('leo.org')));
 const before=f.calls.filter(c=>c.url.includes('mymemory')).length;await f.handler(f.req({q:'der Ausschusstest',alternatives:true}));assert.equal(f.calls.filter(c=>c.url.includes('mymemory')).length,before);assert.equal((await f.handler(f.req({q:'word',alternatives:'true'}))).status,400);
});


test('manually reviewed Ausschuss meanings are offered without scraping LEO or claiming a Ukrainian LEO dictionary',async()=>{
 const f=await fixture({wikiData:nounPage});const body=await(await f.handler(f.req({q:'der Ausschuss',alternatives:true}))).json();
 // The fixture redirects to a different noun, so it must not reuse Ausschuss data.
 assert.notEqual(body.translationSource,'LEO');
 const page={parse:{title:'Ausschuss',wikitext:{'*':'== Ausschuss ({{Sprache|Deutsch}}) ==\n{{Wortart|Substantiv|Deutsch}}\n|Genus=m\n'}}},real=await fixture({pages:{Ausschuss:page}}),result=await(await real.handler(real.req({q:'der Ausschuss',alternatives:true}))).json();assert.deepEqual(result.ukrainian,['комітет','комісія','виробничий брак']);assert(result.translationChoices.every(c=>c.editorialTranslation&&c.provider==='LEO'));assert(!real.calls.some(c=>c.url.includes('leo.org')));
});


const verpflichtPages={
 verpflicht:{parse:{title:'verpflicht',revid:101,wikitext:{'*':'== verpflicht ({{Sprache|Deutsch}}) ==\n=== {{Wortart|Konjugierte Form|Deutsch}} ===\n{{Grundformverweis Konj|verpflichten}}'}}},
 verpflichten:{parse:{title:'verpflichten',revid:102,wikitext:{'*':'== verpflichten ({{Sprache|Deutsch}}) ==\n{{Wortart|Verb|Deutsch}}\n|Präteritum_ich=verpflichtete\n|Partizip II=verpflichtet\n|Hilfsverb=haben\n{{Ü|uk|зобов’язувати}}'}}},
 Verpflichtung:{parse:{title:'Verpflichtung',revid:103,wikitext:{'*':'== Verpflichtung ({{Sprache|Deutsch}}) ==\n{{Wortart|Substantiv|Deutsch}}\n|Genus=f\n{{Ü|uk|зобов’язання}}'}}}
};
test('a real inflected-form page does not stop headword suggestions: verpflicht offers the verb and an attested noun with its article',async()=>{
 const f=await fixture({pages:verpflichtPages,searchTitles:['verpflichten','verpflicht'],prefixTitles:['verpflicht','verpflichten','Verpflichtung','Verpflichtungskredit']});const before=await(await f.handler(f.req({q:'verpflicht'}))).json();assert.equal(before.wordCheck.status,'suggested');assert.equal(before.wordCheck.reason,'inflected');assert.equal(before.wordCheck.verified,false);assert.deepEqual(before.wordCheck.suggestions.map(s=>s.de),['verpflichten','die Verpflichtung']);assert.deepEqual(before.ukrainian,[]);assert(!f.calls.some(c=>c.url.includes('mymemory')));
 const noun=await(await f.handler(f.req({q:'die Verpflichtung'}))).json();assert.equal(noun.wordCheck.canonical,'die Verpflichtung');assert.equal(noun.grammar.article,'die');assert.deepEqual(noun.ukrainian,['зобов’язання']);const verb=await(await f.handler(f.req({q:'verpflichten'}))).json();assert.equal(verb.grammar.type,'verb');assert.equal(verb.grammar.perfekt,'hat verpflichtet');
});
test('incomplete words can suggest dictionary-verified prefix completions beyond typo distance without admitting compounds or missing pages',async()=>{
 const f=await fixture({pages:{Verpflichtung:verpflichtPages.Verpflichtung},prefixTitles:['Verpflichtung','Verpflichtungskredit','Verpflichtfoobar']});const body=await(await f.handler(f.req({q:'verpflich'}))).json();assert.deepEqual(body.wordCheck.suggestions.map(s=>s.de),['die Verpflichtung']);assert.equal(body.wordCheck.status,'suggested');assert.equal(body.grammar,null);
});
