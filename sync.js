/* Une seule lecture en vol. Realtime invalide ; le snapshot serveur fait autorité. */
window.ArenaSync=class{
 constructor(sb,onSnapshot,onStatus,onFatal=()=>{}){this.onFatal=onFatal;this.sb=sb;this.onSnapshot=onSnapshot;this.onStatus=onStatus;this.epoch=0;this.failures=0;}
 async rpc(name,args){
  const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),12000);
  try{const {data,error}=await this.sb.rpc('ncr_v4_'+name,args).abortSignal(controller.signal);if(error)throw error;return data;}
  finally{clearTimeout(timeout);}
 }
 attach(room,token){this.stop();this.room=room;this.token=token;this.failures=0;this.highest=-1;const epoch=this.epoch;
  this.channel=this.sb.channel('ncr-v4-'+room+'-'+crypto.randomUUID())
   .on('postgres_changes',{event:'UPDATE',schema:'public',table:'ncr_v4_signals',filter:`id=eq.${room}`},()=>this.request())
   .subscribe(status=>{if(epoch!==this.epoch)return;this.live=status==='SUBSCRIBED';this.request();});
  return this.pull();
 }
 request(){if(!this.room)return;clearTimeout(this.timer);this.timer=setTimeout(()=>this.pull(),180);}
 async pull(){
  if(!this.room)return;
  if(this.busyEpoch===this.epoch){this.again=true;return;}
  if(document.visibilityState==='hidden'||navigator.onLine===false){this.schedule();return;}
  const epoch=this.epoch,room=this.room,start=Date.now();this.busyEpoch=epoch;this.again=false;
  try{
   const s=await this.rpc('snapshot',{p_room:room,p_token:this.token});
   if(epoch!==this.epoch||s.room.id!==this.room)return;
   this.failures=0;
   if(Number(s.sync_revision)>=this.highest){
    this.highest=Number(s.sync_revision);
    this.onSnapshot(s,Date.parse(s.server_now)-(start+Date.now())/2);
   }
   if(epoch!==this.epoch)return;
   this.onStatus(this.live?'online':'polling',this.live?'Live connecté':'Synchronisation de secours');
  }catch(e){if(epoch!==this.epoch)return;if(/Salle expirée|introuvable|Accès élève invalide|Connexion formateur requise/i.test(e.message||'')){this.stop();this.onFatal(e);return;}this.failures++;this.onStatus('offline',navigator.onLine===false?'Hors connexion · reprise automatique':'Connexion interrompue · nouvel essai');console.warn('Synchronisation',e.message);}
  finally{if(this.busyEpoch===epoch)this.busyEpoch=null;if(epoch===this.epoch){if(this.again)this.request();else this.schedule();}}
 }
 schedule(){clearTimeout(this.timer);if(!this.room)return;const delay=document.visibilityState==='hidden'?15000:Math.min(30000,(this.live?7000:3000)*Math.pow(1.6,Math.min(this.failures,5)));this.timer=setTimeout(()=>this.pull(),delay+Math.random()*400);}
 stop(){this.epoch++;clearTimeout(this.timer);this.room=null;this.again=false;this.live=false;if(this.channel)this.sb.removeChannel(this.channel).catch(()=>{});this.channel=null;}
};
