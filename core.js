/* Fonctions pures partagées par l'interface et les tests. */
(function(root){
 'use strict';
 const key=q=>`${q.subject}|${q.year}|${q.chapter}|${q.notion}`;
 const normalize=s=>s.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 function pick(pool,count,level,history=[],previous=[],random=Math.random){
  const recent=new Map(history.map((id,i)=>[id,i])); const old=new Set(previous);
  const available=pool.filter(q=>level==='mixed'||q.difficulty===level);
  const selected=[], ids=new Set(), notions=new Map(), types=new Map(), signatures=new Set(),families=new Set();
  const levels={medium:0,hard:0,expert:0};
  count=Math.min(count,available.length);
  while(selected.length<count){
   let best=null, score=-Infinity;
   for(const q of available){
    if(ids.has(q.id)||signatures.has(normalize(q.question))||(q.family&&families.has(q.family)))continue;
    const notion=key(q), type=q.style;
    let s=random()*4 - (notions.get(notion)||0)*60 - (types.get(type)||0)*8;
    if(!recent.has(q.id))s+=120; else s+=Math.min(40,recent.get(q.id)/20);
    if(old.has(q.id))s-=80;
    if(selected.at(-1)?.style===type)s-=35;
    if(selected.at(-1)&&key(selected.at(-1))===notion)s-=60;
    if(level==='mixed')s-=levels[q.difficulty]*40;
    if(s>score){best=q;score=s;}
   }
   if(!best)break;
   selected.push(best);if(best.family)families.add(best.family);ids.add(best.id);signatures.add(normalize(best.question));
   notions.set(key(best),(notions.get(key(best))||0)+1);types.set(best.style,(types.get(best.style)||0)+1);levels[best.difficulty]++;
  }
  return selected;
 }
 const questionKey=r=>r?`${r.id}/${r.round}/${r.current_index}`:'';
 const remaining=(r,now)=>Math.max(0,r.duration*1000-(now-Date.parse(r.question_started_at)));
 function validateBank(bank){
  const ids=new Set();
  for(const q of bank){
   if(!q.id||ids.has(q.id)||!q.question||!Array.isArray(q.choices)||q.choices.length!==4||new Set(q.choices.map(c=>c.normalize('NFC').toLocaleLowerCase('fr').replace(/\s+/g,' ').trim())).size!==4||q.choices.some(c=>!c.trim())||!Number.isInteger(q.answer)||q.answer<0||q.answer>3||!['medium','hard','expert'].includes(q.difficulty)||!q.explanation||!q.source?.page)throw Error('Banque invalide : '+q.id);
   ids.add(q.id);
  }
  return true;
 }
 const api={pick,normalize,questionKey,remaining,validateBank};
 if(typeof module!=='undefined')module.exports=api; else root.ArenaCore=api;
})(typeof window!=='undefined'?window:globalThis);
