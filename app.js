(() => {
'use strict';
const $=id=>document.getElementById(id), C=window.ArenaCore;
const shapes=['◆','●','▲','■'], labels={mixed:'Mix pédagogique',medium:'Standard pédagogique',hard:'Difficile',expert:'Expert'};
const S={questions:[],catalog:{},room:null,players:[],player:null,host:false,answer:null,session:null,view:'viewLanding',offset:0,signature:'',sending:false,reuse:false,wake:null,wakePending:false};
const storage={get(k,session=false){try{return JSON.parse((session?sessionStorage:localStorage).getItem(k)||'null');}catch{return null;}},set(k,v,session=false){try{(session?sessionStorage:localStorage).setItem(k,JSON.stringify(v));return true;}catch{return false;}},del(k,session=false){try{(session?sessionStorage:localStorage).removeItem(k);}catch{}}};
let sb,sync,timer,toastTimer,commandBusy=false,avatar='avatar-01',pendingCreate=null,lastQR='',generation=0;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const avatarPath=id=>`assets/avatars/${/^avatar-(0[1-9]|1[0-9]|2[0-4])$/.test(id)?id:'avatar-01'}.webp`;
const avatarHTML=(id,cls='avatar-thumb')=>`<img class="${cls}" src="${avatarPath(id)}" alt="" draggable="false">`;
const qNow=()=>S.questions.find(q=>q.id===S.room?.question_ids?.[S.room.current_index]);
const now=()=>Date.now()+S.offset;
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),6000);}
function status(type,text){$('connectionPill').className='status-pill '+type;$('connectionText').textContent=text;}
function show(id){if(S.view!==id){S.view=id;document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));window.scrollTo(0,0);}wake();}
async function wake(){
 const useful=!!S.room&&['lobby','question','reveal'].includes(S.room.phase)&&document.visibilityState==='visible'&&S.view!=='viewLanding';
 if(!useful){if(S.wake){const lock=S.wake;S.wake=null;try{await lock.release();}catch{}}return;}
 if(!navigator.wakeLock||S.wake||S.wakePending)return;
 S.wakePending=true;
 try{const lock=await navigator.wakeLock.request('screen');S.wake=lock;lock.addEventListener('release',()=>{if(S.wake===lock)S.wake=null;});if(!S.room||!['lobby','question','reveal'].includes(S.room.phase)||S.view==='viewLanding'||document.visibilityState!=='visible')await lock.release();}catch{}finally{S.wakePending=false;}
}
function clearLive(){window.ArenaClassroom.clear();generation++;sync?.stop();clearInterval(timer);S.room=null;S.players=[];S.player=null;S.answer=null;S.signature='';S.sending=false;S.reuse=false;lastQR='';wake();}
function home(){clearLive();storage.del('ncr-v4-active',true);S.host=false;show('viewLanding');if(sb)status('polling','Prêt à rejoindre un live');}
function saveActive(token=null){storage.set('ncr-v4-active',{room:S.room?.id,host:S.host,token},true);}
function authUI(){const user=S.session?.user;$('trainerSessionBtn').classList.toggle('hidden',!user);$('trainerSessionText').textContent=user?.email||'Formateur';$('trainerEmailLabel').textContent=user?.email||'';}
async function trainer(){if(!sb){show('viewSetupNeeded');return false;}const {data,error}=await sb.auth.getSession();if(error)throw error;S.session=data.session;authUI();if(!S.session){show('viewTrainerLogin');return false;}return true;}
function friendly(e){const m=e?.message||'Erreur réseau';if(/ncr_v4|schema cache|function.*exist/i.test(m))return 'Installation V4 requise : exécute le fichier supabase.sql fourni dans ton projet Supabase.';if(/abort|fetch|network/i.test(m))return 'Connexion interrompue. Réessaie : les envois sont protégés contre les doublons.';return m;}
async function action(id,fn){if(commandBusy)return;commandBusy=true;const b=$(id);if(b)b.disabled=true;try{await fn();}catch(e){console.warn(e);toast(friendly(e));}finally{commandBusy=false;if(b)b.disabled=false;}}
function bind(id,fn){$(id).addEventListener('click',()=>action(id,fn));}
async function attach(room,host,token){clearLive();S.host=host;S.token=token;storage.set('ncr-v4-active',{room,host,token},true);status('polling','Connexion à la salle');await sync.attach(room,token);}
function accept(snapshot,offset){
 const r=snapshot.room;
 if(S.room&&r.id===S.room.id&&r.revision<S.room.revision)return;
 S.offset=offset;S.room=r;S.players=snapshot.players;S.answer=snapshot.answer;S.player=S.players.find(p=>p.id===snapshot.player_id)||null;S.answerCount=snapshot.answer_count;S.distribution=snapshot.distribution;
 saveActive(S.token);
 if(r.phase==='closed'){toast('Le formateur a fermé cette salle.');home();return;}
 if(!S.host&&!S.player){toast('Profil élève introuvable. Rejoins la salle avec son code.');home();return;}
 wake();
 const signature=[r.id,r.round,r.revision,S.host].join('/');const changed=signature!==S.signature;S.signature=signature;
 if(S.reuse&&r.phase==='finished')return;
 window.ArenaClassroom.observe(S);render(changed);window.ArenaClassroom.render(S,qNow());
}
function render(changed){
 const r=S.room;if(!r)return;
 if(r.phase==='lobby'){
  if(S.host){renderLobby();show('viewLobby');}else{$('studentName').textContent=S.player.name;$('studentAvatar').innerHTML=avatarHTML(S.player.avatar,'student-avatar-img');$('waitingScore').textContent=S.player.score;show('viewStudentWaiting');}
 }else if(r.phase==='question'){
  const q=qNow();if(!q){toast('Cette question est absente du fichier local. Recharge la version V4.');return;}
  if(changed)renderQuestion(q);
  if(S.host){$('hostAnswered').textContent=S.answerCount;$('hostTotalPlayers').textContent=S.players.length;}else{updateAnswerState();$('studentScore').textContent=`${S.player.score} pts`;}
 }else if(r.phase==='reveal')renderReveal();
 else if(r.phase==='finished'){if(S.host)renderPodium(changed);else renderStudentFinal();}
 if(changed)startTimer();
}
function renderLobby(){
 $('roomCode').textContent=S.room.code.slice(0,3)+' '+S.room.code.slice(3);
 const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('join',S.room.code);
 $('joinUrl').textContent=url.href;
 if(lastQR!==url.href){$('qrCode').replaceChildren();new QRCode($('qrCode'),{text:url.href,width:240,height:240,colorDark:'#081629',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});lastQR=url.href;}
 $('playerCount').textContent=S.players.length;
 const cloud=$('playerCloud'),existing=new Map([...cloud.children].map(el=>[el.dataset.id,el]));
 S.players.forEach(p=>{let el=existing.get(p.id);if(!el){el=document.createElement('div');el.className='player-chip';el.dataset.id=p.id;el.innerHTML=avatarHTML(p.avatar)+`<span>${escape(p.name)}</span>`;cloud.append(el);}existing.delete(p.id);});existing.forEach(el=>el.remove());
 $('emptyLobby').classList.toggle('hidden',S.players.length>0);$('startGameBtn').disabled=!S.players.length;
}
function renderQuestion(q){
 const r=S.room;S.sending=false;
 if(S.host){
  $('hostGameMeta').textContent=`${q.subject} · ${q.year} année · Chapitre ${q.chapter} · ${labels[q.difficulty]}`;
  $('hostProgress').textContent=`Question ${r.current_index+1} / ${r.question_ids.length}`;$('hostQuestionNumber').textContent=String(r.current_index+1).padStart(2,'0');$('hostQuestionText').textContent=q.question;
  $('hostChoices').innerHTML=q.choices.map((c,i)=>`<div class="answer-tile"><span class="shape">${"ABCD"[i]} ${shapes[i]}</span><span>${escape(c)}</span></div>`).join('');show('viewHostGame');
 }else{
  $('studentProgress').textContent=`Question ${r.current_index+1} / ${r.question_ids.length}`;$('studentQuestion').textContent=q.question;
  const choices=$('studentChoices');choices.replaceChildren();const key=C.questionKey(r);
  q.choices.forEach((c,i)=>{const b=document.createElement('button');b.className='student-answer';b.type='button';b.innerHTML=`<span class="shape">${"ABCD"[i]} ${shapes[i]}</span><span>${escape(c)}</span>`;b.addEventListener('click',()=>submit(i,key));choices.append(b);});show('viewStudentQuestion');
 }
}
function updateAnswerState(){
 const expired=C.remaining(S.room,now())<=0,disabled=!!S.answer||S.sending||expired;
 [...$('studentChoices').children].forEach((b,i)=>{b.disabled=disabled;b.classList.toggle('selected',S.answer?.answer_index===i);});
 const msg=$('submittedBox');msg.classList.toggle('hidden',!disabled);msg.textContent=S.answer?'✓ Réponse enregistrée':S.sending?'Envoi en cours':expired?'Temps écoulé · en attente de correction':'';
}
async function submit(choice,key){
 if(!S.room||S.host||S.sending||S.answer||S.room.phase!=='question'||C.questionKey(S.room)!==key||C.remaining(S.room,now())<=0)return;
 const room=S.room,token=S.token,epoch=generation;S.sending=true;updateAnswerState();
 try{
  const answer=await sync.rpc('answer',{p_room:room.id,p_token:token,p_round:room.round,p_index:room.current_index,p_choice:choice});
  if(epoch!==generation||C.questionKey(S.room)!==key)return;
  S.answer=answer;sync.request();
 }catch(e){if(epoch===generation){toast(friendly(e));sync.request();}}
 finally{if(epoch===generation&&C.questionKey(S.room)===key){S.sending=false;if(S.room.phase==='question')updateAnswerState();}}
}
function startTimer(){
 clearInterval(timer);if(S.room?.phase!=='question')return;
 const key=C.questionKey(S.room);let autoAt=0;
 const tick=()=>{if(S.room?.phase!=='question'||C.questionKey(S.room)!==key){clearInterval(timer);return;}
  const ms=C.remaining(S.room,now());window.ArenaClassroom.tick(S,ms);
  if(S.host){$('hostTimerBar').style.width=`${ms/(S.room.duration*1000)*100}%`;$('hostTimerText').textContent=`${Math.ceil(ms/1000)} s`;
   if(ms<=0&&Date.now()-autoAt>4000&&!commandBusy){autoAt=Date.now();action('revealBtn',()=>transition('reveal'));}
  }else{$('studentTimer').textContent=Math.ceil(ms/1000);if(ms<=0)updateAnswerState();}
 };tick();timer=setInterval(tick,250);
}
function correction(q){return `${q.explanation}${q.trap?' Piège : '+q.trap:''}`;}
function renderReveal(){
 clearInterval(timer);const q=qNow();if(!q)return;
 if(S.host){$('revealQuestion').textContent=q.question;$('revealAnswer').textContent=q.choices[q.answer];$('revealExplanation').textContent=correction(q);$('hostSource').textContent=sourceLabel(q);renderLeaders('leaderboardList',8);$('nextBtn').textContent=S.room.current_index===S.room.question_ids.length-1?'Afficher le podium →':'Question suivante →';show('viewReveal');}
 else{
  $('studentCorrectionBox').classList.remove('hidden');const ok=S.answer?.is_correct;$('studentResultIcon').textContent=ok?'✓':S.answer?'×':'—';$('studentResultIcon').classList.toggle('wrong',!ok);$('studentResultTitle').textContent=ok?'Bien joué !':S.answer?'À retenir':'Temps écoulé';
  $('studentCorrectText').textContent=q.choices[q.answer];$('studentExplanationText').textContent=q.explanation;$('studentTrapText').textContent=q.trap?'Piège : '+q.trap:'';$('studentNotionText').textContent=`${q.notionTitle} · ${sourceLabel(q)}`;
  $('studentYourAnswerRow').classList.toggle('hidden',!S.answer||ok);$('studentYourAnswerText').textContent=S.answer?q.choices[S.answer.answer_index]:'';
  $('studentRevealScore').textContent=S.player.score;$('studentSyncNote').textContent=ok?`+${S.answer.points} points · La suite arrive automatiquement.`:'La suite arrive automatiquement.';show('viewStudentReveal');
 }
}
function sourceLabel(q){return `Manuel ${q.subject} ${q.year} · p. ${q.source.page}${q.source.endPage>q.source.page?'–'+q.source.endPage:''} · repère ${q.notion}`;}
function renderLeaders(id,limit=100){window.ArenaClassroom.leaders($(id),S.players.slice(0,limit),avatarPath);}
function renderPodium(changed){
 clearInterval(timer);show('viewPodium');if(!changed)return;
 $('podium').innerHTML=[1,0,2].filter(i=>S.players[i]).map(i=>{const p=S.players[i];return `<div class="podium-slot p${i+1}"><div class="avatar">${avatarHTML(p.avatar,'podium-avatar-img')}</div><strong>${escape(p.name)}</strong><span>${p.score} pts</span><div class="podium-block">${i+1}</div></div>`;}).join('');
 renderLeaders('finalList');const fx=$('podiumFx');fx.replaceChildren();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(let i=0;i<22;i++){const d=document.createElement('span');d.className='confetti';d.style.left=`${i*4.5}%`;d.style.animationDelay=`${i%4*.15}s`;fx.append(d);}
}
function renderStudentFinal(){clearInterval(timer);const rank=S.players.findIndex(p=>p.id===S.player.id)+1;$('studentCorrectionBox').classList.add('hidden');$('studentResultIcon').textContent=rank===1?'★':'✓';$('studentResultIcon').classList.remove('wrong');$('studentResultTitle').textContent=`${rank}${rank===1?'er':'e'} sur ${S.players.length}`;$('studentRevealScore').textContent=S.player.score;$('studentSyncNote').textContent='Manche terminée. Reste ici : ton formateur peut relancer avec la même classe.';show('viewStudentReveal');}
async function transition(action,settings=null){if(!S.room||!S.host||!await trainer())return;const r=S.room;await sync.rpc('transition',{p_room:r.id,p_revision:r.revision,p_action:action,p_settings:settings});if(S.room?.id===r.id){S.reuse=false;await sync.pull();sync.request();}}
function pool(){return S.questions.filter(q=>q.subject===$('subjectSelect').value&&q.year===$('yearSelect').value&&q.chapter===$('chapterSelect').value&&($('sessionSelect').value==='all'||q.session===$('sessionSelect').value));}
function fillChapters(){const chapters=S.catalog[$('subjectSelect').value]?.[$('yearSelect').value]||{};$('chapterSelect').innerHTML=Object.entries(chapters).map(([id,c])=>`<option value="${id}">Chapitre ${id} — ${escape(c.title)}</option>`).join('');fillSessions();}
function fillSessions(){const ch=S.catalog[$('subjectSelect').value]?.[$('yearSelect').value]?.[$('chapterSelect').value];$('sessionSelect').innerHTML='<option value="all">Tout le chapitre</option>'+Object.entries(ch?.sessions||{}).map(([id,s])=>`<option value="${id}">Séance ${id} · ${s.questionCount} questions</option>`).join('');availability();}
function availability(){pendingCreate=null;const qs=pool(),level=$('difficultySelect').value,eligible=qs.filter(q=>level==='mixed'||q.difficulty===level),n=C.pick(eligible,+$('countSelect').value,level).length;const counts=Object.fromEntries(['medium','hard','expert'].map(l=>[l,qs.filter(q=>q.difficulty===l).length]));
 $('availability').innerHTML=`<strong>${n} questions seront jouées</strong><br>Standard ${counts.medium} · Difficile ${counts.hard} · Expert ${counts.expert}${n<+$('countSelect').value?'<br>La sélection est réduite pour respecter le niveau et éviter les variantes proches.':''}`;
 $('createRoomBtn').disabled=!n;$('previewMeta').textContent=`${$('subjectSelect').value} · ${$('yearSelect').value} année · ${labels[level]}`;$('previewChapter').textContent=S.catalog[$('subjectSelect').value]?.[$('yearSelect').value]?.[$('chapterSelect').value]?.title||'—';
}
function settingsFromForm(){return {subject:$('subjectSelect').value,year:$('yearSelect').value,chapter:$('chapterSelect').value,session:$('sessionSelect').value==='all'?null:$('sessionSelect').value,difficulty:$('difficultySelect').value,duration:+$('durationSelect').value};}
function selectQuestions(settings,count,previous=[]){const qs=S.questions.filter(q=>q.subject===settings.subject&&q.year===settings.year&&q.chapter===settings.chapter&&(!settings.session||q.session===settings.session));return C.pick(qs,count,settings.difficulty,storage.get('ncr-v4-history')||[],previous);}
function remember(picked){const ids=picked.map(q=>q.id),history=storage.get('ncr-v4-history')||[];storage.set('ncr-v4-history',[...ids,...history.filter(id=>!ids.includes(id))].slice(0,1200));}
function setup(reuse=false){S.reuse=reuse;$('createRoomBtn').textContent=reuse?'Préparer la nouvelle manche →':'Créer le live →';fillChapters();show('viewHostSetup');}
async function create(){if(!await trainer())return;const settings=settingsFromForm(),picked=selectQuestions(settings,+$('countSelect').value);if(!picked.length){toast('Aucune question pour ce filtre. Change la séance ou le niveau.');return;}settings.question_ids=picked.map(q=>q.id);
 if(S.reuse&&S.room){await transition('reset',settings);remember(picked);return;}
 if(!pendingCreate)pendingCreate={id:crypto.randomUUID(),settings};
 const id=await sync.rpc('create',{p_settings:pendingCreate.settings,p_request:pendingCreate.id});remember(picked);pendingCreate=null;await attach(id,true,null);
}
async function join(){if(!sb){show('viewSetupNeeded');return;}const code=$('joinCodeInput').value.replace(/\D/g,''),name=$('joinNameInput').value.trim();if(code.length!==6||name.length<2){$('joinMessage').textContent='Entre un code à 6 chiffres et un prénom (2 à 24 caractères).';return;}
 const key='ncr-v4-device-'+code;let token=storage.get(key);if(!token){token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');if(!storage.set(key,token))toast('Stockage indisponible : garde cet onglet ouvert pour conserver ton profil.');}
 const id=await sync.rpc('join',{p_code:code,p_name:name,p_avatar:avatar,p_token:token});await attach(id,false,token);
}
async function boot(){
 try{
  const files=await Promise.all(['questions.json','catalog.json'].map(async f=>{const r=await fetch(f,{cache:'no-cache'});if(!r.ok)throw Error('Fichier manquant : '+f);return r.json();}));
  S.questions=files[0];S.catalog=files[1];C.validateBank(S.questions);$('statQuestions').textContent=S.questions.length.toLocaleString('fr-FR');
  const config=window.NCR_CONFIG;if(!config?.SUPABASE_URL||!config?.SUPABASE_ANON_KEY||!window.supabase){status('offline','Configuration requise');return;}
  sb=window.supabase.createClient(config.SUPABASE_URL,config.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  sync=new ArenaSync(sb,accept,status,e=>{home();toast(friendly(e));});
  sb.auth.onAuthStateChange((event,session)=>{S.session=session;authUI();if(event==='SIGNED_OUT'&&S.host){home();show('viewTrainerLogin');}});
  const {data}=await sb.auth.getSession();S.session=data.session;authUI();status('polling','Prêt à rejoindre un live');
  const joinCode=new URL(location.href).searchParams.get('join');const saved=storage.get('ncr-v4-active',true);
  if(saved?.room&&(!saved.host||S.session)&&(!joinCode||storage.get('ncr-v4-device-'+joinCode)===saved.token)){await attach(saved.room,saved.host,saved.token);return;}
  if(joinCode){$('joinCodeInput').value=joinCode.replace(/\D/g,'').slice(0,6);show('viewJoin');}
 }catch(e){status('offline','Chargement impossible');toast(friendly(e));}
}
// Événements permanents, installés une seule fois.
document.querySelectorAll('[data-home]').forEach(b=>b.addEventListener('click',home));$('brandHome').addEventListener('click',home);
bind('hostEntry',async()=>{if(await trainer()){clearLive();S.host=true;setup();}});
bind('joinEntry',async()=>{clearLive();S.host=false;show(sb?'viewJoin':'viewSetupNeeded');});
bind('trainerLoginBtn',async()=>{const email=$('trainerEmailInput').value.trim(),password=$('trainerPasswordInput').value;if(!email||!password){$('trainerLoginMessage').textContent='Renseigne ton e-mail et ton mot de passe.';return;}const {data,error}=await sb.auth.signInWithPassword({email,password});if(error){$('trainerLoginMessage').textContent='Connexion impossible. Vérifie tes identifiants et le réseau.';return;}S.session=data.session;$('trainerPasswordInput').value='';authUI();S.host=true;setup();});
$('trainerPasswordInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('trainerLoginBtn').click();});
$('trainerLoginBackBtn').addEventListener('click',home);
bind('trainerLogoutBtn',async()=>{const {error}=await sb.auth.signOut();if(error)throw error;home();});
bind('trainerSessionBtn',async()=>{if(await trainer()){if(S.room&&S.host){S.reuse=false;S.signature='';render(true);}else{clearLive();S.host=true;setup();}}});
['subjectSelect','yearSelect'].forEach(id=>$(id).addEventListener('change',fillChapters));$('chapterSelect').addEventListener('change',fillSessions);['sessionSelect','difficultySelect','countSelect','durationSelect'].forEach(id=>$(id).addEventListener('change',availability));
bind('createRoomBtn',create);bind('joinRoomBtn',join);$('joinCodeInput').addEventListener('input',e=>e.target.value=e.target.value.replace(/\D/g,'').slice(0,6));
for(let i=1;i<=24;i++){const id='avatar-'+String(i).padStart(2,'0'),b=document.createElement('button');b.type='button';b.className='avatar-option'+(i===1?' selected':'');b.setAttribute('aria-label','Avatar '+i);b.setAttribute('aria-pressed',i===1?'true':'false');b.innerHTML=avatarHTML(id);b.addEventListener('click',()=>{avatar=id;[...$('avatarPicker').children].forEach(el=>{el.classList.toggle('selected',el===b);el.setAttribute('aria-pressed',el===b?'true':'false');});});$('avatarPicker').append(b);}
bind('startGameBtn',()=>transition('start'));bind('revealBtn',()=>transition('reveal'));bind('nextBtn',()=>transition('next'));
bind('replaySameBtn',async()=>{const r=S.room;if(!r)return;const picked=selectQuestions(r,r.question_ids.length,r.question_ids);await transition('reset',{...r,question_ids:picked.map(q=>q.id)});remember(picked);});
bind('changeQuizKeepPlayersBtn',async()=>{if(await trainer()){setup(true);$('subjectSelect').value=S.room.subject;$('yearSelect').value=S.room.year;fillChapters();$('chapterSelect').value=S.room.chapter;fillSessions();$('sessionSelect').value=S.room.session||'all';$('difficultySelect').value=S.room.difficulty;availability();}});
bind('newGameBtn',async()=>{if(!await trainer())return;await transition('close');clearLive();S.host=true;setup();});
bind('closeRoomBtn',()=>transition('close'));
const resume=()=>{wake();sync?.request();};document.addEventListener('visibilitychange',resume);['pageshow','online','focus'].forEach(e=>window.addEventListener(e,resume));window.addEventListener('offline',()=>status('offline','Hors connexion · reprise automatique'));window.addEventListener('pagehide',()=>{if(S.wake)S.wake.release().catch(()=>{});});
boot();
})();
