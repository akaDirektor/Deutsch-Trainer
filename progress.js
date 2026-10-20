/* Pure state helpers shared by the browser and regression tests. */
(function(root){
 const clone=x=>JSON.parse(JSON.stringify(x));
 function validate(x){
  if(!x||x.schema!==1||!x.stats||typeof x.stats!=='object'||Array.isArray(x.stats)||!Array.isArray(x.hidden)||!x.cycle||!Array.isArray(x.cycle.seen))throw Error('Невідомий формат прогресу. Оригінал збережено.');
  if(x.hidden.some(k=>typeof k!=='string')||x.cycle.seen.some(k=>typeof k!=='string'))throw Error('Некоректні ключі слів');
  for(const st of Object.values(x.stats)){
   if(!st||typeof st!=='object'||Array.isArray(st))throw Error('Некоректна статистика');
   for(const k of ['correct','wrong','streak','recallCorrect','recallWrong','verbWriteCorrect','verbWriteWrong'])if(st[k]!=null&&(!Number.isSafeInteger(st[k])||st[k]<0))throw Error('Некоректний лічильник '+k);
  }
  if(x.cycle.scopes){
   if(typeof x.cycle.scopes!=='object'||Array.isArray(x.cycle.scopes))throw Error('Некоректні цикли');
   for(const value of Object.values(x.cycle.scopes))if(!value||!Array.isArray(value.seen)||value.seen.some(k=>typeof k!=='string'))throw Error('Некоректний цикл');
  }
  return clone(x);
 }
 function unseen(cycle,words,key){
  const seen=new Set(cycle.seen);let p=words.filter(w=>!seen.has(key(w)));
  if(!p.length&&words.length){cycle.seen=[];cycle.number=(cycle.number||0)+1;p=words;}
  return p;
 }
 root.Progress={validate,unseen,clone};
})(typeof window==='undefined'?globalThis:window);
