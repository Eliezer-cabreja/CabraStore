// ---- Inicio de sesión: todo pasa por tu servidor (registrarse / loguearse). Sin servidor no se puede entrar. ----
const API_BASE='https://api-chicken-runner.monitorealo.online';
let onlineSocket=null;
function connectOnline(){
  if(!NAME||!TOKEN||typeof io!=='function')return;
  if(onlineSocket){
    if(onlineSocket.connected)onlineSocket.emit('usuarios_conectados',NAME);
    return;
  }
  onlineSocket=io(API_BASE);
  onlineSocket.on('connect',()=>{
    if(NAME&&TOKEN)onlineSocket.emit('usuarios_conectados',NAME);
  });
  onlineSocket.on('connect_error',err=>console.warn('No se pudo conectar al WebSocket de usuarios online:',err&&err.message||err));
}
function disconnectOnline(){
  if(onlineSocket){onlineSocket.disconnect();onlineSocket=null;}
}

const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const EYE_ON='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',EYE_OFF='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.5 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1"/></svg>';
let lgIn=true,cspHit=false;
document.addEventListener('securitypolicyviolation',()=>{cspHit=true});
async function apiPost(path,body){
  const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),10000);
  try{const r=await fetch(API_BASE+path,{method:'POST',headers:Object.assign({'Content-Type':'application/json'},TOKEN?{Authorization:'Bearer '+TOKEN}:{}),body:JSON.stringify(body),signal:ac.signal});
    let d={};try{d=await r.json()}catch(e){}
    return{ok:r.ok,status:r.status,data:d||{}}}
  catch(e){return{net:true}}
  finally{clearTimeout(tm)}
}
function lgMode(m){lgIn=m==='in';$('tabIn').classList.toggle('on',lgIn);$('tabUp').classList.toggle('on',!lgIn);$('lgRow0').hidden=lgIn;$('lgRow2').hidden=lgIn;$('lgGo').textContent=lgIn?'Entrar':'Crear cuenta';$('lgPw').autocomplete=lgIn?'current-password':'new-password';$('lgErr').textContent='';$('lgErr').className='lg-err'}
function lgEye(id,b){const i=$(id),sh=i.type==='password';i.type=sh?'text':'password';b.innerHTML=sh?EYE_OFF:EYE_ON}
function lgSoc(n){const e=$('lgErr');e.className='lg-err info';e.textContent=n+' todavía no está disponible. Por ahora usa tu correo.'}
function showLogin(){$('login').classList.remove('hide');$('menu').classList.add('hide');lgMode('in')}
function hideLogin(){$('login').classList.add('hide');$('menu').classList.remove('hide')}
const apiOk=r=>!r.net&&r.ok&&r.data.status===true;
const authFail=r=>!r.net&&(r.status===401||r.status===403);
const apiMsg=r=>r.net?'No se pudo conectar con el servidor.':(r.data.mensaje||r.data.message||'Ocurrió un error. Inténtalo de nuevo.');
const apiAuth=(path,body)=>apiPost(path,Object.assign({token:TOKEN},body||{}));
function applyProfile(D){
  D=D||{};
  const has=(...keys)=>keys.some(k=>Object.prototype.hasOwnProperty.call(D,k));
  PROFILE=has('monedas')?D.monedas!==undefined:PROFILE;
  if(has('monedas'))P.coins=+D.monedas||0;
  if(has('cubos'))P.cubos=+D.cubos||0;

  // No borrar inventario/ropa cuando una respuesta de partida solo devuelve monedas.
  if(has('inventario','objetos_inventario','inventario_objetos')){
    const iv=D.inventario??D.objetos_inventario??D.inventario_objetos??{};
    P.inv={};for(const k in iv)P.inv[k]=+iv[k]||0;
  }
  if(has('ropa','ropas','inventario_ropa','ropa_inventario')){
    const ownRaw=D.ropa??D.ropas??D.inventario_ropa??D.ropa_inventario??[];
    P.own=Array.isArray(ownRaw)?ownRaw:(ownRaw&&typeof ownRaw==='object'?Object.keys(ownRaw).filter(k=>+ownRaw[k]>0):[]);
  }
  if(has('ropa_equipada','ropa_equipada_id','ropa_equipo','ropa_equipada_ids'))
    P.ropaEq=D.ropa_equipada??D.ropa_equipada_id??D.ropa_equipo??D.ropa_equipada_ids??[];
  if(has('personajes'))P.pj=Array.isArray(D.personajes)?D.personajes:[];
  if(has('personaje_equipado'))P.pjEq=D.personaje_equipado||'';
  if(has('mejor_distancia'))P.bestDist=+D.mejor_distancia||0;
  if(has('partidas'))P.runs=+D.partidas||0;
  applyCos();upTok();
}
async function refreshProfile(){const r=await apiAuth('/api/juego/perfil');if(apiOk(r))applyProfile(r.data.Datos);return r}
async function syncFrom(r){const D=r.data&&r.data.Datos;if(D&&D.monedas!==undefined)applyProfile(D);else await refreshProfile()}
async function loadCatalog(){
  const r=await apiAuth('/api/tienda/catalogo');
  if(!apiOk(r))return false;
  const D=r.data.Datos||{},arr=a=>Array.isArray(a)?a:[];
  CAT={objetos:arr(D.objetos),ropa:arr(D.ropa),personajes:arr(D.personajes)};CAT_OK=true;return true;
}
const pendKey=()=>'cr-pend:'+(ACC||'');
function pendGet(){try{return JSON.parse(localStorage.getItem(pendKey()))||[]}catch(e){return[]}}
function pendSet(a){try{localStorage.setItem(pendKey(),JSON.stringify(a))}catch(e){}}
function pendAdd(o){const a=pendGet();a.push(o);pendSet(a.slice(-20))}
async function flushPending(){const a=pendGet();if(!a.length)return;const rest=[];for(const o of a){const r=await apiAuth('/api/juego/partida',o);if(r.net)rest.push(o)}pendSet(rest)}
async function enterGame(){
  const r=await apiAuth('/api/juego/perfil');
  if(apiOk(r)){
    let D=r.data.Datos;
    if(pendGet().length){await flushPending();const r2=await apiAuth('/api/juego/perfil');if(apiOk(r2))D=r2.data.Datos}
    applyProfile(D);await loadCatalog();connectOnline();return{ok:true};
  }
  if(authFail(r))return{ok:false,msg:'Tu sesión expiró. Inicia sesión de nuevo.'};
  applyProfile({});
  toast(r.net?'Error de conexión':'No se pudo cargar tu perfil',3500);
  return{ok:true};
}
function clearSession(){ACC=null;NAME='';TOKEN='';CAT={objetos:[],ropa:[],personajes:[]};CAT_OK=false;P.coins=0;P.cubos=0;P.inv={};P.own=[];P.ropaEq=[];P.pj=[];P.pjEq='';P.bestDist=0;P.runs=0;PROFILE=false;try{localStorage.removeItem('cr-session');localStorage.removeItem('cr-name');localStorage.removeItem('cr-token')}catch(e){}applyProfile({})}
async function loginOK(em,nm,tk){
  ACC=em;NAME=nm||'';TOKEN=tk||'';
  if(REMEMBER_SESSION){try{localStorage.setItem('cr-session',em);localStorage.setItem('cr-name',NAME);localStorage.setItem('cr-token',TOKEN)}catch(e){}}
  const res=await enterGame();
  if(!res.ok){clearSession();return res}
  ['lgName','lgEmail','lgPw','lgPw2'].forEach(i=>$(i).value='');hideLogin();return res;
}
async function lgSubmit(e){
  e.preventDefault();
  const er=$('lgErr'),go=$('lgGo');
  const fail=m=>{er.className='lg-err';er.textContent=m};
  const label=go.textContent;
  try{
    const name=$('lgName').value.trim(),em=$('lgEmail').value.trim().toLowerCase(),pw=$('lgPw').value;
    er.className='lg-err';er.textContent='';
    if(!lgIn&&!/^[\wÀ-ÿ .-]{3,20}$/.test(name))return fail('El nombre de usuario debe tener entre 3 y 20 caracteres.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em))return fail('Escribe un correo válido.');
    if(pw.length<6)return fail('La contraseña debe tener al menos 6 caracteres.');
    if(!lgIn&&pw!==$('lgPw2').value)return fail('Las contraseñas no coinciden.');
    go.disabled=true;go.textContent='Conectando…';cspHit=false;
    const down=async()=>{await new Promise(r=>setTimeout(r,80));fail(cspHit?'Esta página no tiene permiso para conectarse a tu servidor (bloqueo de seguridad del navegador). Abre el juego desde tu propio dominio.':'No se pudo conectar con el servidor. Inténtalo más tarde.')};
    const r=await apiPost(lgIn?'/api/auth/loguearse':'/api/auth/registrarse',lgIn?{email:em,password:pw}:{name,email:em,password:pw});
    if(r.net)return await down();
    let L=r;
    if(lgIn){
      if(!(r.ok&&r.data.status===true))return fail(r.data.mensaje||r.data.message||'Correo o contraseña incorrectos.');
    }else{
      if(!(r.status===201||r.data.status===true))return fail(r.data.mensaje||r.data.message||'No se pudo crear la cuenta.');
      L=await apiPost('/api/auth/loguearse',{email:em,password:pw});
      if(L.net)return await down();
      if(!(L.ok&&L.data.status===true)){lgMode('in');$('lgEmail').value=em;$('lgPw').value='';er.className='lg-err info';er.textContent='Cuenta creada. Ahora inicia sesión.';return}
    }
    const D=L.data.Datos||{};
    const res=await loginOK(em,D.name||(lgIn?em:name),D.token);
    if(!res.ok)return fail(res.msg);
  }catch(x){fail(typeof THREE==='undefined'?'No se pudo cargar la librería 3D del juego (three.js). Revisa tu conexión a internet o desactiva el bloqueador de anuncios.':'Error inesperado: '+(x&&x.message||x))}
  finally{go.disabled=false;go.textContent=lgIn?'Entrar':'Crear cuenta';void label}
}
function logout(){
  clearSession();hide();showLogin();
}

