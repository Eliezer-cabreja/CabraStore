/* Chicken Runner - Partida online 1v1 (v2.1)
 * Cámara igual que en 1 jugador. Tu pollo al centro, rival en el mapa.
 */
(function () {
  'use strict';

  const ON = {
    active: false,
    rivalDist: 0,
    rivalBiome: 0,
    rivalName: 'RIVAL',
    rivalId: '',
    rival: { px: -2.2, py: 0, lane: 0, dist: 0, bioma: 0, saltando: false },
    room: null,
    myDist: 0,
    myBiome: 0,
    finished: false,
    rivalFinished: false,
    result: null,
    sendTimer: null,
    lastSent: 0,
    countdownDone: false
  };
  window.ONLINE_MATCH = ON;

  const META_BIOME = 3;
  const BIOME_NAMES = ['Rural', 'Inframundo', 'Desierto', 'Hielo'];
  const LANES = [-2.2, 0, 2.2];

  let hudEl = null, panelEl = null, countEl = null, resultEl = null;
  const $id = (id) => document.getElementById(id);
  const fmt = (n) => Math.floor(n) + ' m';
  const getSocket = () => window.__chickenSocket || null;

  function buildUI() {
    if (hudEl) return;

    hudEl = document.createElement('div');
    hudEl.id = 'onlineHud';
    hudEl.style.cssText = `
      position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);
      left:50%;transform:translateX(-50%);
      display:none;gap:14px;align-items:center;
      background:#121622e6;border:2px solid #ffc933;border-radius:14px;
      padding:8px 16px;color:#fff;font:700 15px Inter,system-ui,sans-serif;
      z-index:40;pointer-events:none;box-shadow:0 6px 20px #000a;
    `;
    document.body.appendChild(hudEl);

    panelEl = document.createElement('div');
    panelEl.id = 'onlinePowerPanel';
    panelEl.style.cssText = `
      position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);
      transform:translateX(-50%);
      display:none;gap:10px;z-index:45;
      background:#121622e6;border:2px solid #2f3748;border-radius:16px;
      padding:8px 10px;box-shadow:0 8px 24px #000a;
    `;
    document.body.appendChild(panelEl);

    countEl = document.createElement('div');
    countEl.id = 'onlineCount';
    countEl.style.cssText = `
      position:fixed;inset:0;display:none;align-items:center;justify-content:center;
      font:400 clamp(80px,22vw,200px) "Lilita One",sans-serif;color:#ffd21f;
      -webkit-text-stroke:6px #7a1f0e;paint-order:stroke fill;
      text-shadow:0 8px 0 #c8341c,0 16px 30px #000a;z-index:60;pointer-events:none;
    `;
    document.body.appendChild(countEl);

    resultEl = document.createElement('div');
    resultEl.id = 'onlineResult';
    resultEl.style.cssText = `
      position:fixed;inset:0;display:none;align-items:center;justify-content:center;
      background:#0008;z-index:70;padding:20px;
    `;
    document.body.appendChild(resultEl);
  }

  function renderHud() {
    if (!hudEl) return;
    const myBiomeName = BIOME_NAMES[ON.myBiome] || '';
    const rivalBiomeName = ON.rivalBiome >= META_BIOME ? '🏁 Meta' : (BIOME_NAMES[ON.rivalBiome] || '');
    hudEl.innerHTML = `
      <span style="color:#7fd4ff;text-align:left">TÚ<br><b style="font-size:20px">${fmt(ON.myDist)}</b><br><small style="color:#8a93ab">${myBiomeName}</small></span>
      <span style="opacity:.6">vs</span>
      <span style="color:#ff9d94;text-align:right">${ON.rivalName}<br><b style="font-size:20px">${fmt(ON.rivalDist)}</b><br><small style="color:#8a93ab">${rivalBiomeName}</small></span>
    `;
  }

  function renderPanel() {
    if (!panelEl) return;
    const keys = ['patines', 'carrito', 'patineta'];
    const labels = { patines: '🛼', carrito: '🛒', patineta: '🛹' };
    let html = '';
    for (const k of keys) {
      const n = (window.P && window.P.inv && window.P.inv[k]) || 0;
      const pu = window.pu || { k: null };
      const enabled = n > 0 && !pu.k;
      html += `<button data-pu="${k}" ${enabled ? '' : 'disabled'} style="
        width:56px;height:56px;border-radius:14px;border:2px solid ${enabled ? '#ffc933' : '#3a4357'};
        background:${enabled ? '#232a3a' : '#1a2030'};color:#fff;font-size:24px;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        cursor:${enabled ? 'pointer' : 'not-allowed'};opacity:${enabled ? 1 : .45};
      ">
        <span>${labels[k]}</span>
        <small style="font:700 11px Inter;color:#ffc933">×${n}</small>
      </button>`;
    }
    panelEl.innerHTML = html;
    panelEl.querySelectorAll('button[data-pu]').forEach(btn => {
      btn.addEventListener('click', () => usePowerOnline(btn.dataset.pu));
    });
  }

  async function usePowerOnline(k) {
    if (!ON.active) return;
    if (typeof window.usePU !== 'function') return;
    await window.usePU(k);
    renderPanel();
  }

  function startCountdown(cb) {
    let n = 3;
    countEl.style.display = 'flex';
    countEl.textContent = n;
    const iv = setInterval(() => {
      n--;
      if (n > 0) {
        countEl.textContent = n;
        countEl.style.transform = 'scale(1.15)';
        setTimeout(() => { countEl.style.transform = 'scale(1)'; }, 120);
      } else {
        countEl.textContent = '¡YA!';
        clearInterval(iv);
        setTimeout(() => {
          countEl.style.display = 'none';
          ON.countdownDone = true;
          cb && cb();
        }, 500);
      }
    }, 800);
  }

  function startSending() {
    stopSending();
    ON.sendTimer = setInterval(() => {
      if (!ON.active) return;
      const sk = getSocket();
      if (!sk || !sk.connected) return;
      const data = {
        px: window.px || 0,
        py: window.py || 0,
        lane: window.laneIdx || 1,
        dist: Math.floor(window.dist || 0),
        bioma: window.bi || 0,
        saltando: (window.py || 0) > 0.01
      };
      ON.myDist = data.dist;
      ON.myBiome = data.bioma;
      renderHud();
      if (Date.now() - ON.lastSent > 100) {
        ON.lastSent = Date.now();
        sk.emit('posicion_partida', data);
      }
    }, 100);
  }

  function stopSending() {
    if (ON.sendTimer) { clearInterval(ON.sendTimer); ON.sendTimer = null; }
  }

  function startMatch(data) {
    buildUI();
    const d = data || {};
    ON.room = d.sala || d.room || d.sala_id || d.id || null;
    ON.rivalName = (d.rival && (d.rival.nombre || d.rival.name)) || d.rival_nombre || 'RIVAL';
    ON.rivalId = (d.rival && (d.rival.id || d.rival.socket)) || d.rival_id || '';

    ON.active = true;
    ON.finished = false;
    ON.rivalFinished = false;
    ON.result = null;
    ON.rivalDist = 0;
    ON.rivalBiome = 0;
    ON.myDist = 0;
    ON.myBiome = 0;
    ON.countdownDone = false;
    
    // Rival empieza en el carril izquierdo
    ON.rival = { px: -2.2, py: 0, lane: 0, dist: 0, bioma: 0, saltando: false };

    const onlineScreen = $id('onlineScreen');
    if (onlineScreen) onlineScreen.classList.remove('on');
    document.body.style.overflow = '';

    const pausebtn = $id('pausebtn');
    if (pausebtn) pausebtn.style.display = 'none';

    if (typeof window.reset === 'function') window.reset();

    // Tu pollo empieza en el CENTRO (igual que 1 jugador)
    window.px = 0;
    window.py = 0;
    window.vy = 0;
    window.laneIdx = 1;
    if (typeof window.chicken !== 'undefined') {
      window.chicken.visible = true;
      window.chicken.position.set(0, 0, 0);
      window.chicken.rotation.set(0, 0, 0);
    }
    if (typeof window.body !== 'undefined') {
      window.body.position.y = 0;
      window.body.rotation.set(0, 0, 0);
      window.body.scale.set(1, 1, 1);
    }

    // El rival empieza a la izquierda
    if (typeof window.chickenRival !== 'undefined') {
      window.chickenRival.visible = true;
      window.chickenRival.position.set(-2.2, 0, 0);
      window.chickenRival.rotation.set(0, 0, 0);
    }

    const menu = $id('menu');
    if (menu) menu.classList.add('hide');
    const hud = $id('hud');
    if (hud) hud.classList.remove('hide');
    const corn = $id('corn');
    if (corn) corn.style.display = 'none';

    // Empezar en 'play' con speed=0 hasta que acabe la cuenta atrás
    window.state = 'play';
    window.dist = 0;
    window.runCubes = 0;
    window.speed = 0;
    window.bi = 0;
    if (typeof window.tint === 'function') window.tint(1);

    hudEl.style.display = 'flex';
    renderHud();
    renderPanel();
    panelEl.style.display = 'flex';

    // Enviar posición inicial al servidor
    const sk = getSocket();
    if (sk && sk.connected) sk.emit('posicion_partida', { px: 0, py: 0, lane: 1, dist: 0, bioma: 0, saltando: false });

    startCountdown(() => {
      window.speed = 13;
      startSending();
    });
  }

  function finishMatch(reason) {
    if (!ON.active || ON.finished) return;
    ON.finished = true;
    stopSending();
    const sk = getSocket();
    if (sk && sk.connected) {
      sk.emit('fin_partida', {
        distancia: Math.floor(window.dist || 0),
        bioma: window.bi || 0,
        motivo: reason || 'muerte'
      });
    }
    if (ON.rivalFinished) {
      const res = (window.bi > ON.rivalBiome) ? 'win' :
                  (window.bi < ON.rivalBiome ? 'lose' :
                  (window.dist > ON.rivalDist ? 'win' :
                  (window.dist < ON.rivalDist ? 'lose' : 'draw')));
      showResult(res);
    } else {
      resultEl.style.display = 'flex';
      resultEl.innerHTML = `<div style="background:#121622;border:2px solid #2f3748;border-radius:16px;padding:24px 28px;color:#fff;font:600 16px Inter;text-align:center">
        Esperando al rival…<br><small style="color:#8a93ab">Tu distancia: ${fmt(window.dist)}</small>
      </div>`;
    }
  }

  function showResult(result) {
    ON.result = result;
    const me = Math.floor(window.dist || 0);
    const rv = ON.rivalDist;
    const title = result === 'win' ? '¡GANASTE!' : result === 'lose' ? 'PERDISTE' : 'EMPATE';
    const color = result === 'win' ? '#7bc96f' : result === 'lose' ? '#ff9d94' : '#ffc933';
    resultEl.style.display = 'flex';
    resultEl.innerHTML = `
      <div style="background:#121622;border:2px solid #2f3748;border-radius:18px;padding:26px 24px;color:#fff;font-family:Inter,system-ui;max-width:360px;width:100%;text-align:center;box-shadow:0 18px 55px #0009">
        <h2 style="margin:0 0 6px;font:400 32px 'Lilita One';color:${color}">${title}</h2>
        <p style="margin:0 0 16px;color:#8a93ab;font-size:14px">${ON.rivalName}</p>
        <div style="display:flex;gap:12px;margin-bottom:18px">
          <div style="flex:1;background:#1a2030;border:1px solid #2b3347;border-radius:10px;padding:10px">
            <div style="font-size:12px;color:#8a93ab">TÚ</div>
            <div style="font-size:22px;font-weight:700;color:#7fd4ff">${fmt(me)}</div>
          </div>
          <div style="flex:1;background:#1a2030;border:1px solid #2b3347;border-radius:10px;padding:10px">
            <div style="font-size:12px;color:#8a93ab">RIVAL</div>
            <div style="font-size:22px;font-weight:700;color:#ff9d94">${fmt(rv)}</div>
          </div>
        </div>
        <button id="onlineBackBtn" style="width:100%;padding:12px;border:0;border-radius:10px;background:#ffc933;color:#3a2a00;font:700 15px Inter;cursor:pointer">Volver al menú</button>
      </div>
    `;
    $id('onlineBackBtn').addEventListener('click', backToMenu);
    ON.active = false;
  }

  function backToMenu() {
    if (hudEl) hudEl.style.display = 'none';
    if (panelEl) panelEl.style.display = 'none';
    if (countEl) countEl.style.display = 'none';
    if (resultEl) resultEl.style.display = 'none';
    const pausebtn = $id('pausebtn');
    if (pausebtn) pausebtn.style.display = '';
    const corn = $id('corn');
    if (corn) corn.style.display = '';
    if (typeof window.chickenRival !== 'undefined') window.chickenRival.visible = false;
    stopSending();
    ON.active = false;
    ON.finished = false;
    ON.countdownDone = false;
    if (typeof window.home === 'function') window.home();
  }

  function bindSocket(sk) {
    if (!sk || sk.__onlineMatchBound) return;
    sk.__onlineMatchBound = true;

    sk.on('posicion_rival', (data) => {
      if (!ON.active) return;
      const d = data || {};
      if (typeof d.dist === 'number') ON.rivalDist = d.dist;
      if (typeof d.bioma === 'number') ON.rivalBiome = d.bioma;
      if (typeof d.px === 'number') ON.rival.px = d.px;
      if (typeof d.py === 'number') ON.rival.py = d.py;
      if (typeof d.lane === 'number') ON.rival.lane = d.lane;
      if (typeof d.saltando === 'boolean') ON.rival.saltando = d.saltando;
      renderHud();
    });

    sk.on('rival_termino', (data) => {
      if (!ON.active) return;
      ON.rivalFinished = true;
      if (data && typeof data.distancia === 'number') ON.rivalDist = data.distancia;
      if (data && typeof data.bioma === 'number') ON.rivalBiome = data.bioma;
      renderHud();
      if (ON.finished) {
        const res = (window.bi > ON.rivalBiome) ? 'win' :
                    (window.bi < ON.rivalBiome ? 'lose' :
                    (window.dist > ON.rivalDist ? 'win' :
                    (window.dist < ON.rivalDist ? 'lose' : 'draw')));
        showResult(res);
      }
    });

    sk.on('resultado_partida', (data) => {
      if (!ON.active && !ON.finished) return;
      const res = data && (data.resultado || data.result);
      if (res === 'ganaste' || res === 'win') showResult('win');
      else if (res === 'perdiste' || res === 'lose') showResult('lose');
      else showResult('draw');
    });

    sk.on('rival_desconectado', () => {
      if (!ON.active) return;
      ON.rivalFinished = true;
      if (typeof window.chickenRival !== 'undefined') window.chickenRival.visible = false;
      if (!ON.finished) {
        stopSending();
        showResult('win');
        const sk2 = getSocket();
        if (sk2 && sk2.connected) sk2.emit('fin_partida', { distancia: Math.floor(window.dist || 0), bioma: window.bi || 0, motivo: 'rival_desconectado' });
      }
    });

    sk.on('partida_iniciada', (data) => {
      if (!ON.active) return;
      if (data && data.rival) {
        ON.rivalName = data.rival.nombre || ON.rivalName;
        ON.rivalId = data.rival.id || ON.rivalId;
      }
      renderHud();
    });
  }

  document.addEventListener('chicken:online-found', (e) => {
    const data = e.detail || {};
    const realSk = window.__chickenSocket || null;
    if (realSk) bindSocket(realSk);
    startMatch(data);
  });

  let wasOver = false;
  function watchGameOver() {
    requestAnimationFrame(watchGameOver);
    if (!ON.active) { wasOver = false; return; }
    if (window.state === 'over' && !wasOver) { wasOver = true; finishMatch('muerte'); }
    if (window.state === 'play') wasOver = false;
  }
  requestAnimationFrame(watchGameOver);

  let lastBiome = 0;
  function watchBiome() {
    requestAnimationFrame(watchBiome);
    if (!ON.active) { lastBiome = 0; return; }
    const b = window.bi || 0;
    if (b !== lastBiome) {
      lastBiome = b;
      if (b >= META_BIOME) finishMatch('meta');
    }
  }
  requestAnimationFrame(watchBiome);

  window.ONLINE_MATCH = ON;
  window.onlineBindSocket = bindSocket;
})();