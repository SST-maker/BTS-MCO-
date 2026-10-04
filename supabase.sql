-- NCR MCO Quiz Arena V4. Installation additive : aucune table historique supprimée.
-- Exécuter le fichier COMPLET dans SQL Editor. Réexécutable.
begin;
create schema if not exists ncr_arena;
revoke all on schema ncr_arena from public, anon, authenticated;
create table if not exists ncr_arena.questions (
 id text primary key, subject text not null, year text not null, chapter text not null,
 session text not null, difficulty text not null, answer integer not null check(answer between 0 and 3)
);
create table if not exists ncr_arena.rooms (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 code text not null unique, phase text not null default 'lobby' check(phase in ('lobby','question','reveal','finished','closed')),
 subject text not null, year text not null, chapter text not null, session text,
 difficulty text not null, duration integer not null check(duration in (20,30,45,60)),
 question_ids text[] not null, current_index integer not null default -1,
 question_started_at timestamptz, round integer not null default 1,
 revision bigint not null default 1, created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '24 hours')
);
create table if not exists ncr_arena.players (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references ncr_arena.rooms(id) on delete cascade,
 token_hash text not null, name text not null check(length(name) between 2 and 24),
 avatar text not null check(avatar ~ '^avatar-(0[1-9]|1[0-9]|2[0-4])$'),
 score integer not null default 0, streak integer not null default 0,
 created_at timestamptz not null default now(), unique(room_id,token_hash)
);
create table if not exists ncr_arena.answers (
 room_id uuid not null references ncr_arena.rooms(id) on delete cascade,
 player_id uuid not null references ncr_arena.players(id) on delete cascade,
 round integer not null, question_index integer not null, question_id text not null,
 answer_index integer not null check(answer_index between 0 and 3), is_correct boolean not null,
 points integer not null, response_ms integer not null, created_at timestamptz not null default now(),
 primary key(room_id,player_id,round,question_index)
);
create index if not exists ncr_v4_players_room_idx on ncr_arena.players(room_id);
create index if not exists ncr_v4_answers_round_idx on ncr_arena.answers(room_id,round,question_index);
-- Realtime expose uniquement un signal opaque : ni noms, ni réponses, ni code.
create table if not exists public.ncr_v4_signals(id uuid primary key, revision bigint not null default 1);
alter table public.ncr_v4_signals enable row level security;
drop policy if exists ncr_v4_signal_read on public.ncr_v4_signals;
create policy ncr_v4_signal_read on public.ncr_v4_signals for select to anon, authenticated using(true);
revoke all on public.ncr_v4_signals from public,anon,authenticated;
grant select on public.ncr_v4_signals to anon,authenticated;
alter table ncr_arena.questions enable row level security;
alter table ncr_arena.rooms enable row level security;
alter table ncr_arena.players enable row level security;
alter table ncr_arena.answers enable row level security;
revoke all on all tables in schema ncr_arena from public,anon,authenticated;
-- Les RPC sont les seules portes d'accès. Chaque entrée contrôle propriétaire ou secret élève.
create or replace function ncr_arena.touch(p_id uuid) returns void language sql set search_path='' as $$
 insert into public.ncr_v4_signals(id,revision) values(p_id,1)
 on conflict(id) do update set revision=public.ncr_v4_signals.revision+1;
$$;
create or replace function ncr_arena.trainer() returns uuid language plpgsql stable set search_path='' as $$
begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
    or nullif(auth.jwt()->>'email','') is null then
  raise exception 'Connexion formateur requise' using errcode='42501';
 end if;
 return auth.uid();
end $$;
create or replace function ncr_arena.authorize(p_room uuid,p_token text) returns uuid language plpgsql stable set search_path='' as $$
declare v_player uuid; v_owner uuid;
begin
 select owner_id into v_owner from ncr_arena.rooms where id=p_room and expires_at>now();
 if not found then raise exception 'Salle expirée ou introuvable'; end if;
 if v_owner=auth.uid() and p_token is null then return null; end if;
 if p_token is null or length(p_token)<32 then raise exception 'Accès élève invalide' using errcode='42501'; end if;
 select id into v_player from ncr_arena.players where room_id=p_room and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if not found then raise exception 'Accès élève invalide' using errcode='42501'; end if;
 return v_player;
