// Controles
function move(d){if(state!=='play')return;laneIdx=Math.max(0,Math.min(2,laneIdx+d))}
function jump(){if(state==='play'&&py<=0.001&&pu.k!=='patineta')vy=pu.k==='patines'?17.5:11.5}
addEventListener('keydown',e=>{if(e.target&&/^(INPUT|TEXTAREA)$/.test(e.target.tagName))return;if(state==='intro'&&introT>0.5){endIntro();return}
  const k=e.key;
  if(k==='ArrowLeft'||k==='a'||k==='A')move(-1);
  else if(k==='ArrowRight'||k==='d'||k==='D')move(1);
  else if(k===' '&&state==='play'&&ownsAny()){e.preventDefault();openPU()}
  else if(k==='Escape'){state==='play'?openPause():(state==='menu'&&dlg.classList.contains('on')?hide():closePU())}
  else if(k==='x'||k==='X'){closePU()}
  else if(k==='ArrowUp'||k===' '||k==='w'||k==='W'){e.preventDefault();jump()}
  else if((k==='Enter'||k===' ')&&state==='menu'&&dlg.className===''&&$('login').classList.contains('hide'))start();
});
let tx=0,ty=0,tt=0,sw=false,hd=false,vd=false;const cv=renderer.domElement;
cv.addEventListener('touchstart',e=>{const p=e.touches[0];tx=p.clientX;ty=p.clientY;tt=Date.now();sw=false;hd=vd=false},{passive:true});
cv.addEventListener('touchmove',e=>{const p=e.touches[0],dx=p.clientX-tx,dy=p.clientY-ty;
  if(!hd&&Math.abs(dx)>26*SN()&&Math.abs(dx)>Math.abs(dy)){move(dx>0?1:-1);hd=true;sw=true}
  else if(!vd&&dy<-34*SN()&&Math.abs(dy)>Math.abs(dx)){jump();vd=true;sw=true}},{passive:true});
let lastTap=0;
cv.addEventListener('touchend',()=>{if(sw||Date.now()-tt>300)return;const n=Date.now();if(n-lastTap<350){lastTap=0;if(state==='play'&&ownsAny())openPU()}else lastTap=n},{passive:true});
// Mouse: arrastrar como deslizar el dedo (izquierda/derecha = carril, arriba = salto). El teclado sigue igual.
let md=false;
cv.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0){md=true;hd=vd=false;tx=e.clientX;ty=e.clientY}});
addEventListener('pointermove',e=>{if(!md||e.pointerType!=='mouse')return;const dx=e.clientX-tx,dy=e.clientY-ty;
  if(!hd&&Math.abs(dx)>40*SN()&&Math.abs(dx)>Math.abs(dy)){move(dx>0?1:-1);hd=true}
  else if(!vd&&dy<-45*SN()&&Math.abs(dy)>Math.abs(dx)){jump();vd=true}});
addEventListener('pointerup',()=>{md=false});cv.addEventListener('pointerdown',()=>{if(state==='intro'&&introT>0.5)endIntro()});addEventListener('blur',()=>{md=false});
if(COARSE)addEventListener('contextmenu',e=>e.preventDefault());

