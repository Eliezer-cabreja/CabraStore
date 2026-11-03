
// Bucle
let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const rdt=now-last,dt=Math.min(rdt/1000,0.05);last=now;t+=dt;if(CFG.fps)fpsTick(rdt);
  const ON = window.ONLINE_MATCH;
  const online = ON && ON.active;

  if(state==='play'){
    boost+=((pu.k==='carrito'?1.6:pu.k==='patineta'?1.4:pu.k==='patines'?1.2:1)-boost)*Math.min(1,dt*3);
    speed=Math.min(13+dist*0.018,42)*boost;
    const dz=speed*dt;dist+=dz*0.5;
    
    // Control de invulnerabilidad y aturdimiento
    inv=Math.max(0,inv-dt);
    const stunned=online && inv>0;

    if (!online) chicken.visible=inv<=0||Math.floor(t*14)%2===0;
    else chicken.visible=true;

    const ghost=pu.k==='carrito'||pu.k==='patineta';
    if(pu.k){pu.t-=dt;if(pu.t<=0)endPU()}
    $('pu').textContent=pu.k?PU[pu.k].n+' '+Math.ceil(pu.t)+'s':'';

    let nb=0;
    BIOMES.forEach((m,i)=>{if(dist%2200>=m.d)nb=i});
    if(nb!==bi){bi=nb;swapDeco()}

    // Movimiento del pollo: congelado durante el aturdimiento
    if(!stunned){
      px+=(LANES[laneIdx]-px)*Math.min(1,dt*14);

      if(pu.k==='patineta'){
        py+=(4-py)*Math.min(1,dt*3);
        vy=0;
      }else{
        vy-=32*dt;
        py+=vy*dt;
        if(py<0){py=0;vy=0}
      }
    }
    
    if(dist>=spawnAt){spawnPattern(-130);spawnAt=dist+9+Math.random()*5-Math.min(dist*0.002,3)}
    if(dist>=treeAt){makeTree(-130);if(bi===0&&Math.random()<0.5)makeTree(-126);makeDash(-130);treeAt=dist+2}
    
    // COLISIONES
    for(const o of obstacles){
      o.z+=dz;
      o.g.position.z=o.z;

      if(Math.abs(o.z)<0.85 && Math.abs(o.g.position.x-px)<1.05 && py<=(o.low?0.95:2.3) && inv<=0 && !ghost){
        if(online){
          // En online, el pollo queda aturdido durante 5 segundos
          inv=5;
          vy=0;
          toast('¡Aturdido!',1000);
        }else{
          // En solo, el choque termina la partida
          die();
          break;
        }

        // Evita que el mismo obstáculo vuelva a golpear
        o.z=15;
      }
    }
    
    for(const c of cornItems){
      c.z+=dz;c.g.position.z=c.z;c.c.rotation.y+=dt*2.2;c.c.rotation.x=0.4+Math.sin(t*2+c.ph)*0.2;c.a=(c.a||0)+dt*1.8;c.d1.position.set(Math.cos(c.a),Math.sin(c.a),0);c.d2.position.set(-Math.cos(c.a),-Math.sin(c.a),0);c.g.position.y=1.3+Math.sin(t*3+c.ph)*0.12;
      if(!c.got&&Math.abs(c.z)<0.9&&Math.abs(c.g.position.x-px)<1.0){c.got=true;c.g.visible=false;runCubes++;toast('¡Encontraste un cubo!',1600)}
    }

    animDeco(dt,speed,true);

    for(let i=deco.length-1;i>=0;i--){
      const d=deco[i];
      if(d.out!==undefined){
        d.out+=dt;
        const k=1-d.out/0.7;
        if(k<=0){scene.remove(d.g);deco.splice(i,1);continue}
        d.g.scale.setScalar(k)
      }
      else if(d.inn!==undefined){
        d.inn+=dt;
        const k=Math.min(1,d.inn/0.7);
        d.g.scale.setScalar(Math.max(0.001,k));
        if(k>=1)delete d.inn
      }
    }

    for(const arr of [obstacles,cornItems,deco])
      for(let i=arr.length-1;i>=0;i--)
        if(arr[i].z>12){scene.remove(arr[i].g);arr.splice(i,1)}

    updateHud();
    
    // Animar pollo local
    const f=t*22;

    if(stunned){
      // Pose inmóvil durante los 5 segundos
      legL.rotation.x=0;
      legR.rotation.x=0;
      body.position.y=0;
      wL.rotation.z=0;
      wR.rotation.z=0;
      chicken.rotation.z=0;
    }else{
      legL.rotation.x=py>0?-0.6:Math.sin(f)*0.9;
      legR.rotation.x=py>0?0.6:-Math.sin(f)*0.9;
      body.position.y=py>0?0:Math.abs(Math.sin(f))*0.12;
      wL.rotation.z=wR.rotation.z=0;
      wL.rotation.z=-Math.abs(Math.sin(f*0.5))*(py>0?1.2:0.3);
      wR.rotation.z=-wL.rotation.z;
      chicken.rotation.z=(px-LANES[laneIdx])*0.25;
    }

    chicken.position.set(px,py,0);

    // Dibujar rival online (pollo a la izquierda, color crema)
    if (online && window.chickenRival) {
      const R = ON.rival;
      window.chickenRival.visible = true;
      window.chickenRival.position.set(R.px, R.py, R.z ?? 0);
      const targetRot = (R.px - LANES[R.lane]) * 0.25;
      window.chickenRival.rotation.z += (targetRot - window.chickenRival.rotation.z) * Math.min(1, dt * 10);
      const fr = t * 22;

      if (window.rivalParts) {
        const P = window.rivalParts;
        if (R.saltando) {
          P.lL.rotation.x = -0.6;
          P.lR.rotation.x = 0.6;
          P.bodyR.position.y = 0;
        } else {
          P.lL.rotation.x = Math.sin(fr) * 0.9;
          P.lR.rotation.x = -Math.sin(fr) * 0.9;
          P.bodyR.position.y = Math.abs(Math.sin(fr)) * 0.12;
        }
        P.wLR.rotation.z = -Math.abs(Math.sin(fr * 0.5)) * (R.saltando ? 1.2 : 0.3);
        P.wRR.rotation.z = -P.wLR.rotation.z;
      }
    }
  }else if(state==='intro'){
    introStep(dt)
  }else if(state==='pause'){
    // En online no hay pausa, pero si por algo se queda en pause, dibujamos los pollos
    chicken.visible=true;
    chicken.position.set(px,py,0);
    body.position.y=py>0?0:0;
    body.rotation.set(0,0,0);
    legL.rotation.x=0;
    legR.rotation.x=0;
    wL.rotation.z=wR.rotation.z=0;
    $('pu').textContent=pu.k?PU[pu.k].n+' '+Math.ceil(pu.t)+'s':'';

    if (online && window.chickenRival) {
      const R = ON.rival;
      window.chickenRival.visible = true;
      window.chickenRival.position.set(R.px, R.py, -0.5);
      window.chickenRival.rotation.z = 0;
    }
  }else if(state==='over'){
    tilt=Math.min(tilt+dt*3,1.5);
    if(phase==='save'){
      saveT-=dt;
      const r=$('ring');
      if(r)r.style.background='conic-gradient(#fff '+Math.max(0,saveT/6*360)+'deg,#ffc933 0)';
      if(saveT<=0&&!busy)results()
    }
    body.rotation.z=tilt;
    body.position.y=0;
    chicken.position.y=0;
    if (window.chickenRival) window.chickenRival.visible = false;
  }else{
    // Menú: pollo corriendo en el lugar
    animDeco(dt,6,false);
    const br=Math.sin(t*1.8);
    legL.visible=legR.visible=false;
    nest.visible=false;
    seeds.visible=false;
    coop.visible=true;
    body.position.y=-0.5;
    body.rotation.x=-0.3+0.03*br;
    body.scale.set(1,1+0.03*br,1);
    eyesZ.visible=true;

    zz.forEach((m,i)=>{
      const u=(t*0.35+i/3)%1,sc=0.35+u*0.45;
      m.visible=true;
      m.position.set(0.5+Math.sin(u*6+i)*0.15,1.1+u*1.3,-1.7);
      m.scale.set(sc,sc,1);
      m.material.opacity=Math.sin(Math.PI*u)
    });

    wL.rotation.z=wR.rotation.z=0;
    chicken.position.set(-6.2,0.45,-1.0);
    coop.scale.setScalar(portrait?0.75:1);
    chicken.rotation.y=Math.PI;
    if (window.chickenRival) window.chickenRival.visible = false;
  }

  skyUpdate(dt);
  fxUpdate(dt);
  tint(Math.min(1,dt*1.5));
  
  // CÁMARA IDÉNTICA A 1 JUGADOR
  if(state==='menu'){
    const pw=portrait;
    camera.position.set(-6.2+(pw?1.8:3.9),pw?2.4:2.2,-1.0+(pw?8.4:7.5));
    camera.lookAt(camera.position.x,pw?1.4:1.3,camera.position.z-10)
  } else if(state!=='intro') {
    camera.position.set(chicken.position.x*0.6,CY+py*0.25,CZ);
    camera.lookAt(chicken.position.x*0.4,1.3,-7);
  }

  renderer.render(scene,camera);
}

reset();applyCos();upTok();applyQuality();applyFps();

if(ACC&&TOKEN){
  showLogin();
  $('lgGo').disabled=true;
  $('lgErr').className='lg-err info';
  $('lgErr').textContent='Cargando…';
  enterGame().then(res=>{
    $('lgGo').disabled=false;
    if(res.ok)hideLogin();
    else{
      clearSession();
      showLogin();
      $('lgErr').className='lg-err';
      $('lgErr').textContent=res.msg
    }
  });
}else{
  ACC=null;
  showLogin()
}

$('play').textContent=COARSE?'TOCA PARA JUGAR':'CLIC PARA JUGAR';
$('menu').addEventListener('click',e=>{
  if(state==='menu'&&!e.target.closest('button'))start()
});
requestAnimationFrame(frame);