end $$;
create or replace function public.ncr_v4_snapshot(p_room uuid,p_token text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r ncr_arena.rooms; v_player uuid; a jsonb; players jsonb; n integer;
begin
 v_player:=ncr_arena.authorize(p_room,p_token);
 select * into r from ncr_arena.rooms where id=p_room for update;
 -- L'expiration est automatique même lorsque le formateur est en arrière-plan.
 if r.phase='question' and clock_timestamp()>=r.question_started_at+make_interval(secs=>r.duration) then
  update ncr_arena.players p set streak=0 where room_id=p_room and not exists(select 1 from ncr_arena.answers a where a.room_id=p_room and a.player_id=p.id and a.round=r.round and a.question_index=r.current_index);
  update ncr_arena.rooms set phase='reveal',revision=revision+1 where id=p_room returning * into r;
  perform ncr_arena.touch(p_room);
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'avatar',p.avatar,'score',p.score,'streak',p.streak) order by p.score desc,p.created_at,p.id),'[]'::jsonb)
 into players from ncr_arena.players p where room_id=p_room;
 select count(*) into n from ncr_arena.answers where room_id=p_room and round=r.round and question_index=r.current_index;
 if v_player is not null then
  select to_jsonb(x)-'room_id'-'player_id' into a from ncr_arena.answers x
  where room_id=p_room and player_id=v_player and round=r.round and question_index=r.current_index;
 end if;
 return jsonb_build_object('room',to_jsonb(r)-'owner_id','players',players,'player_id',v_player,'answer',a,'answer_count',n,'sync_revision',(select revision from public.ncr_v4_signals where id=p_room),'server_now',clock_timestamp());
end $$;
create or replace function ncr_arena.settings(p jsonb) returns void language plpgsql set search_path='' as $$
declare ids text[]; n integer;
begin
 select array_agg(value) into ids from jsonb_array_elements_text(p->'question_ids');
 n:=coalesce(array_length(ids,1),0);
 if n<1 or n>60 or (select count(distinct v) from unnest(ids) v)<>n then raise exception 'Liste de questions invalide'; end if;
 if coalesce(p->>'difficulty','') not in ('medium','hard','expert','mixed') or coalesce((p->>'duration')::int,0) not in (20,30,45,60) then raise exception 'Paramètres invalides'; end if;
 if (select count(*) from ncr_arena.questions q where q.id=any(ids)
 and q.subject=p->>'subject' and q.year=p->>'year' and q.chapter=p->>'chapter'
 and (nullif(p->>'session','') is null or q.session=p->>'session')
 and (p->>'difficulty'='mixed' or q.difficulty=p->>'difficulty'))<>n then raise exception 'Banque ou filtres incompatibles : mettre à jour le SQL V4'; end if;
