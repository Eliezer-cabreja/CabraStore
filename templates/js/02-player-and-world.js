// Pollo
const chicken=new THREE.Group();scene.add(chicken);
const body=new THREE.Group();chicken.add(body);
mk(BOX,0xffffff,0.95,0.85,1.1,0,0.95,0,body);
mk(BOX,0xffffff,0.55,0.55,0.55,0,1.65,-0.45,body);
mk(BOX,0xd6362b,0.15,0.25,0.4,0,2.02,-0.45,body);
mk(BOX,0xd6362b,0.14,0.2,0.14,0,1.4,-0.78,body);
mk(BOX,0xf49a1a,0.2,0.14,0.3,0,1.62,-0.85,body);
mk(BOX,0x222222,0.08,0.08,0.08,0.29,1.72,-0.62,body);
mk(BOX,0x222222,0.08,0.08,0.08,-0.29,1.72,-0.62,body);
mk(BOX,0xf2f2f2,0.45,0.5,0.5,0,1.1,0.7,body);
const wL=mk(BOX,0xeeeeee,0.12,0.5,0.7,0.54,1.0,0,body),wR=mk(BOX,0xeeeeee,0.12,0.5,0.7,-0.54,1.0,0,body);
const legL=new THREE.Group(),legR=new THREE.Group();
legL.position.set(0.25,0.55,0);legR.position.set(-0.25,0.55,0);chicken.add(legL,legR);
mk(BOX,0xf49a1a,0.12,0.55,0.12,0,-0.25,0,legL);mk(BOX,0xf49a1a,0.12,0.55,0.12,0,-0.25,0,legR);
mk(BOX,0xf49a1a,0.3,0.08,0.4,0,-0.52,-0.1,legL);mk(BOX,0xf49a1a,0.3,0.08,0.4,0,-0.52,-0.1,legR);

// Estado
let state='menu',speed,dist,runCubes,laneIdx,px,py,vy,spawnAt,treeAt,t=0,tilt;
let obstacles=[],cornItems=[],deco=[];

