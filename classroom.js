(() => {
'use strict';
const $=id=>document.getElementById(id), reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
let sound=read('ncr-v5-sound',false),unlocked=false,events=read('ncr-v5-events',true),phaseKey='',questionKey='',baseline=null,lastTick='',histogramKey='';
const playing=new Set(),seen=new Set();
const key=s=>`${s.room.id}/${s.room.round}/${s.room.current_index}`;
function soundUI(){const b=$('soundToggle');b.textContent=sound?'🔊 Son activé':'🔇 Son coupé';b.setAttribute('aria-pressed',String(sound));}
function stopAudio(){playing.forEach(a=>{try{a.pause();a.currentTime=0;}catch{}});playing.clear();}
function play(name){if(!sound||!unlocked||document.visibilityState==='hidden')return;try{const a=new Audio(`assets/sounds/${name}.wav`);a.volume=.25;playing.add(a);a.addEventListener('ended',()=>playing.delete(a),{once:true});const promise=a.play();promise?.catch(()=>playing.delete(a));}catch{}}
// An actual gesture unlocks optional audio; playback failures never affect the quiz.
document.addEventListener('pointerdown',()=>{unlocked=true;},{capture:true});
document.addEventListener('keydown',()=>{unlocked=true;},{capture:true});
$('soundToggle').addEventListener('click',()=>{unlocked=true;sound=!sound;save('ncr-v5-sound',sound);soundUI();if(sound)play('lobby');else stopAudio();});soundUI();
$('eventsToggle').checked=events;$('eventsToggle').addEventListener('change',e=>{events=e.target.checked;save('ncr-v5-events',events);});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stopAudio();});
function once(id){if(seen.has(id))return false;seen.add(id);try{const ids=JSON.parse(sessionStorage.getItem('ncr-v5-effects')||'[]');if(ids.includes(id))return false;sessionStorage.setItem('ncr-v5-effects',JSON.stringify([...ids,id].slice(-120)));}catch{}return true;}
function observe(s){const k=key(s);
 if(k!==questionKey){questionKey=k;baseline=null;try{const b=JSON.parse(sessionStorage.getItem('ncr-v5-rank')||'null');if(b?.key===k)baseline=b.rank;}catch{}}
 if(baseline===null&&s.room.phase==='question'&&s.player&&!s.answer){baseline=s.players.findIndex(p=>p.id===s.player.id)+1;try{sessionStorage.setItem('ncr-v5-rank',JSON.stringify({key:k,rank:baseline}));}catch{}}
 if(s.room.phase!=='reveal'||!s.host){$('answerHistogram').replaceChildren();$('answerHistogram').classList.add('hidden');}
}
function histogram(s,q){const el=$('answerHistogram'),counts=s.distribution;
 el.replaceChildren();el.classList.remove('hidden');
 if(!Array.isArray(counts)||counts.length!==4||counts.some(n=>!Number.isInteger(n)||n<0)){el.textContent='Répartition indisponible : applique le SQL V5 fourni.';return;}
 const total=counts.reduce((a,b)=>a+b,0),title=document.createElement('h3');title.textContent=`Réponses de la classe · ${total} / ${s.players.length}`;el.append(title);
 counts.forEach((n,i)=>{const row=document.createElement('div');row.className='histogram-row'+(i===q.answer?' correct':'');row.dataset.choice=String(i);const label=document.createElement('div');label.className='histogram-label';const pct=total?100*n/total:0;label.textContent=`${'ABCD'[i]} — ${n} réponse${n===1?'':'s'} — ${pct.toLocaleString('fr-FR',{maximumFractionDigits:1})} %${i===q.answer?' · Bonne réponse':''}`;const track=document.createElement('div');track.className='histogram-track';const bar=document.createElement('span');bar.style.width=pct+'%';track.append(bar);row.append(label,track);el.append(row);});
 const note=document.createElement('p');note.className='tiny';note.textContent=`${Math.max(0,s.players.length-total)} sans réponse · Pourcentages des réponses enregistrées.`;el.append(note);
}
function feedback(s,fresh){const el=$('studentFeedback');el.replaceChildren();const a=s.answer,rank=s.players.findIndex(p=>p.id===s.player.id)+1;
 const points=document.createElement('strong');points.className='earned-points';points.textContent=`+${a?.points||0} pts`;el.append(points);
 const badges=[];if(a?.is_correct&&s.player.streak>=3)badges.push(`🔥 Série x${s.player.streak}`);
 if(a?.is_correct&&Number.isFinite(a.response_ms)&&a.response_ms<=Math.min(5000,s.room.duration*250))badges.push('⚡ Rapide !');
 if(badges.length){const b=document.createElement('div');b.className='feedback-badges';b.textContent=badges.join(' · ');el.append(b);}
 const position=document.createElement('p');position.textContent=`Tu es ${rank}${rank===1?'er':'e'}`;
 if(baseline&&baseline>rank)position.textContent+=` · ↑ +${baseline-rank} place${baseline-rank===1?'':'s'}`;
 if(rank>5){const gap=s.players[4].score-s.player.score;if(gap>0)position.textContent+=` · ${gap} pts du Top 5`;}
 el.append(position);
 if(fresh&&once(key(s)+'/feedback')){const card=$('viewStudentReveal').querySelector('.student-result-card');card.classList.remove('feedback-good','feedback-wrong');void card.offsetWidth;card.classList.add(a?.is_correct?'feedback-good':'feedback-wrong');play(a?.is_correct?'good':'wrong');if(!reduced()&&document.visibilityState!=='hidden'&&typeof navigator.vibrate==='function'){try{navigator.vibrate(a?.is_correct?35:[20,45,20]);}catch{}}}
}
function event(s,q){const host=$('hostEvent'),student=$('studentEvent');[host,student].forEach(el=>{el.textContent='';el.classList.add('hidden');});
 // Presentation only: authoritative time and scoring stay unchanged.
 if(s.room.phase!=='question'||!q)return;
 const isLast=s.room.current_index===s.room.question_ids.length-1;
 const text=isLast?'🏆 Dernière question':q.difficulty==='expert'&&s.room.current_index%3===1?'🧠 Question Expert':'';
 // The host preference applies to projection; students can always identify the last question.
 if(text){const el=s.host?host:student;if(!s.host||events){el.textContent=text;el.classList.remove('hidden');}}
}
function render(s,q){const next=key(s)+'/'+s.room.phase,fresh=phaseKey!==next;phaseKey=next;
 event(s,q);
 if(s.room.phase==='lobby'){if(s.host&&fresh&&once(next))play('lobby');}
 if(s.room.phase==='reveal'&&q){if(s.host){const hk=key(s)+'/'+JSON.stringify(s.distribution)+'/'+s.players.length;if(hk!==histogramKey){histogram(s,q);histogramKey=hk;}if(fresh&&once(next))play('reveal');}else feedback(s,fresh);}
 else if(s.room.phase==='finished'){if(s.host&&fresh&&once(next))play('podium');if(!s.host)$('studentFeedback').replaceChildren();}
}
function tick(s,ms){if(!s.host)return;const second=Math.ceil(ms/1000),id=key(s)+'/'+second;if(second>0&&second<=3&&id!==lastTick){lastTick=id;play('tick');}}
function leaders(el,players,avatarPath){const old=new Map([...el.children].map(row=>[row.dataset.id,{row,top:row.getBoundingClientRect().top}]));
 players.forEach((p,i)=>{const entry=old.get(p.id);let row=entry?.row;if(!row){row=document.createElement('div');row.className='leader-row';row.dataset.id=p.id;const rank=document.createElement('b'),name=document.createElement('span'),img=document.createElement('img'),text=document.createElement('span'),score=document.createElement('span');name.className='leader-name';img.className='avatar-thumb';img.alt='';name.append(img,text);row.append(rank,name,score);}
 row.children[0].textContent=i+1;row.children[1].children[0].src=avatarPath(p.avatar);row.children[1].children[1].textContent=p.name;row.children[2].textContent=p.score.toLocaleString('fr-FR')+' pts';el.append(row);
 });
 const ids=new Set(players.map(p=>p.id));old.forEach(({row},id)=>{if(!ids.has(id))row.remove();});
 if(!reduced())old.forEach(({row,top},id)=>{if(ids.has(id)){const dy=top-row.getBoundingClientRect().top;if(dy&&typeof row.animate==='function')row.animate([{transform:`translateY(${dy}px)`},{transform:'translateY(0)'}],{duration:420,easing:'ease-out'});}});
}
function clear(){phaseKey='';questionKey='';baseline=null;histogramKey='';lastTick='';stopAudio();$('answerHistogram').replaceChildren();$('answerHistogram').classList.add('hidden');$('studentFeedback').replaceChildren();}
window.ArenaClassroom={observe,render,tick,leaders,clear};
})();