end $$;
create or replace function public.ncr_v4_create(p_settings jsonb,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare owner uuid; rid uuid; ids text[]; candidate text;
begin
 owner:=ncr_arena.trainer();
 -- UUID de requête fourni avant l'envoi : nouvelle tentative réseau = même salle.
 select id into rid from ncr_arena.rooms where id=p_request and owner_id=owner;
 if found then return rid; end if;
 perform ncr_arena.settings(p_settings);
 select array_agg(value) into ids from jsonb_array_elements_text(p_settings->'question_ids');
 if (select count(*) from ncr_arena.rooms where owner_id=owner and expires_at>now() and phase<>'closed')>=20 then raise exception 'Ferme les anciennes salles avant de créer un nouveau live'; end if;
 for i in 1..10 loop
  candidate:=lpad(floor(random()*1000000)::text,6,'0');
  begin
   insert into ncr_arena.rooms(id,owner_id,code,subject,year,chapter,session,difficulty,duration,question_ids)
   values(p_request,owner,candidate,p_settings->>'subject',p_settings->>'year',p_settings->>'chapter',nullif(p_settings->>'session',''),p_settings->>'difficulty',(p_settings->>'duration')::int,ids) returning id into rid;
   perform ncr_arena.touch(rid); return rid;
  exception when unique_violation then
   select id into rid from ncr_arena.rooms where id=p_request and owner_id=owner;
   if found then return rid; end if;
  end;
 end loop;
 raise exception 'Code indisponible, réessayer';
end $$;
create or replace function public.ncr_v4_join(p_code text,p_name text,p_avatar text,p_token text)
returns uuid language plpgsql security definer set search_path='' as $$
declare r ncr_arena.rooms; h text;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Secret élève invalide'; end if;
 if p_code !~ '^[0-9]{6}$' or length(trim(p_name)) not between 2 and 24 then raise exception 'Code ou prénom invalide'; end if;
 select * into r from ncr_arena.rooms where code=p_code and expires_at>now() for update;
 if not found or r.phase='closed' then raise exception 'Salle introuvable ou fermée'; end if;
 h:=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if exists(select 1 from ncr_arena.players where room_id=r.id and token_hash=h) then return r.id; end if;
 if r.phase='finished' then raise exception 'Cette manche est terminée'; end if;
 if (select count(*) from ncr_arena.players where room_id=r.id)>=100 then raise exception 'Salle complète (100 élèves)'; end if;
 insert into ncr_arena.players(room_id,token_hash,name,avatar) values(r.id,h,trim(p_name),p_avatar);
 perform ncr_arena.touch(r.id); return r.id;
end $$;
create or replace function public.ncr_v4_transition(p_room uuid,p_revision bigint,p_action text,p_settings jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r ncr_arena.rooms; ids text[]; owner uuid;
begin
 owner:=ncr_arena.trainer();
 select * into r from ncr_arena.rooms where id=p_room and owner_id=owner and expires_at>now() for update;
 if not found then raise exception 'Salle non autorisée' using errcode='42501'; end if;
 -- Compare-and-swap : une commande obsolète ne fait jamais avancer deux fois.
 if r.revision<>p_revision then return jsonb_build_object('stale',true); end if;
 if p_action='start' and r.phase='lobby' then
  if not exists(select 1 from ncr_arena.players where room_id=p_room) then raise exception 'Aucun élève connecté'; end if;
  update ncr_arena.rooms set phase='question',current_index=0,question_started_at=clock_timestamp() where id=p_room;
 elsif p_action='reveal' and r.phase='question' then
  -- L'absence de réponse rompt également la série.
  update ncr_arena.players p set streak=0 where room_id=p_room and not exists(select 1 from ncr_arena.answers a where a.room_id=p_room and a.player_id=p.id and a.round=r.round and a.question_index=r.current_index);
  update ncr_arena.rooms set phase='reveal' where id=p_room;
 elsif p_action='next' and r.phase='reveal' then
  if r.current_index>=array_length(r.question_ids,1)-1 then
   update ncr_arena.rooms set phase='finished' where id=p_room;
  else
   update ncr_arena.rooms set phase='question',current_index=current_index+1,question_started_at=clock_timestamp() where id=p_room;
  end if;
 elsif p_action='reset' and r.phase in ('finished','lobby') then
  perform ncr_arena.settings(p_settings);
  select array_agg(value) into ids from jsonb_array_elements_text(p_settings->'question_ids');
  update ncr_arena.rooms set phase='lobby',round=round+1,current_index=-1,question_started_at=null,
   subject=p_settings->>'subject',year=p_settings->>'year',chapter=p_settings->>'chapter',session=nullif(p_settings->>'session',''),
   difficulty=p_settings->>'difficulty',duration=(p_settings->>'duration')::int,question_ids=ids where id=p_room;
  update ncr_arena.players set score=0,streak=0 where room_id=p_room;
 elsif p_action='close' then
  update ncr_arena.rooms set phase='closed' where id=p_room;
 else raise exception 'Transition invalide';
 end if;
 update ncr_arena.rooms set revision=revision+1 where id=p_room;
 perform ncr_arena.touch(p_room);
 return jsonb_build_object('stale',false);
end $$;
create or replace function public.ncr_v4_answer(p_room uuid,p_token text,p_round int,p_index int,p_choice int)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r ncr_arena.rooms; p ncr_arena.players; a ncr_arena.answers; correct boolean; elapsed integer; points integer; v_streak integer;
begin
 -- Même verrou que les transitions : aucune réponse ne peut traverser un reset ou une correction.
 select * into r from ncr_arena.rooms where id=p_room and expires_at>now() for update;
 if not found then raise exception 'Salle expirée'; end if;
 select * into p from ncr_arena.players where room_id=p_room and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found then raise exception 'Accès élève invalide' using errcode='42501'; end if;
 select * into a from ncr_arena.answers where room_id=p_room and player_id=p.id and round=p_round and question_index=p_index;
 if found then return to_jsonb(a); end if;
 if r.phase<>'question' or r.round<>p_round or r.current_index<>p_index then raise exception 'Question terminée ou remplacée'; end if;
 elapsed:=greatest(0,floor(extract(epoch from (clock_timestamp()-r.question_started_at))*1000)::int);
 if elapsed>=r.duration*1000 then raise exception 'Temps écoulé'; end if;
 if p_choice is null or p_choice not between 0 and 3 then raise exception 'Choix invalide'; end if;
 select answer=p_choice into correct from ncr_arena.questions where id=r.question_ids[p_index+1];
 if correct is null then raise exception 'Question absente de la base'; end if;
 v_streak:=case when correct then p.streak+1 else 0 end;
 points:=case when correct then 800+round(200.0*(1.0-elapsed/(r.duration*1000.0)))::int+least(100,greatest(0,v_streak-1)*25) else 0 end;
 insert into ncr_arena.answers(room_id,player_id,round,question_index,question_id,answer_index,is_correct,points,response_ms)
 values(p_room,p.id,p_round,p_index,r.question_ids[p_index+1],p_choice,correct,points,elapsed) returning * into a;
 update ncr_arena.players set score=score+points,streak=v_streak where id=p.id;
 perform ncr_arena.touch(p_room);
 return to_jsonb(a);
end $$;
revoke all on all functions in schema ncr_arena from public,anon,authenticated;
revoke all on function public.ncr_v4_create(jsonb,uuid),public.ncr_v4_join(text,text,text,text),public.ncr_v4_snapshot(uuid,text),public.ncr_v4_transition(uuid,bigint,text,jsonb),public.ncr_v4_answer(uuid,text,int,int,int) from public,anon,authenticated;
grant execute on function public.ncr_v4_create(jsonb,uuid),public.ncr_v4_transition(uuid,bigint,text,jsonb) to authenticated;
grant execute on function public.ncr_v4_join(text,text,text,text),public.ncr_v4_snapshot(uuid,text),public.ncr_v4_answer(uuid,text,int,int,int) to anon,authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ncr_v4_signals') then
  alter publication supabase_realtime add table public.ncr_v4_signals;
 end if;
end $$;
-- BANK_SEED : généré à partir de questions.json ; ne pas éditer les réponses séparément.
insert into ncr_arena.questions(id,subject,year,chapter,session,difficulty,answer) values
('v4-adoc-1re-1fee39ecf7','ADOC','1re','01','01','medium',1),
('v4-adoc-1re-d61ae7406a','ADOC','1re','01','03','medium',2),
('v4-adoc-1re-fe4906e2ab','ADOC','1re','01','02','hard',1),
('v4-adoc-1re-c4920a120c','ADOC','1re','01','01','hard',2),
('v4-adoc-1re-4af6b53d30','ADOC','1re','01','02','expert',2),
('v4-adoc-1re-45fa21297e','ADOC','1re','01','01','expert',3),
('v4-adoc-1re-7c35cd80d7','ADOC','1re','02','07','medium',1),
('v4-adoc-1re-f2ac552292','ADOC','1re','02','07','medium',2),
('v4-adoc-1re-e5929cff90','ADOC','1re','02','08','hard',3),
('v4-adoc-1re-bbdd745ba0','ADOC','1re','02','08','hard',0),
('v4-adoc-1re-98625b390e','ADOC','1re','02','06','expert',1),
('v4-adoc-1re-ac0cf2a0e3','ADOC','1re','02','10','expert',2),
('v4-adoc-1re-e36907954a','ADOC','1re','03','14','medium',1),
('v4-adoc-1re-acccd527f6','ADOC','1re','03','14','medium',2),
('v4-adoc-1re-524febb26a','ADOC','1re','03','14','hard',0),
('v4-adoc-1re-b5985c22d5','ADOC','1re','03','16','hard',0),
('v4-adoc-1re-7118a50a41','ADOC','1re','03','14','expert',2),
('v4-adoc-1re-cae8a307cb','ADOC','1re','03','14','expert',3),
('v4-adoc-1re-8321180561','ADOC','1re','04','21','medium',1),
('v4-adoc-1re-35a78f7b82','ADOC','1re','04','23','medium',2),
('v4-adoc-1re-c810540409','ADOC','1re','04','22','hard',2),
('v4-adoc-1re-050f735495','ADOC','1re','04','24','hard',0),
('v4-adoc-1re-a6de2fb95c','ADOC','1re','04','27','expert',2),
('v4-adoc-1re-386b61255f','ADOC','1re','04','27','expert',0),
('v4-adoc-1re-54afb1d0cf','ADOC','1re','05','29','medium',0),
('v4-adoc-1re-6997e9d475','ADOC','1re','05','30','medium',2),
('v4-adoc-1re-3a97efcb9d','ADOC','1re','05','30','hard',1),
('v4-adoc-1re-9f972d738f','ADOC','1re','05','34','hard',0),
('v4-adoc-1re-7dff395e72','ADOC','1re','05','32','expert',3),
('v4-adoc-1re-ca11288ff5','ADOC','1re','05','34','expert',1),
('v4-adoc-2e-4a4c5afe1d','ADOC','2e','01','02','medium',0),
('v4-adoc-2e-396f4703bd','ADOC','2e','01','05','medium',2),
('v4-adoc-2e-82f42a3b8c','ADOC','2e','01','03','hard',1),
('v4-adoc-2e-208ced1a52','ADOC','2e','01','05','hard',2),
('v4-adoc-2e-77d8b11d39','ADOC','2e','01','03','expert',1),
('v4-adoc-2e-e4ffaf0f53','ADOC','2e','01','07','expert',1),
('v4-adoc-2e-d458117db3','ADOC','2e','02','09','medium',2),
('v4-adoc-2e-223eae3c89','ADOC','2e','02','09','medium',2),
('v4-adoc-2e-ba265c77b1','ADOC','2e','02','10','hard',3),
('v4-adoc-2e-c049385b57','ADOC','2e','02','13','hard',3),
('v4-adoc-2e-5084b83f89','ADOC','2e','02','13','expert',0),
('v4-adoc-2e-f61b4b93dc','ADOC','2e','02','10','expert',0),
('v4-adoc-2e-38cc827f76','ADOC','2e','03','14','medium',0),
('v4-adoc-2e-d0da9db642','ADOC','2e','03','15','medium',3),
('v4-adoc-2e-3c319142f9','ADOC','2e','03','19','hard',0),
('v4-adoc-2e-fd09351eb4','ADOC','2e','03','14','hard',0),
('v4-adoc-2e-8c37fd7c01','ADOC','2e','03','19','expert',3),
('v4-adoc-2e-88590c3de3','ADOC','2e','03','19','expert',1),
('v4-adoc-2e-529cbe1cc2','ADOC','2e','04','24','medium',0),
('v4-adoc-2e-33b8372dd4','ADOC','2e','04','20','medium',2),
('v4-adoc-2e-cbdab10354','ADOC','2e','04','26','hard',3),
('v4-adoc-2e-0fe9db37ed','ADOC','2e','04','21','hard',1),
('v4-adoc-2e-69cd84d9a3','ADOC','2e','04','24','expert',2),
('v4-adoc-2e-7ed832fb40','ADOC','2e','04','26','expert',2),
('v4-adoc-2e-93539e3fc2','ADOC','2e','05','27','medium',3),
('v4-adoc-2e-312903e3fb','ADOC','2e','05','28','medium',0),
('v4-adoc-2e-037eb0b8f1','ADOC','2e','05','30','hard',1),
('v4-adoc-2e-765c74184b','ADOC','2e','05','32','hard',0),
('v4-adoc-2e-278cc80212','ADOC','2e','05','31','expert',3),
('v4-adoc-2e-ee8f5daa2d','ADOC','2e','05','28','expert',3),
('v4-drcv-1re-cfe22f829d','DRCV','1re','00','01','medium',2),
('v4-drcv-1re-cf9d55b0a5','DRCV','1re','00','01','medium',1),
('v4-drcv-1re-015dda4306','DRCV','1re','00','01','hard',3),
('v4-drcv-1re-5c0a3e6e6c','DRCV','1re','00','01','hard',3),
('v4-drcv-1re-5d8565249d','DRCV','1re','00','01','expert',0),
('v4-drcv-1re-3020e9d21b','DRCV','1re','00','01','expert',2),
('v4-drcv-1re-b2084eac1c','DRCV','1re','01','02','medium',2),
('v4-drcv-1re-1ae6b71633','DRCV','1re','01','02','medium',1),
('v4-drcv-1re-804f4e34d2','DRCV','1re','01','04','hard',0),
('v4-drcv-1re-1f9213afd3','DRCV','1re','01','02','hard',1),
('v4-drcv-1re-d5bd1767a9','DRCV','1re','01','02','expert',1),
('v4-drcv-1re-dbb7ff5b4d','DRCV','1re','01','02','expert',1),
('v4-drcv-1re-a05b6b4a3e','DRCV','1re','02','06','medium',0),
('v4-drcv-1re-f0ec3db03f','DRCV','1re','02','07','medium',2),
('v4-drcv-1re-660c0e2590','DRCV','1re','02','09','hard',2),
('v4-drcv-1re-0e271d3ee3','DRCV','1re','02','07','hard',1),
('v4-drcv-1re-07d1c0fa86','DRCV','1re','02','06','expert',3),
('v4-drcv-1re-9e2e2a8f58','DRCV','1re','02','09','expert',0),
('v4-drcv-1re-5620f71543','DRCV','1re','03','11','medium',0),
('v4-drcv-1re-3524393c39','DRCV','1re','03','12','medium',0),
('v4-drcv-1re-b3d90e2bba','DRCV','1re','03','12','hard',3),
('v4-drcv-1re-1699f7452f','DRCV','1re','03','12','hard',0),
('v4-drcv-1re-f5b1fa9f8a','DRCV','1re','03','12','expert',2),
('v4-drcv-1re-c0a16004ae','DRCV','1re','03','12','expert',2),
('v4-drcv-1re-fae23b404d','DRCV','1re','04','13','medium',1),
('v4-drcv-1re-ff32fa0c7b','DRCV','1re','04','13','medium',1),
('v4-drcv-1re-d99471ddf8','DRCV','1re','04','14','hard',1),
('v4-drcv-1re-aa457049c8','DRCV','1re','04','14','hard',3),
('v4-drcv-1re-5b756c0e9c','DRCV','1re','04','14','expert',0),
('v4-drcv-1re-752e9a7163','DRCV','1re','04','13','expert',0),
('v4-drcv-1re-9ced26533c','DRCV','1re','05','15','medium',2),
('v4-drcv-1re-b425f5255c','DRCV','1re','05','16','medium',2),
('v4-drcv-1re-f4ce6403e2','DRCV','1re','05','15','hard',0),
('v4-drcv-1re-860ba5381f','DRCV','1re','05','15','hard',0),
('v4-drcv-1re-d8fa167e51','DRCV','1re','05','15','expert',0),
('v4-drcv-1re-aea9b7dac7','DRCV','1re','05','18','expert',1),
('v4-drcv-1re-d9dd9c23b8','DRCV','1re','06','20','medium',1),
('v4-drcv-1re-f106777168','DRCV','1re','06','25','medium',2),
('v4-drcv-1re-2d3d6d33a8','DRCV','1re','06','22','hard',0),
('v4-drcv-1re-045dfbc8ea','DRCV','1re','06','24','hard',3),
('v4-drcv-1re-809a8ab291','DRCV','1re','06','23','expert',3),
('v4-drcv-1re-2f96dbc389','DRCV','1re','06','20','expert',3),
('v4-drcv-1re-037fd14d49','DRCV','1re','07','28','medium',2),
('v4-drcv-1re-7f0df46288','DRCV','1re','07','29','medium',0),
('v4-drcv-1re-e77a0daad7','DRCV','1re','07','28','hard',1),
('v4-drcv-1re-312ce346f6','DRCV','1re','07','34','hard',0),
('v4-drcv-1re-5d01d811d8','DRCV','1re','07','31','expert',0),
('v4-drcv-1re-e09960e3b4','DRCV','1re','07','28','expert',2),
('v4-drcv-2e-1cf4f32dcb','DRCV','2e','01','02','medium',3),
('v4-drcv-2e-692b47be04','DRCV','2e','01','06','medium',3),
('v4-drcv-2e-e8d78f94c8','DRCV','2e','01','13','medium',3),
('v4-drcv-2e-add2ba2e51','DRCV','2e','01','07','medium',0),
('v4-drcv-2e-d2eabf6c52','DRCV','2e','01','03','hard',2),
('v4-drcv-2e-036dd60c51','DRCV','2e','01','05','hard',3),
('v4-drcv-2e-836a96e876','DRCV','2e','01','15','hard',2),
('v4-drcv-2e-04241d646c','DRCV','2e','01','10','hard',1),
('v4-drcv-2e-6aa10f61c2','DRCV','2e','01','05','expert',3),
('v4-drcv-2e-463433f5cd','DRCV','2e','01','02','expert',1),
('v4-drcv-2e-7480d2e26c','DRCV','2e','01','15','expert',2),
('v4-drcv-2e-3ba714f1cc','DRCV','2e','01','14','expert',0),
('v4-drcv-2e-fe16a2071f','DRCV','2e','02','18','medium',1),
('v4-drcv-2e-7476c2772e','DRCV','2e','02','24','medium',2),
('v4-drcv-2e-ea7fa80e99','DRCV','2e','02','27','medium',1),
('v4-drcv-2e-c8e158c0af','DRCV','2e','02','22','medium',0),
('v4-drcv-2e-92f47d5f07','DRCV','2e','02','28','hard',1),
('v4-drcv-2e-4b799b42fd','DRCV','2e','02','31','hard',2),
('v4-drcv-2e-b0c2acfded','DRCV','2e','02','31','hard',1),
('v4-drcv-2e-20973958df','DRCV','2e','02','21','hard',2),
('v4-drcv-2e-bd164416f9','DRCV','2e','02','32','expert',2),
('v4-drcv-2e-38f9cb21e3','DRCV','2e','02','26','expert',2),
('v4-drcv-2e-cf326d17c9','DRCV','2e','02','27','expert',2),
('v4-drcv-2e-c84df86475','DRCV','2e','02','32','expert',2),
('v4-go-1re-c65136027e','GO','1re','01','01','medium',2),
('v4-go-1re-cc1b813b4d','GO','1re','01','01','medium',1),
('v4-go-1re-fcf8dd7076','GO','1re','01','02','hard',3),
('v4-go-1re-e5175c756e','GO','1re','01','02','hard',3),
('v4-go-1re-50b17e024e','GO','1re','01','01','expert',3),
('v4-go-1re-043cf17f8d','GO','1re','01','02','expert',1),
('v4-go-1re-93886073a2','GO','1re','02','05','medium',1),
('v4-go-1re-3595256eef','GO','1re','02','04','medium',2),
('v4-go-1re-cf8c67d1ca','GO','1re','02','04','hard',3),
('v4-go-1re-6e639a00d5','GO','1re','02','05','hard',2),
('v4-go-1re-7d4e7e9b75','GO','1re','02','05','expert',2),
('v4-go-1re-ec2ac3560d','GO','1re','02','05','expert',1),
('v4-go-1re-ed2300ff44','GO','1re','03','06','medium',2),
('v4-go-1re-6485d75b57','GO','1re','03','10','medium',3),
('v4-go-1re-9d33d6994c','GO','1re','03','06','hard',1),
('v4-go-1re-e6c357f145','GO','1re','03','07','hard',3),
('v4-go-1re-febe57c98b','GO','1re','03','07','expert',3),
('v4-go-1re-88098a8c1c','GO','1re','03','11','expert',2),
('v4-go-1re-76b05c5f7b','GO','1re','04','14','medium',1),
('v4-go-1re-8c6d4e97ca','GO','1re','04','18','medium',1),
('v4-go-1re-21813cfdd5','GO','1re','04','18','hard',2),
('v4-go-1re-39c0e65c98','GO','1re','04','18','hard',0),
('v4-go-1re-6efae5fa9f','GO','1re','04','18','expert',0),
('v4-go-1re-5f5fd3d44c','GO','1re','04','20','expert',0),
('v4-go-1re-ff78cfe39d','GO','1re','05','23','medium',3),
('v4-go-1re-f3a1c09350','GO','1re','05','27','medium',3),
('v4-go-1re-aafb25862d','GO','1re','05','24','hard',3),
('v4-go-1re-11d3a554bf','GO','1re','05','28','hard',1),
('v4-go-1re-0c96a857af','GO','1re','05','29','expert',0),
('v4-go-1re-b0976bcf2a','GO','1re','05','29','expert',2),
('v4-go-1re-d4f86c3e87','GO','1re','06','32','medium',1),
('v4-go-1re-b066ef3afb','GO','1re','06','33','medium',1),
('v4-go-1re-62314bc803','GO','1re','06','32','hard',2),
('v4-go-1re-0b0c3a705c','GO','1re','06','33','hard',1),
('v4-go-1re-28633b1dfe','GO','1re','06','33','expert',2),
('v4-go-1re-5753f1e0c6','GO','1re','06','33','expert',0),
('v4-go-2e-ac1ae6af2a','GO','2e','01','01','medium',2),
('v4-go-2e-860fb871a4','GO','2e','01','01','medium',3),
('v4-go-2e-890afa35d2','GO','2e','01','02','hard',1),
('v4-go-2e-a091a2a412','GO','2e','01','02','hard',3),
('v4-go-2e-37a50c0657','GO','2e','01','01','expert',2),
('v4-go-2e-d99728e873','GO','2e','01','02','expert',3),
('v4-go-2e-a196813a9f','GO','2e','02','04','medium',2),
('v4-go-2e-78d08959c7','GO','2e','02','05','medium',2),
('v4-go-2e-07c081f23b','GO','2e','02','10','hard',1),
('v4-go-2e-629a481738','GO','2e','02','10','hard',3),
('v4-go-2e-39ce05893e','GO','2e','02','09','expert',3),
('v4-go-2e-176ba15103','GO','2e','02','10','expert',1),
('v4-go-2e-e92188889c','GO','2e','03','12','medium',3),
('v4-go-2e-14ae8d4a3f','GO','2e','03','22','medium',0),
('v4-go-2e-01b4abe802','GO','2e','03','13','hard',1),
('v4-go-2e-a137a9d99b','GO','2e','03','19','hard',0),
('v4-go-2e-d082e7227f','GO','2e','03','19','expert',2),
('v4-go-2e-cb46228b74','GO','2e','03','22','expert',3),
('v4-go-2e-89f166cbcd','GO','2e','04','26','medium',3),
('v4-go-2e-fd44863b17','GO','2e','04','28','medium',3),
('v4-go-2e-5057444db4','GO','2e','04','32','hard',0),
('v4-go-2e-80ef89e05e','GO','2e','04','29','hard',1),
('v4-go-2e-aed8a9e021','GO','2e','04','28','expert',2),
('v4-go-2e-5c9cc81e49','GO','2e','04','32','expert',0),
('v4-adoc-1re-ccbeb82133','ADOC','1re','01','05','expert',3),
('v4-adoc-1re-c91759d590','ADOC','1re','02','11','medium',0),
('v4-adoc-1re-e0df653f06','ADOC','1re','02','12','hard',3),
('v4-adoc-1re-8f3202587a','ADOC','1re','03','13','expert',3),
('v4-adoc-1re-ed53e82cdd','ADOC','1re','03','17','hard',1),
('v4-adoc-1re-d4320a22a2','ADOC','1re','03','19','medium',2),
('v4-adoc-1re-c1401afaae','ADOC','1re','04','20','hard',0),
('v4-adoc-1re-113c8a0721','ADOC','1re','04','25','medium',1),
('v4-adoc-1re-27f137ade1','ADOC','1re','04','28','medium',2),
('v4-adoc-1re-0e4ddf88ff','ADOC','1re','05','33','hard',2),
('v4-adoc-2e-81a3597418','ADOC','2e','01','01','hard',2),
('v4-adoc-2e-5318dbd816','ADOC','2e','01','06','medium',1),
('v4-adoc-2e-b4bf52444d','ADOC','2e','02','11','medium',3),
('v4-adoc-2e-47ba2b9f71','ADOC','2e','03','18','expert',0),
('v4-adoc-2e-7c2900dcbf','ADOC','2e','04','22','expert',1),
('v4-drcv-1re-f0891f5c23','DRCV','1re','01','03','hard',3),
('v4-drcv-1re-cb98b91315','DRCV','1re','01','05','medium',0),
('v4-drcv-1re-2614408eb9','DRCV','1re','06','19','hard',0),
('v4-drcv-1re-39f6dc0dc1','DRCV','1re','06','27','expert',2),
('v4-drcv-1re-ef807f8cf3','DRCV','1re','07','32','expert',3),
('v4-drcv-1re-481295ff3d','DRCV','1re','07','33','hard',2),
('v4-drcv-2e-346e8e7556','DRCV','2e','01','01','medium',1),
('v4-drcv-2e-5268c0f1f8','DRCV','2e','01','11','expert',2),
('v4-drcv-2e-33a3264652','DRCV','2e','02','19','hard',1),
('v4-drcv-2e-2e0d1986a2','DRCV','2e','02','20','medium',2),
('v4-drcv-2e-001f9a53ea','DRCV','2e','02','30','expert',3),
('v4-go-1re-669fa252af','GO','1re','01','03','medium',2),
('v4-go-1re-20ebe80232','GO','1re','03','12','hard',1),
('v4-go-1re-ada0c29698','GO','1re','03','13','expert',2),
('v4-go-1re-f03bd4cc03','GO','1re','04','15','hard',3),
('v4-go-1re-bfbf5971ab','GO','1re','04','16','hard',2),
('v4-go-1re-1b53356223','GO','1re','04','19','expert',0),
('v4-go-1re-a6c4bb10b5','GO','1re','04','22','medium',2),
('v4-go-1re-841880a16d','GO','1re','05','25','hard',2),
('v4-go-1re-805c37b472','GO','1re','06','31','medium',0),
('v4-go-1re-4727db0efd','GO','1re','06','34','expert',1),
('v4-go-2e-97502e1a03','GO','2e','01','03','hard',3),
('v4-go-2e-79a38cc382','GO','2e','02','06','hard',2),
('v4-go-2e-428647f193','GO','2e','03','15','medium',0),
('v4-go-2e-d74ae56be2','GO','2e','03','16','hard',0),
('v4-go-2e-341efd2c39','GO','2e','03','21','medium',0),
('v4-go-2e-f57ec2e577','GO','2e','03','23','hard',1),
('v4-go-2e-22fb4b7653','GO','2e','03','24','expert',1),
('v4-go-2e-b0372877fd','GO','2e','04','30','expert',1),
('v4-go-2e-a4db004a4e','GO','2e','04','31','medium',0),
('v4-go-2e-c271ea388a','GO','2e','04','33','expert',2)
on conflict(id) do update set subject=excluded.subject,year=excluded.year,chapter=excluded.chapter,session=excluded.session,difficulty=excluded.difficulty,answer=excluded.answer;
commit;