function makeObstacle(lane,z){
  const g=new THREE.Group();g.position.set(LANES[lane],0,z);
  const low=Math.random()<0.5,B=BIOMES[bi];
  if(low){
    mk(BOX,0x8a5a2b,0.2,1,0.2,-0.8,0.5,0,g);mk(BOX,0x8a5a2b,0.2,1,0.2,0.8,0.5,0,g);
    mk(BOX,B.lo,1.9,0.18,0.12,0,0.78,0,g);mk(BOX,B.lo,1.9,0.18,0.12,0,0.4,0,g);
  }else{
    mk(BOX,B.hi,1.7,1.7,1.5,0,0.85,0,g);
    mk(BOX,0xa8791f,1.74,0.1,1.54,0,0.5,0,g);mk(BOX,0xa8791f,1.74,0.1,1.54,0,1.2,0,g);
  }
  if(bi===1&&Math.random()<0.08)crow(g,0,low?0.95:1.7,0,1.4);
  scene.add(g);obstacles.push({g,lane,low,z});
}
function cubeFace(bg){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
  x.fillStyle='#fff';x.fillRect(0,0,128,128);
  x.fillStyle=bg;x.beginPath();if(x.roundRect)x.roundRect(9,9,110,110,16);else x.rect(9,9,110,110);x.fill();
  x.fillStyle='#fff';x.font='bold 88px "Lilita One","Arial Black",sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('?',64,70);
  return new THREE.CanvasTexture(c);
}
const cmL=new THREE.MeshBasicMaterial({map:cubeFace('#68c6f2')}),cmP=new THREE.MeshBasicMaterial({map:cubeFace('#8c7ab8')}),cmD=new THREE.MeshBasicMaterial({map:cubeFace('#537fc2')});
const cubeMats=[cmL,cmL,cmP,cmP,cmD,cmD],ringMat=new THREE.MeshBasicMaterial({color:0xc9b8dc}),dotMat=new THREE.MeshBasicMaterial({color:0x8c7ab8}),RING_G=new THREE.TorusGeometry(1,0.03,6,56);
const cubeHalo=new THREE.SpriteMaterial({map:haloMat.map,color:0xb59cff,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:0.3});
function makeCube(lane,z){
  const g=new THREE.Group();g.position.set(LANES[lane],1.3,z);
  const c=new THREE.Group();g.add(c);
  const m=new THREE.Mesh(BOX,cubeMats);m.scale.setScalar(0.9);c.add(m);
  const rg=new THREE.Group();rg.rotation.set(1.25,0.15,0.25);g.add(rg);
  rg.add(new THREE.Mesh(RING_G,ringMat));
  const d1=new THREE.Mesh(SPH,dotMat),d2=new THREE.Mesh(SPH,dotMat);d1.scale.setScalar(0.09);d2.scale.setScalar(0.09);rg.add(d1,d2);
  const h=new THREE.Sprite(cubeHalo);h.scale.set(2.6,2.6,1);g.add(h);
  scene.add(g);cornItems.push({g,c,lane,z,ph:Math.random()*6,d1,d2});
}
// Al entrar a otro mundo: la decoración del anterior se encoge y desaparece, y la del nuevo crece en su lugar
function swapDeco(){bigW=[[],[]];
  for(const d of deco)if(d.b!==undefined&&d.out===undefined)d.out=0;
  for(let z=-130;z<-6;z+=4){makeTree(z);const d=deco[deco.length-1];d.inn=0;d.g.scale.setScalar(0.001)}
}
function quad(g,k,sleep,col){
  const S=0.75,P={
    horse:{w:.8,h:.9,l:2,lh:1.1,c:[0x8a5a2b,0x3a2a1a,0xc9c0b0,0x5a3a20][Math.random()*4|0],nk:.8,hl:.8,ear:.2,dark:0x2a1a10},
    cow:{w:1,h:1,l:1.9,lh:.8,c:0xf2f2f2,nk:.15,hl:.6,ear:.25,dark:0x222222,spots:1,horn:1},
    pig:{w:.9,h:.75,l:1.3,lh:.45,c:0xf2a0a8,nk:0,hl:.5,ear:.2,dark:0xd8808a,snout:1},
    donkey:{w:.7,h:.8,l:1.6,lh:.95,c:0x8a8a92,nk:.5,hl:.7,ear:.5,dark:0x55555c},
    bear:{w:1.3,h:1.1,l:2.1,lh:.7,c:0xf4f6f8,nk:0,hl:.7,ear:.15,dark:0xcfd8de,leg:0xf4f6f8,lw:.38},
    camel:{w:.8,h:.9,l:2,lh:1.3,c:0xc99a5b,nk:1.1,hl:.7,ear:.12,dark:0x8a6a3a,hump:1}}[k];
  const m=(c,w,h,l,x,y,z)=>mk(BOX,c,w*S,h*S,l*S,x*S,y*S,z*S,g),c0=col||P.c,lh=sleep?0.2:P.lh,by=lh+P.h/2,legs=[];
  m(c0,P.w,P.h,P.l,0,by,0);if(P.hump)for(const z of[-0.4,0.4])m(c0,0.5,0.45,0.5,0,by+P.h/2+0.2,z);
  const hy=sleep?lh+P.w*0.3:by+P.h/2+P.nk*0.75,hz=-P.l/2-P.hl/2+(sleep?-0.05:0.15);
  if(P.nk&&!sleep)mk(BOX,c0,P.w*0.45*S,(P.nk+0.4)*S,P.w*0.45*S,0,(by+P.h/2+P.nk*0.35)*S,(-P.l/2+0.1)*S,g).rotation.x=-0.35;
  const hd=m(c0,P.w*0.55,P.w*0.55,P.hl,0,hy,hz);
  if(P.snout)m(P.dark,P.w*0.4,P.w*0.3,0.15,0,hy-0.05,hz-P.hl/2-0.05);
  for(const sx of[-1,1]){m(P.dark,0.1,P.ear,0.1,sx*P.w*0.2,hy+P.w*0.27+P.ear/2,hz+P.hl*0.2);if(P.horn)m(0xeeeeee,0.08,0.18,0.08,sx*P.w*0.3,hy+P.w*0.3,hz+0.1)}
  if(P.spots)[[0.3,0.5,-0.3],[0.5,0.45,0.4],[0.4,0.4,0.65]].forEach(([w,h,z])=>m(0x222222,P.w+0.02,h,w,0,by+h*0.2,z));
  const tl=m(P.dark,0.1,0.5,0.1,0,by+P.h*0.2,P.l/2+0.05);
  if(!sleep||true)for(const x of[-1,1])for(const z of[-1,1]){const pv=new THREE.Group();pv.position.set(x*(P.w/2-0.12)*S,lh*S,z*(P.l/2-0.2)*S);g.add(pv);mk(BOX,P.leg||P.dark,(P.lw||0.18)*S,lh*S,(P.lw||0.18)*S,0,-lh*S/2,0,pv);if(!sleep)legs.push(pv)}
  g.userData.legs=sleep?null:legs;g.userData.head=hd;g.userData.hy=hd.position.y;g.userData.tail=tl;
}
function mudPit(g){
  mk(CYL,0x5a3d22,2.2,0.08,1.6,0,0.04,0,g);mk(CYL,0x6b4a2c,1.9,0.09,1.3,0,0.045,0,g);
  const n=1+(Math.random()*2|0);for(let i=0;i<n;i++){const p=new THREE.Group();p.position.set(i*1.1-0.4,0.05,(Math.random()-0.5)*0.6);p.rotation.y=Math.random()*6;g.add(p);quad(p,'pig',true,0xb98a78)}
  g.userData.sleep=true;
}
function bird(g,dark){
  g.position.y=16+Math.random()*10;g.position.x=(Math.random()-0.5)*50;
  const wings=[],n=Math.random()<0.8?1:2;
  for(let i=0;i<n;i++){const b=new THREE.Group();b.scale.setScalar(dark?2.2:2.6);b.position.set((i-(n-1)/2)*9,Math.random()*2,Math.random()*8);g.add(b);
    mk(BOX,dark?0x16161c:0xf2f2f2,0.3,0.25,0.7,0,0,0,b);mk(BOX,dark?0x2a2a32:0xdddddd,0.25,0.22,0.25,0,0.05,-0.3,b);mk(BOX,dark?0x555560:0xf49a1a,0.1,0.08,0.2,0,0,-0.45,b);
    for(const sd of[-1,1]){const w=new THREE.Group();w.position.set(sd*0.15,0.05,0);b.add(w);mk(BOX,dark?0x1c1c24:0xe8e8e8,0.7,0.05,0.4,sd*0.35,0,0,w);wings.push(w)}}
  g.userData.vk=-(0.45+Math.random()*0.35);g.userData.wings=wings;
}
function hay(g,s){
  mk(CYL,0xe0b341,0.7*s,1.2*s,0.7*s,0,0.7*s,0,g).rotation.z=Math.PI/2;mk(CYL,0xd9a93a,0.7*s,1.2*s,0.7*s,1.3*s,0.7*s,0.2,g).rotation.z=Math.PI/2;
  mk(CYL,0xe0b341,0.7*s,1.2*s,0.7*s,0.6*s,1.8*s,0,g).rotation.z=Math.PI/2;
}
function fence(g,side){
  g.position.x=side*(4.4+Math.random()*0.5);
  for(const z of[-3,-1,1,3])mk(BOX,0x8a6a3a,0.18,1.0,0.18,0,0.5,z,g);
  mk(BOX,0xa8855a,0.08,0.12,6.4,0,0.82,0,g);mk(BOX,0xa8855a,0.08,0.12,6.4,0,0.45,0,g);
}
function animDeco(dt,sp,world){
  const dz=world?sp*dt:0;
  for(const d of deco){
    d.z+=dz+(d.vk||0)*sp*dt;
    if(!world){if(d.z<-140)d.z=12;else if(d.z>12)d.z=-140;d.g.visible=!(Math.abs(d.g.position.x+6.2)<3.5&&Math.abs(d.z+1)<6)}
    d.g.position.z=d.z;
    const a=t+d.ph;
    if(d.legs){const f=a*(d.run?13:6.5);d.legs.forEach((l,i)=>l.rotation.x=Math.sin(f+(i%3?Math.PI:0))*(d.run?0.9:0.5));d.g.position.y=Math.abs(Math.sin(f))*(d.run?0.12:0.05)}
    if(d.head){const rot=d.graze?Math.max(0,Math.sin(a*1.4)):0;d.head.rotation.x=-0.8*rot;d.head.position.y=d.hy-0.2*rot}
    if(d.tail)d.tail.rotation.z=Math.sin(a*5)*0.5;
    if(d.wings){d.wings.forEach((w,i)=>w.rotation.z=(i%2?1:-1)*Math.sin(a*12)*0.8);d.g.position.y=d.y0+Math.sin(a*1.5)*0.6;d.g.position.x=d.x0+Math.sin(a*0.7)*3}
    if(d.sleep&&d.out===undefined&&d.inn===undefined)d.g.scale.y=1+0.03*Math.sin(a*2)
  }
}
function crow(p,x,y,z,sc){
  const c=new THREE.Group();c.position.set(x,y,z);c.scale.setScalar(sc||1);c.rotation.y=Math.random()*6.28;p.add(c);
  mk(BOX,0x16161c,0.35,0.3,0.6,0,0.2,0,c);mk(BOX,0x16161c,0.25,0.25,0.25,0,0.42,-0.3,c);mk(BOX,0x555560,0.1,0.08,0.22,0,0.4,-0.5,c);mk(BOX,0x0e0e12,0.3,0.12,0.3,0,0.2,0.4,c);
}
function biomeAnimal(g,k,side){
  const u=g.userData;
  if(Math.random()<0.55){quad(g,k);u.vk=k==='bear'?-0.22:-0.25;g.position.x=side*(5.0+Math.random()*1.2)}
  else{quad(g,k,true);u.sleep=true;g.position.x=side*(7+Math.random()*5);g.rotation.y=Math.random()*6.28}
}
function house(g,side){g.userData.big=true;
  g.position.x=side*(13+Math.random()*4);g.rotation.y=side*Math.PI/2;
  const WALL=[0xf0e6d0,0xe8d0a0,0xd9e4ee][Math.random()*3|0],WHT=0xf8f2e4;
  mk(BOX,WALL,3.6,2.2,3.0,0,1.1,0,g);mk(BOX,0x8a8a8a,3.8,0.3,3.2,0,0.15,0,g);
  for(const z of[-1.5,1.5])[[3.2,2.35],[2.3,2.65],[1.4,2.95],[0.5,3.25]].forEach(([w,y])=>mk(BOX,WALL,w,0.3,0.14,0,y,z,g));
  for(const sd of[-1,1]){const sl=new THREE.Group();sl.position.set(sd*1.05,2.99,0);sl.rotation.z=-sd*0.6;g.add(sl);
    mk(BOX,0xa8322a,2.54,0.14,3.4,0,0,0,sl);for(let i=0;i<5;i++)mk(BOX,0x7a2118,2.54,0.03,0.05,0,0.085,-1.4+i*0.7,sl)}
  mk(BOX,0x5a1a14,0.28,0.14,3.5,0,3.7,0,g);mk(BOX,0x9a5a4a,0.5,1.3,0.5,1.0,3.3,0.6,g);
  mk(BOX,0x6b3f1d,0.8,1.5,0.1,0,0.85,-1.54,g);mk(BOX,WHT,1.0,0.12,0.12,0,1.65,-1.55,g);mk(BOX,0xffd36a,0.08,0.08,0.06,0.28,0.85,-1.6,g);
  for(const x of[-1.1,1.1]){mk(BOX,WHT,0.8,0.7,0.08,x,1.35,-1.54,g);mk(BOX,0x2a3a55,0.6,0.5,0.1,x,1.35,-1.56,g)}
  mk(BOX,0x9a6b3a,1.6,0.12,1.0,0,0.06,-2.05,g);for(const x of[-0.7,0.7])mk(BOX,WHT,0.12,1.6,0.12,x,0.8,-2.5,g);mk(BOX,0x7a2118,1.8,0.1,1.2,0,1.65,-2.0,g);
}
// Casas y graneros junto al camino en el lugar donde arranca la carrera
function startVillage(){
  deco=deco.filter(d=>{const bad=d.z>-75&&(d.big||d.legs||d.graze||d.sleep||d.head);if(bad)scene.remove(d.g);return !bad});
  const put=(fn,side,z,x)=>{const g=new THREE.Group();g.position.set(0,0,z);fn(g,side);g.position.x=side*x;scene.add(g);deco.push({g,z,b:bi,ph:0,y0:0,x0:g.position.x,big:true})};
  [[house,-1,-9,7.8],[barn,-1,-34,8.4],[house,-1,-58,7.8],[house,1,-3,7.8],[barn,1,-22,8.4],[house,1,-46,7.8],[barn,1,-68,8.4]].forEach(a=>put(...a));
}
let bigW=[[],[]];
function farmProp(g,s,side,z){
  const r=Math.random(),k=['horse','cow','pig','donkey'][Math.random()*4|0],u=g.userData,W=z-2*dist,bs=side>0?1:0;
  let t2=r<0.20?'tree':r<0.32?'barn':r<0.42?'house':r<0.56?'walk':r<0.62?'graze':r<0.68?'sleep':r<0.72?'mud':r<0.76?'hay':r<0.82?'fence':r<0.90?'bird':'tree';
  if((t2==='barn'||t2==='house')&&bigW[bs].some(w=>Math.abs(w-W)<16))t2='tree';
  if(t2==='barn'||t2==='house'){bigW[bs].push(W);if(bigW[bs].length>14)bigW[bs].shift()}
  g.position.x=side*(11+Math.random()*3);
  if(t2==='tree')natTree(g,s,side);
  else if(t2==='barn')barn(g,side);
  else if(t2==='house')house(g,side);
  else if(t2==='walk'){quad(g,k);
    if(k==='horse'||k==='donkey'){u.run=true;u.vk=-0.55;g.position.x=side*5.9}
    else if(Math.random()<0.6){u.vk=-0.28;g.position.x=side*7.6}
    else{u.vk=0.2;g.position.x=side*9.2;g.rotation.y=Math.PI}}
  else if(t2==='graze'){quad(g,k);u.legs=null;u.graze=true;g.rotation.y=Math.random()*6.28}
  else if(t2==='sleep'){quad(g,k,true);g.rotation.y=Math.random()*6.28;u.sleep=true}
  else if(t2==='mud')mudPit(g);
  else if(t2==='hay')hay(g,s);
  else if(t2==='fence')fence(g,side);
  else bird(g);
}
function natTree(g,s,side){
  const r=Math.random();
  g.position.x=side*(10.2+(r<0.55?2.3:r<0.85?1.5:1)*s+Math.random()*6);
  if(r<0.55){mk(BOX,0x6b4a2a,0.55*s,2.2*s,0.55*s,0,1.1*s,0,g);
    [[0,3.0,0,1.5,0x2f7d32],[0.8,2.6,0.2,1.1,0x3a8f3d],[-0.8,2.7,-0.2,1.15,0x276b2a],[0.1,3.7,0,1.0,0x3a8f3d]].forEach(([x,y,z,q,c])=>mk(SPH,c,q*s,q*s*0.9,q*s,x*s,y*s,z*s,g))}
  else if(r<0.85){mk(BOX,0x5a3d22,0.4*s,1.2*s,0.4*s,0,0.6*s,0,g);
    [[1.5,1.7,1.9,0x1f6b3a],[1.2,1.5,2.8,0x247a40],[0.85,1.4,3.7,0x2a8a47]].forEach(([q,h,y,c])=>mk(CONE,c,q*s,h*s,q*s,0,y*s,0,g))}
  else[[0,0.5,0,0.7],[0.6,0.4,0.1,0.55],[-0.6,0.4,-0.1,0.55]].forEach(([x,y,z,q])=>mk(SPH,0x3f8f3a,q*s,q*s*0.8,q*s,x*s,y*s,z*s,g));
}
function hellProp(g,s){
  if(Math.random()<0.35){mk(BOX,0x1a1410,0.45*s,3*s,0.45*s,0,1.5*s,0,g);
    [[0.7,2.2],[-0.7,2.6],[0.5,3.1]].forEach(([x,y])=>{mk(BOX,0x1a1410,0.12*s,1.1*s,0.12*s,x*s*0.5,y*s,0,g).rotation.z=-Math.sign(x)*0.9});if(Math.random()<0.3)crow(g,0.1*s,3.0*s,0,1.3)}
  else{mk(CONE,0x26262e,1.3*s,4.2*s,1.3*s,0,2.1*s,0,g);mk(CONE,0x1f1f26,0.9*s,2.6*s,0.9*s,1.1*s,1.3*s,0.4,g);mk(CONE,0x2f2f38,0.7*s,2.0*s,0.7*s,-1.0*s,1.0*s,-0.3,g);
    mk(BOX,0,0.1,2.2*s,0.06,0.5*s,1.4*s,0.9*s,g).material=bas(0xff5a14);mk(BOX,0,0.08,1.4*s,0.06,-0.4*s,1.0*s,0.8*s,g).material=bas(0xff8a2a)}
}
function desertProp(g,s,side){
  const r=Math.random();
  if(r<0.4){const G=0x36632f;mk(CYL,G,0.38*s,3.2*s,0.38*s,0,1.6*s,0,g);mk(SPH,G,0.38*s,0.38*s,0.38*s,0,3.2*s,0,g);
    for(const sd of[-1,1])if(Math.random()<0.8){mk(CYL,G,0.2*s,0.7*s,0.2*s,sd*0.4*s,1.7*s,0,g).rotation.z=Math.PI/2;mk(CYL,G,0.2*s,1.2*s,0.2*s,sd*0.75*s,2.3*s,0,g);mk(SPH,G,0.2*s,0.2*s,0.2*s,sd*0.75*s,2.9*s,0,g)}}
  else if(r<0.6){const sx=(4+Math.random()*3)*s;g.position.x=side*(3.7+sx+2+Math.random()*3);mk(SPH,0x907f60,sx,1.4*s,sx*0.7,0,0,0,g)}
  else if(r<0.8){[[0,0.7,0,1.2,1.4,1.0,0x784228],[1.1,0.45,0.4,0.9,0.9,0.8,0x6c3a22],[-0.9,0.35,-0.3,0.7,0.7,0.6,0x82492c]].forEach(([x,y,z,w,h,d,c])=>{mk(BOX,c,w*s,h*s,d*s,x*s,y*s,z*s,g).rotation.y=Math.random()*1.2})}
  else{g.position.x=side*(3.7+3*s+3+Math.random()*4);let y=0;[[0x7d4428,1.2],[0x6b3a22,1.1],[0x8a5632,0.9],[0x74401f,1.3]].forEach(([c,h],i)=>{const w=(5.5-i*0.3)*s;mk(BOX,c,w,h*s,w*0.8,0,(y+h/2)*s,0,g);y+=h})}
}
function barn(g,side){g.userData.big=true;
  g.position.x=side*(14+Math.random()*5);g.rotation.y=side*Math.PI/2;
  mk(BOX,0xa8322a,3.2,2.4,4,0,1.2,0,g);
  for(const x of[-1.6,1.6])for(const z of[-2,2])mk(BOX,0xf2e8d0,0.16,2.4,0.16,x,1.2,z,g);
  for(const z of[-2,2])[[3.2,2.55],[2.4,2.85],[1.6,3.15],[0.8,3.45]].forEach(([w,y])=>mk(BOX,0xa8322a,w,0.3,0.14,0,y,z,g));
  mk(BOX,0x7a2118,1.4,1.7,0.08,0,0.85,-2.04,g);mk(BOX,0xf2e8d0,1.6,0.12,0.1,0,1.75,-2.05,g);
  mk(BOX,0xf2e8d0,0.08,2.0,0.06,0,0.85,-2.1,g).rotation.z=0.88;mk(BOX,0xf2e8d0,0.08,2.0,0.06,0,0.85,-2.1,g).rotation.z=-0.88;
  mk(BOX,0xf2e8d0,0.8,0.7,0.08,0,2.8,-2.08,g);mk(BOX,0x2a1a14,0.6,0.5,0.1,0,2.8,-2.1,g);
  for(const sd of[-1,1]){const sl=new THREE.Group();sl.position.set(sd*0.95,3.0,0);sl.rotation.z=-sd*0.5;g.add(sl);
    mk(BOX,0x55555e,2.2,0.12,4.4,0,0,0,sl);for(let i=0;i<7;i++)mk(BOX,0x3a3a42,2.2,0.05,0.07,0,0.08,-2+i*0.66,sl)}
  mk(BOX,0x2f2f36,0.25,0.12,4.5,0,3.55,0,g);
  mk(CYL,0xcfd4d8,0.8,3.2,0.8,side*2.6,1.6,0.8,g);mk(SPH,0xb8bdc2,0.8,0.7,0.8,side*2.6,3.2,0.8,g);
}
function makeTree(z){
  const g=new THREE.Group(),side=Math.random()<0.5?-1:1,s=0.8+Math.random()*0.8,k=BIOMES[bi].deco,x=Math.random()<0.28;
  g.position.set(side*(7+Math.random()*8),0,z);
  if(k==='pine'&&Math.random()<0.11)biomeAnimal(g,'bear',side);else if(k==='cactus'&&Math.random()<0.12)biomeAnimal(g,'camel',side);else if(k==='spire'&&Math.random()<0.07)bird(g,true);else if(k==='tree')farmProp(g,s,side,z);
  else if(k==='spire'){if(x){g.position.x=side*(6.4+Math.random()*5);mk(BOX,0,5,0.12,8,0,0.06,g).material=bas(0xff4a0a)}else hellProp(g,s)}
  else if(k==='cactus'){if(x){g.position.x=side*(3.7+2.55*s+1.6+Math.random()*4);mk(PYR,0xd9a24f,3.6*s,3.2*s,3.6*s,0,1.6*s,0,g).rotation.y=Math.PI/4}else desertProp(g,s,side)}
  else if(k==='pine'){if(x){mk(SPH,0xffffff,0.9*s,0.9*s,0.9*s,0,0.8*s,0,g);mk(SPH,0xffffff,0.6*s,0.6*s,0.6*s,0,1.9*s,0,g);mk(BOX,0xf49a1a,0.12,0.12,0.4,0,1.9*s,0.6*s,g)}else{mk(BOX,0x6b4a2a,0.4*s,1.2*s,0.4*s,0,0.6*s,0,g);mk(CONE,0x1f5f4a,2*s,3*s,2*s,0,2.6*s,0,g);mk(CONE,0xffffff,1.3*s,1.2*s,1.3*s,0,3.7*s,0,g)}}
  else if(k==='crystal'){if(x)mk(SPH,0x6a5a9a,1.3*s,1.1*s,1.3*s,0,3+Math.random()*6,0,g);else{mk(CONE,0,0.9*s,3.5*s,0.9*s,0,1.75*s,0,g).material=bas(0x8a4cff);mk(CONE,0,0.5*s,2*s,0.5*s,0.8*s,1*s,0,g).material=bas(0x39e6c8)}}
  else{const h=4+Math.random()*9,c=Math.random()<0.5?0x14f195:0x9945ff;mk(BOX,0x1a1a33,2,h,2,0,h/2,0,g);mk(BOX,0,2.06,0.2,2.06,0,h*0.35,0,g).material=bas(c);mk(BOX,0,2.06,0.2,2.06,0,h*0.75,0,g).material=bas(c);if(x)mk(BOX,0,1.6,0.9,0.2,0,h+0.8,0,g).material=bas(0xff7ad9)}
  const u=g.userData;scene.add(g);deco.push({g,z,b:bi,vk:u.vk||0,run:u.run,graze:u.graze,head:u.head,hy:u.hy,tail:u.tail,legs:u.legs,sleep:u.sleep,wings:u.wings,y0:g.position.y,x0:g.position.x,big:u.big,ph:Math.random()*6});
}
const dashM=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.3});
function makeDash(z){const g=new THREE.Group();g.position.z=z;for(const x of[-1.1,1.1])mk(BOX,0,0.12,0.02,2.6,x,0.01,0,g).material=dashM;scene.add(g);deco.push({g,z})}
function clearAll(){[...obstacles,...cornItems,...deco].forEach(o=>scene.remove(o.g));obstacles=[];cornItems=[];deco=[]}

