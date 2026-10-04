/* Node.js 18+ ; aucune dépendance. --sync régénère compteurs et registre SQL. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const bank=JSON.parse(read('questions.json')),catalog=JSON.parse(read('catalog.json')),sources=JSON.parse(read('source_index.json')),C=require('../core.js');
C.validateBank(bank);assert(bank.length>0);
const prompts=new Set(),sourceKeys=new Set(sources.map(s=>[s.subject,s.year,s.notion].join('|')));
for(const q of bank){
 assert(!prompts.has(C.normalize(q.question)),'Énoncé dupliqué '+q.id);prompts.add(C.normalize(q.question));
 assert(q.question.length<=240&&q.choices.every(c=>c.length<=170),'Texte trop long '+q.id);
 assert(!/\.\.\.|…/.test([q.question,...q.choices,q.explanation,q.trap].join(' ')),'Texte tronqué '+q.id);
 assert(q.explanation.trim()&&q.trap.trim()&&q.notionTitle.trim());
 assert(sourceKeys.has([q.subject,q.year,q.notion].join('|')),'Source absente '+q.id);
 assert(catalog[q.subject]?.[q.year]?.[q.chapter]?.sessions?.[q.session],'Séance absente '+q.id);
 assert(q.source.page>0&&q.source.endPage>=q.source.page);
}
let sessions=0,empty=0;
for(const [s,ys] of Object.entries(catalog))for(const [y,chs]of Object.entries(ys))for(const [ch,c]of Object.entries(chs)){
 const qs=bank.filter(q=>q.subject===s&&q.year===y&&q.chapter===ch);
 if(process.argv.includes('--sync'))c.questionCount=qs.length;else assert.equal(c.questionCount,qs.length);
 for(const [se,v]of Object.entries(c.sessions)){const n=qs.filter(q=>q.session===se).length;sessions++;if(!n)empty++;if(process.argv.includes('--sync'))v.questionCount=n;else assert.equal(v.questionCount,n);}
 for(const level of ['medium','hard','expert','mixed']){
  const picked=C.pick(qs,60,level);assert.equal(new Set(picked.map(q=>q.id)).size,picked.length);
  assert(picked.every(q=>level==='mixed'||q.difficulty===level));
 }
}
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const seed="insert into ncr_arena.questions(id,subject,year,chapter,session,difficulty,answer) values\n"+bank.map(q=>'('+[q.id,q.subject,q.year,q.chapter,q.session,q.difficulty].map(quote).join(',')+','+q.answer+')').join(',\n')+"\non conflict(id) do update set subject=excluded.subject,year=excluded.year,chapter=excluded.chapter,session=excluded.session,difficulty=excluded.difficulty,answer=excluded.answer;\ncommit;\n";
const marker='-- BANK_SEED : généré à partir de questions.json ; ne pas éditer les réponses séparément.\n',sql=read('supabase.sql');assert(sql.includes(marker));
if(process.argv.includes('--sync')){fs.writeFileSync(path.join(root,'supabase.sql'),sql.split(marker)[0]+marker+seed);fs.writeFileSync(path.join(root,'catalog.json'),JSON.stringify(catalog,null,2)+'\n');}
else assert.equal(sql.split(marker)[1],seed,'Registre SQL décalé : exécuter --sync, puis redéployer SQL et fichiers ensemble.');
const html=read('index.html'),ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'IDs HTML dupliqués');
for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g)){if(!/^(https?:|#|data:)/.test(m[1]))assert(fs.existsSync(path.join(root,m[1])),'Asset absent '+m[1]);}
for(let i=1;i<=24;i++)assert(fs.existsSync(path.join(root,`assets/avatars/avatar-${String(i).padStart(2,'0')}.webp`)));
for(const f of ['app.js','sync.js','core.js','config.js'])new Function(read(f));
assert(!/text-overflow\s*:\s*ellipsis|line-clamp/.test(read('style.css')));
assert(!/sb_secret_|eyJ[^\s"']*service_role/.test(read('config.js')));
console.log(JSON.stringify({questions:bank.length,sessions,emptySessions:empty,avatars:24,sqlBank:'aligned',status:'PASS'},null,2));
