// ---- Configuración ----
const CFG=Object.assign({vol:70,music:true,q:2,fx:true,fps:false,sens:100},(()=>{try{return JSON.parse(localStorage.getItem('cr-cfg'))||{}}catch(e){return{}}})());
try{if(localStorage.getItem('pf-music')==='0'&&!localStorage.getItem('cr-cfg'))CFG.music=false}catch(e){}
const saveCfg=()=>{try{localStorage.setItem('cr-cfg',JSON.stringify(CFG))}catch(e){}};
const SN=()=>100/CFG.sens;
function applyQuality(){
  renderer.setPixelRatio(CFG.q===0?0.7:CFG.q===1?1:Math.min(devicePixelRatio,COARSE?1.5:2));resize();
  fx.visible=CFG.q>0&&CFG.fx;clouds.forEach(c=>c.visible=CFG.q>0&&CFG.fx);
}
function applyFps(){$('fps').classList.toggle('hide',!CFG.fps)}
let fpsN=0,fpsT=0;
function fpsTick(ms){fpsN++;fpsT+=ms;if(fpsT>=500){$('fps').textContent=Math.round(fpsN*1000/fpsT)+' FPS';fpsN=0;fpsT=0}}
let cfgTab='snd';
function cfgTg(k){
  CFG[k]=!CFG[k];saveCfg();
  if(k==='music'){musicOn=CFG.music;if(musicOn)audioInit();syncMusic()}
  if(k==='fx')applyQuality();
  if(k==='fps')applyFps();
  openSet();
}
function cfgQ(q){CFG.q=q;saveCfg();applyQuality();openSet()}
function cfgSl(k,v,el){const mn=+el.min,mx=+el.max;CFG[k]=+v;saveCfg();el.style.setProperty('--p',((v-mn)/(mx-mn)*100)+'%');el.nextElementSibling.textContent=v+(k==='sens'?'%':'')}
function openSet(t){
  if(typeof t==='string')cfgTab=t;
  const tabs=[['snd','volume_up','Sonido'],['gfx','tune','Gráficos'],['ctl','sports_esports','Controles'],['acc','person','Cuenta'],['abt','info','Información']];
  const nav=tabs.map(([k,i,n])=>`<button class="ct ${cfgTab===k?'on':''}" onclick="openSet('${k}')">${ic(i)}<span>${n}</span></button>`).join('');
  const tg=(k,on)=>`<button class="tg ${on?'on':''}" role="switch" aria-checked="${on}" aria-label="${k}" onclick="cfgTg('${k}')"><i></i></button>`;
  const sl=(k,mn,mx,v,suf)=>`<div class="sl"><input type="range" min="${mn}" max="${mx}" value="${v}" style="--p:${(v-mn)/(mx-mn)*100}%" oninput="cfgSl('${k}',this.value,this)" aria-label="${k}"><b>${v}${suf||''}</b></div>`;
  const row=(l,sub,c)=>`<div class="cr"><div><span class="cl">${l}</span>${sub?`<small>${sub}</small>`:''}</div>${c}</div>`;
  const seg=(opts,v)=>`<div class="seg">${opts.map((o,i)=>`<button class="${v===i?'on':''}" onclick="cfgQ(${i})">${o}</button>`).join('')}</div>`;
  const keys=l=>l.map(([a,b])=>`<div class="kr"><kbd>${a}</kbd><span>${b}</span></div>`).join('');
  let p;
  if(cfgTab==='snd')p=row('Música','Suena en el menú principal',tg('music',CFG.music))+row('Volumen de la música','De 0 a 100',sl('vol',0,100,CFG.vol));
  else if(cfgTab==='gfx')p=row('Calidad gráfica','Baja ahorra batería y va más fluido',seg(['Baja','Media','Alta'],CFG.q))+row('Efectos','Nubes y partículas',tg('fx',CFG.fx))+row('Mostrar FPS','Cuadros por segundo en pantalla',tg('fps',CFG.fps));
  else if(cfgTab==='ctl')p=row('Sensibilidad de deslizamiento','Más alto: responde con menos movimiento',sl('sens',50,150,CFG.sens,'%'))
    +'<div class="khead">Computadora</div>'+keys([['← → / A D','Cambiar de carril'],['↑ / W','Saltar'],['Espacio','Abrir potenciadores'],['Esc','Pausa'],['Mouse','Arrastra para moverte']])
    +'<div class="khead">Celular</div>'+keys([['Deslizar ← →','Cambiar de carril'],['Deslizar ↑','Saltar'],['Doble toque','Abrir potenciadores']]);
  else if(cfgTab==='acc')p=ACC
    ?'<div class="cacc"><div class="av">'+esc((NAME||ACC).charAt(0).toUpperCase())+'</div><div><b>'+esc(NAME||ACC)+'</b><small>'+esc(ACC)+'</small></div></div>'
      +row('Cerrar sesión','Vuelves a la pantalla de inicio de sesión','<button class="cbtn" onclick="logout()">'+ic('logout')+' Salir</button>')
    :row('Sesión','No has iniciado sesión','');
  else p=row('Juego','Chicken Runner','')+row('Versión','1.0','');
  show('<div class="chead"><h2>'+ic('settings')+' Configuración</h2><button class="cx" onclick="hide()" aria-label="Cerrar">'+ic('close')+'</button></div><div class="cbody"><nav class="cnav">'+nav+'</nav><div class="cpane">'+p+'</div></div>','cfg');
}

// ---- Música MP3: coloca music.mp3 en la misma carpeta que el juego ----
let musicOn=CFG.music;
const MUSIC_URL='music.mp3'; // Cambia esta ruta si guardas el MP3 en otra carpeta
const AU={audio:null};
function audioInit(){
  if(AU.audio)return;
  AU.audio=new Audio(MUSIC_URL);
  AU.audio.loop=true;
  AU.audio.preload='auto';
  AU.audio.volume=Math.max(0,Math.min(1,CFG.vol/100));
  AU.audio.addEventListener('error',()=>console.warn('No se pudo cargar la música. Comprueba la ruta:',MUSIC_URL));
}
function syncMusic(){
  if(!musicOn||state!=='menu'||document.hidden){if(AU.audio)AU.audio.pause();return}
  audioInit();
  AU.audio.volume=Math.max(0,Math.min(1,CFG.vol/100));
  const result=AU.audio.play();
  if(result&&typeof result.catch==='function')result.catch(()=>{});
}
// El navegador permite iniciar el audio después de una interacción del usuario.
['pointerdown','keydown','touchstart'].forEach(ev=>addEventListener(ev,()=>{if(musicOn)syncMusic()},{passive:true}));
setInterval(syncMusic,300);
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(AU.audio)AU.audio.pause()}else syncMusic()});

