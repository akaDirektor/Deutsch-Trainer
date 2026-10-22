/* Read-only audit of the actual index.html vocabulary pipeline. No network or storage writes. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
function loadCorpus(root=path.resolve(__dirname,'..')){
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const scripts=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(m=>m[1].split('?')[0]).filter(f=>/^words-[^/]+\.js$/.test(f));
 const context=vm.createContext({window:{}}),counts=[],physical=[];
 for(const file of scripts){
  const source=fs.readFileSync(path.join(root,file),'utf8'),single=vm.createContext({window:{}});vm.runInContext(source,single,{filename:file});
  const records=single.window.WORDS;if(!Array.isArray(records))throw Error('Vocabulary array missing: '+file);
  for(const w of records)if(!w||typeof w.de!=='string'||!w.de.trim()||typeof w.uk!=='string')throw Error('Malformed record: '+file);
  counts.push({file,records:records.length,sha256:crypto.createHash('sha256').update(source).digest('hex')});physical.push(...records);
  vm.runInContext(source,context,{filename:file});
 }
 const records=JSON.parse(JSON.stringify(context.window.WORDS||[]));
 if(JSON.stringify(records)!==JSON.stringify(physical))throw Error('Vocabulary scripts reset, overwrite or reorder earlier entries');
 const key=w=>w.de.toLowerCase().trim(),seen=new Set(),duplicates=[];
 for(const w of records){if(seen.has(key(w)))duplicates.push(key(w));seen.add(key(w));}
 const unloaded=fs.readdirSync(root).filter(f=>/^words-.*\.js$/.test(f)&&!scripts.includes(f));
 return {records,counts,duplicates,unloaded};
}
function audit(root,state={stats:{},hidden:[]}){
 const corpus=loadCorpus(root),context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'progress.js'),'utf8'),context);
 const {stats,hidden}=state,runtime=context.Progress.vocabulary(corpus.records,stats);
 return {sources:corpus.counts,unloadedVocabularyFiles:corpus.unloaded,duplicateKeys:corpus.duplicates,...context.Progress.vocabularyReport(corpus.records,stats,hidden,runtime)};
}
if(require.main===module){
 const root=path.resolve(__dirname,'..');let state={stats:{},hidden:[]};
 if(process.argv[2]){const input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));state=input.rows?.[0]?.state||input.state||input;}
 const result=audit(root,state);console.log(JSON.stringify(result,null,2));
 if(result.unloadedVocabularyFiles.length||result.corpusDuplicates||result.runtimeDuplicates||result.corpusMissing.length||result.unexplainedRuntime.length)process.exitCode=1;
}
module.exports={loadCorpus,audit};