function reset(){
  clearAll();bigW=[[],[]];lastCube=-1e9;pu={k:null,t:0};boost=1;seeds.visible=false;nest.visible=false;coop.visible=false;body.position.y=0;body.scale.set(1,1,1);eyesZ.visible=false;zz.forEach(m=>m.visible=false);applyPU();$('pu').textContent='';freeUsed=false;revives=0;inv=0;phase='';chicken.visible=true;bi=0;tint(1);speed=13;dist=0;runCubes=0;laneIdx=1;px=0;py=0;vy=0;spawnAt=18;treeAt=0;tilt=0;
  for(let z=-140;z<0;z+=4){makeTree(z);makeDash(z)}
  startVillage();
  deco=deco.filter(d=>{const n=Math.abs(d.g.position.x+6.2)<3&&Math.abs(d.z+1)<5;if(n)scene.remove(d.g);return !n});
  chicken.rotation.set(0,0,0);chicken.position.set(0,0,0);body.rotation.set(0,0,0);
  updateHud();
}
// Cubo sorpresa: aparece pocas veces; mientras más lejos llegas, más probable es (0.4 % al inicio, ~3.4 % a los 3000 m) y nunca dos a menos de 300 m.
const cubeChance=()=>0.004+Math.min(dist,3000)/3000*0.03;
let lastCube=-1e9;
function spawnPattern(z){
  const free=[0,1,2].sort(()=>Math.random()-0.5);
  const n=Math.random()<0.4?2:1;
  for(let i=0;i<n;i++)makeObstacle(free[i],z);
  const cl=free[n];
  if(dist-lastCube>300&&Math.random()<cubeChance()){lastCube=dist;makeCube(cl,z+2)}
}
function updateHud(){$('dist').innerHTML=ic('directions_run')+' '+Math.floor(dist)+' m';$('corn').innerHTML=CUBE_I+runCubes}

