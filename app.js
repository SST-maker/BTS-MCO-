(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const views = [...document.querySelectorAll('.view')];
  const shapes = ['◆','●','▲','■'];
  const avatars = [
    ['avatar-01','Robot Boost'],['avatar-02','Robot Zen'],['avatar-03','Robot Wink'],['avatar-04','Robot Cool'],['avatar-05','Robot Scholar'],['avatar-06','Robot Hero'],
    ['avatar-07','Chat'],['avatar-08','Chien'],['avatar-09','Panda'],['avatar-10','Pingouin'],['avatar-11','Renard'],['avatar-12','Lapin'],
    ['avatar-13','Monstre Vert'],['avatar-14','Cyclope Violet'],['avatar-15','Monstre Bleu'],['avatar-16','Monstre Cœur'],['avatar-17','Alien Jaune'],['avatar-18','Monstre DJ'],
    ['avatar-19','Robot Spatial'],['avatar-20','Alien UFO'],['avatar-21','Chat Astronaute'],['avatar-22','Requin Cool'],['avatar-23','Licorne'],['avatar-24','Hibou Diplômé']
  ].map(([id,label])=>({id,label,src:`assets/avatars/${id}.webp`}));
  const defaultAvatar = avatars[0].id;
  function avatarPath(id){ return (avatars.find(a=>a.id===id)||avatars[0]).src; }
  function avatarMarkup(id, cls=''){ return `<img${cls?` class="${cls}"`:''} src="${avatarPath(id)}" alt="" draggable="false">`; }
  const state = {
    questions: [], catalog: {}, sb: null, room: null, player: null,
    host: false, subscriptions: [], timer: null, hostSelected: [],
    answered: new Map(), currentQuestionId: null, players: [], selectedAvatar: defaultAvatar, reuseRoom: false,
    wakeLock: null, wakeNoticeShown: false
  };

  const wakeViews = new Set(['viewLobby','viewHostGame','viewReveal','viewPodium','viewStudentWaiting','viewStudentQuestion','viewStudentReveal']);
  function show(id){
    views.forEach(v => v.classList.toggle('active', v.id === id));
    window.scrollTo({top:0,behavior:'auto'});
    syncWakeLock(id);
  }
  async function requestWakeLock(){
    try{
      if(!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      if(state.wakeLock) return;
      state.wakeLock = await navigator.wakeLock.request('screen');
      state.wakeLock.addEventListener('release',()=>{ state.wakeLock=null; });
      if(!state.wakeNoticeShown){ state.wakeNoticeShown=true; toast('Mode écran éveillé activé.'); }
    }catch(err){
      console.warn('WakeLock unavailable', err);
    }
  }
  async function releaseWakeLock(){
    try{ if(state.wakeLock){ await state.wakeLock.release(); state.wakeLock=null; } }catch(err){ console.warn(err); }
  }
  function syncWakeLock(activeId){
    const id = activeId || document.querySelector('.view.active')?.id;
    if(wakeViews.has(id)) requestWakeLock();
    else releaseWakeLock();
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible') syncWakeLock(); else releaseWakeLock();
  });
  function toast(msg){
    const t=$('toast'); t.textContent=msg; t.classList.add('show');
    clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove('show'),2600);
  }
  function shuffle(a){
    const arr=[...a]; for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];} return arr;
  }
  function cleanCode(v){ return (v||'').replace(/\D/g,'').slice(0,6); }
  function formatCode(v){ const c=cleanCode(v); return c.length>3?`${c.slice(0,3)} ${c.slice(3)}`:c; }
  function currentQ(){
    if(!state.room || state.room.current_index < 0) return null;
    const id=state.room.question_ids?.[state.room.current_index];
    return state.questions.find(q=>q.id===id) || null;
  }
  function hasConfig(){
    const c=window.NCR_CONFIG||{};
    return !!(c.SUPABASE_URL && c.SUPABASE_ANON_KEY && !c.SUPABASE_URL.includes('YOUR_'));
  }
  function setConnection(status,text){
    const p=$('connectionPill'); p.classList.remove('online','offline'); p.classList.add(status); $('connectionText').textContent=text;
  }
  function supa(){
    if(!state.sb){
      if(!hasConfig()) return null;
      state.sb=window.supabase.createClient(window.NCR_CONFIG.SUPABASE_URL,window.NCR_CONFIG.SUPABASE_ANON_KEY,{realtime:{params:{eventsPerSecond:15}}});
    }
    return state.sb;
  }
  async function loadData(){
    const [q,c]=await Promise.all([fetch('questions.json').then(r=>r.json()),fetch('catalog.json').then(r=>r.json())]);
    state.questions=q; state.catalog=c; initAvatarPicker();
    $('statQuestions').textContent=q.length.toLocaleString('fr-FR');
    if(hasConfig()){ setConnection('online','Prêt pour le live'); supa(); }
    else setConnection('offline','Supabase à connecter');
  }

  function home(){
    cleanupSubscriptions(); state.host=false; state.room=null; state.player=null; state.players=[]; state.reuseRoom=false; state.answered.clear(); clearInterval(state.timer); releaseWakeLock(); show('viewLanding');
  }
  document.querySelectorAll('[data-home]').forEach(b=>b.addEventListener('click',home));
  $('brandHome').addEventListener('click',home);
  $('newGameBtn').addEventListener('click',()=>{cleanupSubscriptions();state.room=null;state.player=null;state.players=[];state.reuseRoom=false;state.answered.clear();state.host=true;$('createRoomBtn').innerHTML='Créer le live <span>→</span>';refreshHostSelectors();show('viewHostSetup');});

  $('hostEntry').addEventListener('click',()=>{
    if(!hasConfig()){ show('viewSetupNeeded'); return; }
    state.host=true; state.reuseRoom=false; $('createRoomBtn').innerHTML='Créer le live <span>→</span>'; refreshHostSelectors(); show('viewHostSetup');
  });
  $('joinEntry').addEventListener('click',()=>{
    if(!hasConfig()){ show('viewSetupNeeded'); return; }
    state.host=false; show('viewJoin');
  });


  function initAvatarPicker(){
    const box=$('avatarPicker'); if(!box)return; box.innerHTML='';
    avatars.forEach((avatar,i)=>{const b=document.createElement('button');b.type='button';b.className='avatar-option';b.dataset.avatar=avatar.id;b.innerHTML=avatarMarkup(avatar.id);b.setAttribute('aria-label',avatar.label);b.setAttribute('title',avatar.label);b.setAttribute('aria-pressed',avatar.id===state.selectedAvatar?'true':'false');b.classList.toggle('selected',avatar.id===state.selectedAvatar);b.addEventListener('click',()=>{state.selectedAvatar=avatar.id;[...box.children].forEach(x=>{const on=x.dataset.avatar===avatar.id;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',on?'true':'false');});});box.appendChild(b);});
  }

  // HOST SETUP
  const selectorIds=['subjectSelect','yearSelect','chapterSelect','sessionSelect','countSelect'];
  selectorIds.forEach(id=>$(id).addEventListener('change',()=>{
    if(id==='subjectSelect'||id==='yearSelect') fillChapters();
    else if(id==='chapterSelect') fillSessions();
    updateAvailability();
  }));
  function refreshHostSelectors(){
    fillChapters(); fillSessions(); updateAvailability();
  }
  function fillChapters(){
    const subject=$('subjectSelect').value, year=$('yearSelect').value;
    const chapters=state.catalog?.[subject]?.[year]||{};
    const select=$('chapterSelect'); const prev=select.value; select.innerHTML='';
    Object.entries(chapters).sort((a,b)=>Number(a[0])-Number(b[0])).forEach(([code,data])=>{
      const o=document.createElement('option');o.value=code;o.textContent=`Chapitre ${code} — ${data.title}`;select.appendChild(o);
    });
    if([...select.options].some(o=>o.value===prev)) select.value=prev;
    fillSessions();
  }
  function fillSessions(){
    const s=$('subjectSelect').value,y=$('yearSelect').value,c=$('chapterSelect').value;
    const sessions=state.catalog?.[s]?.[y]?.[c]?.sessions||{};
    const select=$('sessionSelect');select.innerHTML='';
    const all=document.createElement('option');all.value='all';all.textContent='Tout le chapitre';select.appendChild(all);
    Object.keys(sessions).sort((a,b)=>Number(a)-Number(b)).forEach(sess=>{
      const o=document.createElement('option');o.value=sess;o.textContent=`Séance ${sess} • ${sessions[sess].questionCount} questions`;select.appendChild(o);
    });
    updateAvailability();
  }
  function filteredQuestions(){
    const s=$('subjectSelect').value,y=$('yearSelect').value,c=$('chapterSelect').value,sess=$('sessionSelect').value;
    return state.questions.filter(q=>q.subject===s&&q.year===y&&q.chapter===c&&(sess==='all'||q.session===sess));
  }
  function updateAvailability(){
    const available=filteredQuestions(); const n=Math.min(Number($('countSelect').value||10),available.length);
    const s=$('subjectSelect').value,y=$('yearSelect').value,c=$('chapterSelect').value,sess=$('sessionSelect').value;
    const ch=state.catalog?.[s]?.[y]?.[c];
    $('availability').innerHTML=`<strong>${available.length}</strong> questions disponibles • <strong>${n}</strong> seront jouées${available.length<n?'':' en aléatoire'}.`;
    $('previewMeta').textContent=`${s} • ${y} année${sess==='all'?'':` • séance ${sess}`}`;
    $('previewChapter').textContent=ch?.title||'—';
  }

  $('createRoomBtn').addEventListener('click',createRoom);
  async function createRoom(){
    const sb=supa(); if(!sb){show('viewSetupNeeded');return;}
    const pool=filteredQuestions(); if(!pool.length){toast('Aucune question disponible pour ce filtre.');return;}
    const count=Math.min(Number($('countSelect').value),pool.length);
    const picked=shuffle(pool).slice(0,count);
    $('createRoomBtn').disabled=true; $('createRoomBtn').innerHTML=state.reuseRoom?'Préparation de la manche…':'Création…';
    if(state.reuseRoom && state.room){
      const ok=await resetRoomWithPlayers(picked,{
        subject:$('subjectSelect').value,year:$('yearSelect').value,chapter:$('chapterSelect').value,
        session:$('sessionSelect').value==='all'?null:$('sessionSelect').value,duration:Number($('durationSelect').value)
      });
      $('createRoomBtn').disabled=false; $('createRoomBtn').innerHTML='Créer le live <span>→</span>';
      if(ok){state.reuseRoom=false;renderLobby();requestWakeLock();show('viewLobby');}
      return;
    }
    const code=String(Math.floor(100000+Math.random()*900000));
    const payload={code,subject:$('subjectSelect').value,year:$('yearSelect').value,chapter:$('chapterSelect').value,session:$('sessionSelect').value==='all'?null:$('sessionSelect').value,question_ids:picked.map(q=>q.id),duration:Number($('durationSelect').value),phase:'lobby',current_index:-1,question_started_at:null};
    let {data,error}=await sb.from('quiz_rooms').insert(payload).select().single();
    if(error && String(error.message).toLowerCase().includes('duplicate')){
      payload.code=String(Math.floor(100000+Math.random()*900000));
      ({data,error}=await sb.from('quiz_rooms').insert(payload).select().single());
    }
    $('createRoomBtn').disabled=false; $('createRoomBtn').innerHTML='Créer le live <span>→</span>';
    if(error){console.error(error);toast('Impossible de créer la salle. Vérifie Supabase.');return;}
    state.room=data; state.hostSelected=picked; state.host=true; state.answered.clear();
    await subscribeRoom(data.id); await refreshPlayers(); renderLobby(); requestWakeLock(); show('viewLobby');
  }

  async function resetRoomWithPlayers(picked,settings){
    const sb=supa(); if(!sb||!state.room)return false;
    const roomId=state.room.id;
    const {error:aErr}=await sb.from('quiz_answers').delete().eq('room_id',roomId);
    if(aErr){console.error(aErr);toast('Impossible de remettre les réponses à zéro. Mets à jour supabase.sql.');return false;}
    const {error:pErr}=await sb.from('quiz_players').update({score:0,streak:0}).eq('room_id',roomId);
    if(pErr){console.error(pErr);toast('Impossible de remettre les scores à zéro.');return false;}
    state.answered.clear(); state.hostSelected=picked;
    const data=await updateRoom({...settings,question_ids:picked.map(q=>q.id),phase:'lobby',current_index:-1,question_started_at:null});
    if(!data)return false; await refreshPlayers(); return true;
  }

  async function replaySameClass(){
    if(!state.room)return;
    const room=state.room;
    const pool=state.questions.filter(q=>q.subject===room.subject&&q.year===room.year&&q.chapter===room.chapter&&(!room.session||q.session===room.session));
    const count=Math.min(room.question_ids?.length||10,pool.length); const old=new Set(room.question_ids||[]);
    const fresh=shuffle(pool.filter(q=>!old.has(q.id))); const previous=shuffle(pool.filter(q=>old.has(q.id)));
    const picked=[...fresh,...previous].slice(0,count);
    $('replaySameBtn').disabled=true; $('replaySameBtn').textContent='Préparation…';
    const ok=await resetRoomWithPlayers(picked,{subject:room.subject,year:room.year,chapter:room.chapter,session:room.session,duration:room.duration});
    $('replaySameBtn').disabled=false; $('replaySameBtn').textContent='↻ Rejouer avec la même classe';
    if(ok){renderLobby();show('viewLobby');}
  }

  function changeQuizKeepPlayers(){
    if(!state.room)return; state.reuseRoom=true; state.host=true;
    $('subjectSelect').value=state.room.subject; $('yearSelect').value=state.room.year; fillChapters();
    $('chapterSelect').value=state.room.chapter; fillSessions(); $('sessionSelect').value=state.room.session||'all';
    const wanted=String(state.room.question_ids?.length||10); if([...$('countSelect').options].some(o=>o.value===wanted))$('countSelect').value=wanted;
    $('durationSelect').value=String(state.room.duration||30); updateAvailability();
    $('createRoomBtn').innerHTML='Relancer avec la classe <span>→</span>'; show('viewHostSetup');
  }

  $('replaySameBtn').addEventListener('click',replaySameClass);
  $('changeQuizKeepPlayersBtn').addEventListener('click',changeQuizKeepPlayers);

  function renderLobby(){
    if(!state.room)return;
    $('roomCode').textContent=formatCode(state.room.code);
    const base=location.protocol==='file:'?'':`${location.origin}${location.pathname}`;
    const url=base?`${base}?join=${state.room.code}`:`Déploie le dossier pour générer le lien élève`;
    $('joinUrl').textContent=url;
    $('qrCode').innerHTML='';
    if(base && window.QRCode) new QRCode($('qrCode'),{text:url,width:220,height:220,colorDark:'#071326',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
    renderPlayers();
  }
  function renderPlayers(){
    $('playerCount').textContent=state.players.length; $('hostTotalPlayers').textContent=state.players.length;
    const cloud=$('playerCloud');cloud.innerHTML='';
    state.players.forEach(p=>{const el=document.createElement('span');el.className='player-chip';el.innerHTML=`<i>${avatarMarkup(p.avatar,'avatar-thumb')}</i><span>${escapeHtml(p.name)}</span>`;cloud.appendChild(el);});
    $('startGameBtn').disabled=state.players.length===0;
  }
  $('startGameBtn').addEventListener('click',async()=>{
    if(!state.room||!state.players.length)return;
    await updateRoom({phase:'question',current_index:0,question_started_at:new Date().toISOString()});
  });

  // REALTIME
  async function subscribeRoom(roomId){
    cleanupSubscriptions(); const sb=supa(); if(!sb)return;
    const channel=sb.channel(`ncr-room-${roomId}-${Math.random()}`)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'quiz_rooms',filter:`id=eq.${roomId}`},async payload=>{
        state.room=payload.new;
        if(state.host){
          if(state.room.phase==='question') await renderHostQuestion();
          else if(state.room.phase==='reveal') await renderHostReveal();
          else if(state.room.phase==='finished') await renderPodium();
          else if(state.room.phase==='lobby'){await refreshPlayers();renderLobby();show('viewLobby');}
        }else await renderStudentFromRoom();
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'quiz_players',filter:`room_id=eq.${roomId}`},async()=>{await refreshPlayers(); if(state.host&&state.room?.phase==='lobby')renderPlayers(); if(state.host&&state.room?.phase==='reveal')await renderLeaderboard();})
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'quiz_answers',filter:`room_id=eq.${roomId}`},async()=>{if(state.host&&state.room?.phase==='question')await refreshAnswerCount();});
    channel.subscribe(); state.subscriptions=[channel];
  }
  function cleanupSubscriptions(){
    const sb=state.sb; if(sb) state.subscriptions.forEach(c=>sb.removeChannel(c)); state.subscriptions=[];
  }
  async function updateRoom(patch){
    const {data,error}=await supa().from('quiz_rooms').update(patch).eq('id',state.room.id).select().single();
    if(error){console.error(error);toast('Erreur de synchronisation.');return null;} state.room=data; return data;
  }
  async function refreshPlayers(){
    if(!state.room)return; const {data}=await supa().from('quiz_players').select('*').eq('room_id',state.room.id).order('score',{ascending:false}).order('created_at',{ascending:true}); state.players=data||[];
    if(state.player){ const fresh=state.players.find(p=>p.id===state.player.id); if(fresh)state.player=fresh; }
  }
  async function refreshAnswerCount(){
    const q=currentQ(); if(!q)return; const {count}=await supa().from('quiz_answers').select('*',{count:'exact',head:true}).eq('room_id',state.room.id).eq('question_id',q.id); $('hostAnswered').textContent=count||0;
  }

  // HOST GAME
  async function renderHostQuestion(){
    const q=currentQ(); if(!q)return; requestWakeLock(); show('viewHostGame'); clearInterval(state.timer);
    $('hostGameMeta').textContent=`${q.subject} • ${q.year} année • chapitre ${q.chapter} • séance ${q.session}`;
    $('hostProgress').textContent=`Question ${state.room.current_index+1} / ${state.room.question_ids.length}`;
    $('hostQuestionNumber').textContent=String(state.room.current_index+1).padStart(2,'0'); $('hostQuestionText').textContent=q.question;
    const g=$('hostChoices');g.innerHTML='';q.choices.forEach((c,i)=>{const d=document.createElement('div');d.className='answer-tile';d.innerHTML=`<span class="shape">${shapes[i]}</span><span>${escapeHtml(c)}</span>`;g.appendChild(d);});
    await refreshPlayers(); await refreshAnswerCount(); startHostTimer();
  }
  function startHostTimer(){
    clearInterval(state.timer); const duration=state.room.duration||30; const start=new Date(state.room.question_started_at).getTime();
    const tick=async()=>{
      if(state.room?.phase!=='question'){clearInterval(state.timer);return;}
      const elapsed=(Date.now()-start)/1000, remain=Math.max(0,duration-elapsed); $('hostTimerBar').style.width=`${Math.max(0,remain/duration*100)}%`;
      if(remain<=0){clearInterval(state.timer); if(state.host) await revealQuestion();}
    }; tick(); state.timer=setInterval(tick,200);
  }
  $('revealBtn').addEventListener('click',revealQuestion);
  async function revealQuestion(){ if(state.room?.phase==='question') await updateRoom({phase:'reveal'}); }
  async function renderHostReveal(){
    clearInterval(state.timer); const q=currentQ(); if(!q)return; requestWakeLock(); show('viewReveal');
    $('revealQuestion').textContent=q.question; $('revealAnswer').textContent=`${shapes[q.answer]} ${q.choices[q.answer]}`; $('revealExplanation').textContent=q.explanation;
    await refreshPlayers(); await renderLeaderboard();
    const last=state.room.current_index>=state.room.question_ids.length-1; $('nextBtn').innerHTML=last?'Afficher le podium <span>🏆</span>':'Question suivante <span>→</span>';
  }
  async function renderLeaderboard(){
    await refreshPlayers(); const list=$('leaderboardList'); list.innerHTML='';
    state.players.slice(0,8).forEach((p,i)=>{const r=document.createElement('div');r.className='leader-row';r.innerHTML=`<b>${i+1}</b><span class="leader-name"><i>${avatarMarkup(p.avatar,'avatar-thumb')}</i>${escapeHtml(p.name)}</span><span>${p.score.toLocaleString('fr-FR')} pts</span>`;list.appendChild(r);});
  }
  $('nextBtn').addEventListener('click',async()=>{
    if(!state.room)return; const last=state.room.current_index>=state.room.question_ids.length-1;
    if(last) await updateRoom({phase:'finished'}); else await updateRoom({phase:'question',current_index:state.room.current_index+1,question_started_at:new Date().toISOString()});
  });
  async function renderPodium(){
    clearInterval(state.timer); await refreshPlayers(); requestWakeLock(); show('viewPodium'); triggerPodiumFx(); const sorted=[...state.players].sort((a,b)=>b.score-a.score);
    const podium=$('podium'); podium.innerHTML=''; const order=[1,0,2];
    order.forEach(idx=>{const p=sorted[idx];if(!p)return;const place=idx+1;const d=document.createElement('div');d.className=`podium-slot p${place}`;d.innerHTML=`<div class="avatar">${avatarMarkup(p.avatar,'podium-avatar-img')}</div><strong>${escapeHtml(p.name)}</strong><span>${p.score.toLocaleString('fr-FR')} pts</span><div class="podium-block">${place===1?'🥇':place===2?'🥈':'🥉'}</div>`;podium.appendChild(d);});
    const final=$('finalList');final.innerHTML='<span class="eyebrow">CLASSEMENT COMPLET</span>';sorted.forEach((p,i)=>{const r=document.createElement('div');r.className='leader-row';r.innerHTML=`<b>${i+1}</b><span class="leader-name"><i>${avatarMarkup(p.avatar,'avatar-thumb')}</i>${escapeHtml(p.name)}</span><span>${p.score.toLocaleString('fr-FR')} pts</span>`;final.appendChild(r);});
  }


  function triggerPodiumFx(){
    const box=$('podiumFx'); if(!box) return; box.innerHTML='';
    const total=52;
    for(let i=0;i<total;i++){
      const piece=document.createElement('span');
      piece.className='confetti';
      const left=(i*(100/total)) + (Math.random()*4-2);
      const delay=(Math.random()*1.3).toFixed(2);
      const dur=(2.7 + Math.random()*2.3).toFixed(2);
      const drift=(Math.random()*160-80).toFixed(0);
      const rot=(Math.random()*540-270).toFixed(0);
      piece.style.left=`${Math.max(-4,Math.min(100,left))}%`;
      piece.style.setProperty('--delay', `${delay}s`);
      piece.style.setProperty('--dur', `${dur}s`);
      piece.style.setProperty('--drift', `${drift}px`);
      piece.style.setProperty('--rot', `${rot}deg`);
      box.appendChild(piece);
    }
  }

  // STUDENT JOIN
  $('joinCodeInput').addEventListener('input',e=>{e.target.value=cleanCode(e.target.value)});
  $('joinRoomBtn').addEventListener('click',joinRoom);
  async function joinRoom(){
    const code=cleanCode($('joinCodeInput').value), name=$('joinNameInput').value.trim(); const msg=$('joinMessage');msg.textContent='';
    if(code.length!==6||name.length<2){msg.textContent='Entre le code à 6 chiffres et ton prénom.';return;}
    const sb=supa(); if(!sb){show('viewSetupNeeded');return;}
    $('joinRoomBtn').disabled=true;
    const {data:room,error}=await sb.from('quiz_rooms').select('*').eq('code',code).maybeSingle();
    if(error||!room){msg.textContent='Partie introuvable. Vérifie le code.';$('joinRoomBtn').disabled=false;return;}
    if(room.phase==='finished'){msg.textContent='Cette partie est terminée.';$('joinRoomBtn').disabled=false;return;}
    const {data:player,error:pErr}=await sb.from('quiz_players').insert({room_id:room.id,name:name.slice(0,24),avatar:state.selectedAvatar}).select().single();
    $('joinRoomBtn').disabled=false;
    if(pErr){console.error(pErr);msg.textContent='Impossible de rejoindre la partie.';return;}
    state.room=room;state.player=player;state.host=false;localStorage.setItem(`ncr-player-${room.id}`,player.id);requestWakeLock();await subscribeRoom(room.id);await renderStudentFromRoom();
  }

  async function renderStudentFromRoom(){
    if(!state.room||!state.player)return; await refreshPlayers();
    if(state.room.phase==='lobby'){
      if(state.room.current_index===-1)state.answered.clear(); $('studentName').textContent=state.player.name;$('studentAvatar').innerHTML=avatarMarkup(state.player.avatar,'student-avatar-img');$('waitingScore').textContent=state.player.score;requestWakeLock();show('viewStudentWaiting');return;
    }
    if(state.room.phase==='question'){ await renderStudentQuestion(); return; }
    if(state.room.phase==='reveal'){ await renderStudentReveal(); return; }
    if(state.room.phase==='finished'){ await renderStudentFinal(); }
  }
  async function alreadyAnswered(qid){
    if(state.answered.has(qid))return state.answered.get(qid);
    const {data}=await supa().from('quiz_answers').select('*').eq('room_id',state.room.id).eq('player_id',state.player.id).eq('question_id',qid).maybeSingle();
    if(data)state.answered.set(qid,data); return data||null;
  }
  async function renderStudentQuestion(){
    const q=currentQ(); if(!q)return; state.currentQuestionId=q.id; requestWakeLock(); show('viewStudentQuestion');
    $('studentProgress').textContent=`${state.room.current_index+1}/${state.room.question_ids.length}`;$('studentScore').textContent=`${state.player.score||0} pts`;$('studentQuestion').textContent=q.question;
    const box=$('studentChoices');box.innerHTML='';const prior=await alreadyAnswered(q.id);
    q.choices.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.className='student-answer';b.innerHTML=`${shapes[i]} &nbsp; ${escapeHtml(c)}`;b.disabled=!!prior;b.addEventListener('click',()=>submitAnswer(q,i));box.appendChild(b);});
    $('submittedBox').classList.toggle('hidden',!prior); startStudentTimer(q,!!prior);
  }
  function startStudentTimer(q,answered){
    clearInterval(state.timer); const duration=state.room.duration||30; const start=new Date(state.room.question_started_at).getTime();
    const tick=()=>{const remain=Math.max(0,Math.ceil(duration-(Date.now()-start)/1000));$('studentTimer').textContent=remain;if(remain<=0){clearInterval(state.timer);[...$('studentChoices').children].forEach(b=>b.disabled=true);}};tick();state.timer=setInterval(tick,250);
  }
  async function submitAnswer(q,index){
    if(state.room.phase!=='question'||await alreadyAnswered(q.id))return;
    const duration=state.room.duration||30; const elapsed=Math.max(0,Date.now()-new Date(state.room.question_started_at).getTime()); if(elapsed>duration*1000+750)return;
    [...$('studentChoices').children].forEach(b=>b.disabled=true); $('submittedBox').classList.remove('hidden');
    const correct=index===q.answer; const prevStreak=state.player.streak||0; const newStreak=correct?prevStreak+1:0;
    const speed=Math.max(0,1-Math.min(1,elapsed/(duration*1000))); const base=correct?Math.round(500+500*speed):0; const streakBonus=correct?Math.min(200,Math.max(0,newStreak-1)*25):0; const points=base+streakBonus;
    const answerRow={room_id:state.room.id,player_id:state.player.id,question_id:q.id,answer_index:index,is_correct:correct,points,response_ms:Math.round(elapsed)};
    const {data,error}=await supa().from('quiz_answers').insert(answerRow).select().single();
    if(error){console.error(error);return;}
    state.answered.set(q.id,data); const newScore=(state.player.score||0)+points;
    const {data:p}=await supa().from('quiz_players').update({score:newScore,streak:newStreak}).eq('id',state.player.id).select().single(); if(p)state.player=p;
    $('studentScore').textContent=`${newScore} pts`;
  }
  async function renderStudentReveal(){
    clearInterval(state.timer); const q=currentQ(); if(!q)return; const ans=await alreadyAnswered(q.id); await refreshPlayers(); requestWakeLock(); show('viewStudentReveal');
    const ok=!!ans?.is_correct; const icon=$('studentResultIcon');icon.textContent=ok?'✓':'×';icon.classList.toggle('wrong',!ok);$('studentResultTitle').textContent=ok?'Bonne réponse !':'Pas cette fois';
    $('studentCorrectText').textContent=`Bonne réponse : ${q.choices[q.answer]}`;$('studentRevealScore').textContent=(state.player.score||0).toLocaleString('fr-FR');
  }
  async function renderStudentFinal(){
    await refreshPlayers(); const sorted=[...state.players].sort((a,b)=>b.score-a.score); const rank=sorted.findIndex(p=>p.id===state.player.id)+1; requestWakeLock(); show('viewStudentReveal');
    const icon=$('studentResultIcon');icon.textContent=rank===1?'🏆':rank<=3?'🥉':'✓';icon.classList.remove('wrong');$('studentResultTitle').textContent=`Tu termines ${rank}${rank===1?'er':'e'} !`;$('studentCorrectText').textContent=`${state.player.name} • ${(state.player.score||0).toLocaleString('fr-FR')} points`;$('studentRevealScore').textContent=(state.player.score||0).toLocaleString('fr-FR');
  }

  function escapeHtml(v){ return String(v??'').replace(/[&<>'"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s])); }

  // Deep link from QR code.
  async function boot(){
    try{await loadData();}catch(e){console.error(e);setConnection('offline','Erreur de chargement');toast('Impossible de charger la banque de questions.');return;}
    const join=new URLSearchParams(location.search).get('join');
    if(join && hasConfig()){
      const code=cleanCode(join); $('joinCodeInput').value=code; state.host=false;
      const {data:room}=await supa().from('quiz_rooms').select('*').eq('code',code).maybeSingle();
      if(room){
        const saved=localStorage.getItem(`ncr-player-${room.id}`);
        if(saved){
          const {data:player}=await supa().from('quiz_players').select('*').eq('id',saved).eq('room_id',room.id).maybeSingle();
          if(player){state.room=room;state.player=player;state.selectedAvatar=avatars.some(a=>a.id===player.avatar)?player.avatar:defaultAvatar;initAvatarPicker();await subscribeRoom(room.id);await renderStudentFromRoom();return;}
        }
      }
      show('viewJoin'); setTimeout(()=>$('joinNameInput')?.focus(),150); return;
    }
    if(join){$('joinCodeInput').value=cleanCode(join);state.host=false;show('viewSetupNeeded');return;}
    show('viewLanding');
  }

  boot();
})();