// ===== Segundo pollo (rival) para el modo online =====
const chickenRival = new THREE.Group();
chickenRival.visible = false;
scene.add(chickenRival);

function clonarPollo(destino) {
  const bodyR = new THREE.Group();
  destino.add(bodyR);
  mk(BOX,0xffffff,0.95,0.85,1.1,0,0.95,0,bodyR);
  mk(BOX,0xffffff,0.55,0.55,0.55,0,1.65,-0.45,bodyR);
  mk(BOX,0xd6362b,0.15,0.25,0.4,0,2.02,-0.45,bodyR);
  mk(BOX,0xd6362b,0.14,0.2,0.14,0,1.4,-0.78,bodyR);
  mk(BOX,0xf49a1a,0.2,0.14,0.3,0,1.62,-0.85,bodyR);
  mk(BOX,0x222222,0.08,0.08,0.08,0.29,1.72,-0.62,bodyR);
  mk(BOX,0x222222,0.08,0.08,0.08,-0.29,1.72,-0.62,bodyR);
  mk(BOX,0xf2f2f2,0.45,0.5,0.5,0,1.1,0.7,bodyR);
  const wLR=mk(BOX,0xeeeeee,0.12,0.5,0.7,0.54,1.0,0,bodyR);
  const wRR=mk(BOX,0xeeeeee,0.12,0.5,0.7,-0.54,1.0,0,bodyR);
  const lL=new THREE.Group(), lR=new THREE.Group();
  lL.position.set(0.25,0.55,0); lR.position.set(-0.25,0.55,0);
  destino.add(lL,lR);
  mk(BOX,0xf49a1a,0.12,0.55,0.12,0,-0.25,0,lL);
  mk(BOX,0xf49a1a,0.12,0.55,0.12,0,-0.25,0,lR);
  mk(BOX,0xf49a1a,0.3,0.08,0.4,0,-0.52,-0.1,lL);
  mk(BOX,0xf49a1a,0.3,0.08,0.4,0,-0.52,-0.1,lR);
  return { bodyR, wLR, wRR, lL, lR };
}

const rivalParts = clonarPollo(chickenRival);

// Tinte amarillo al rival para distinguirlo del local
chickenRival.traverse(o => {
  if (o.isMesh && o.material && o.material.color) {
    const c = o.material.color.getHex();
    // No tintar pico ni patas (naranja)
    if (c !== 0xf49a1a && c !== 0xd6362b) {
      o.material = o.material.clone();
      o.material.color.setHex(0xffe066);
    }
  }
});

window.chickenRival = chickenRival;
window.rivalParts = rivalParts;