/* Chicken Runner - Partida online 1v1
 * - Conecta a los 2 jugadores cuando llega "partida_encontrada".
 * - Cada bioma cuenta como meta: gana quien pase el último bioma primero.
 * - En online NO aparecen cubos.
 * - Panel inferior de potenciadores (sin tecla Espacio).
 * - Sincroniza distancias por Socket.IO.
 */
(function () {
  'use strict';

  const ON = {
    active: false,
    countdown: 0,
    rivalDist: 0,
    rivalBiome: 0,
    rivalName: 'RIVAL',
    rivalId: '',
    room: null,
    myDist: 0,
    myCubes: 0,
    myBiome: 0,
    finished: false,
    rivalFinished: false,
    result: null,
    sendTimer: null,
    lastSent: 0
  };
  window.ONLINE_MATCH = ON;

  const META_BIOME = 3; // índice del último bioma (0=rural,1=inframundo,2=desierto,3=hielo)
  const BIOME_DIST = [0, 350, 850, 1450]; // distancias donde empieza cada bioma (igual que BIOMES[].d)

  let hudEl = null, panelEl = null, countEl = null, resultEl = null;

  const $id = (id) => document.getElementById(id);
  const fmt = (n) => Math.floor(n) + ' m';

  function getSocket() {
    return window.__chickenSocket || null;
  }

  // ---------- UI ----------
  function buildUI() {
    if (hudEl) return;

    hudEl = document.createElement('div');
    hudEl.id = 'onlineHud';
    hudEl.style.cssText = `
      position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);
      left:50%;transform:translateX(-50%);
      display:flex;gap:14px;align-items:center;
      background:#121622e6;border:2px solid #ffc933;border-radius:14px;
      padding:8px 16px;color:#fff;font:700 15px Inter,system-ui,sans-serif;
      z-index:40;pointer-events:none;box-shadow:0 6px 20px #000a;
      display:none;
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
    const biomes = ['Rural', 'Inframundo', 'Desierto', 'Hielo'];
    const metaRival = ON.rivalBiome >= META_BIOME ? '🏁' : biomes[ON.rivalBiome] || '';
    hudEl.innerHTML = `
      <span style="color:#7fd4ff">TÚ<br><b style="font-size:20px">${fmt(ON.myDist)}</b><br><small style="color:#8a93ab">${biomes[ON.myBiome]}</small></span>
      <span style="opacity:.6">vs</span>
      <span style="color:#ff9d94;text-align:right">${ON.rivalName}<br><b style="font-size:20px">${fmt(ON.rivalDist)}</b><br><small style="color:#8a93ab">${metaRival}</small></span>
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
      const d = Math.floor(window.dist || 0);
      const b = window.bi || 0;
      if (d !== ON.myDist || b !== ON.myBiome || Date.now() - ON.lastSent > 400) {
        ON.myDist = d;
        ON.myBiome = b;
        ON.lastSent = Date.now();
        sk.emit('posicion_partida', { distancia: d, bioma: b });
      }
    }, 120);
  }

  function stopSending() {
    if (ON.sendTimer) { clearInterval(ON.sendTimer); ON.sendTimer = null; }
  }

  // ---------- Iniciar partida ----------
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

    const onlineScreen = $id('onlineScreen');
    if (onlineScreen) onlineScreen.classList.remove('on');
    document.body.style.overflow = '';

    if (typeof window.reset === 'function') window.reset();
    const menu = $id('menu');
    if (menu) menu.classList.add('hide');
    const hud = $id('hud');
    if (hud) hud.classList.remove('hide');

    // En online no queremos la intro: empezamos en pausa + cuenta atrás
    window.state = 'pause';
    window.dist = 0;
    window.runCubes = 0;
    window.speed = 0;
    window.bi = 0;
    if (typeof window.tint === 'function') window.tint(1);

    // Ocultar contador de cubos en online
    const corn = $id('corn');
    if (corn) corn.style.display = 'none';

    hudEl.style.display = 'flex';
    renderHud();
    renderPanel();
    panelEl.style.display = 'flex';

    startCountdown(() => {
      window.state = 'play';
      window.speed = 13;
      startSending();
    });
  }

  // ---------- Fin de partida ----------
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
    stopSending();
    ON.active = false;
    ON.finished = false;
    const corn = $id('corn');
    if (corn) corn.style.display = '';
    if (typeof window.home === 'function') window.home();
  }

  // ---------- Socket ----------
  function bindSocket(sk) {
    if (!sk || sk.__onlineMatchBound) return;
    sk.__onlineMatchBound = true;

    sk.on('posicion_rival', (data) => {
      if (!ON.active) return;
      const d = data && (data.distancia ?? data.dist ?? data.distance);
      if (typeof d === 'number') { ON.rivalDist = d; }
      const b = data && (data.bioma ?? data.biome);
      if (typeof b === 'number') { ON.rivalBiome = b; }
      renderHud();
    });

    sk.on('rival_termino', (data) => {
      if (!ON.active) return;
      ON.rivalFinished = true;
      const d = data && (data.distancia ?? data.dist);
      if (typeof d === 'number') ON.rivalDist = d;
      const b = data && (data.bioma ?? data.biome);
      if (typeof b === 'number') ON.rivalBiome = b;
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
      ON.rivalDist = 0;
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

  // ---------- Enganche con el flujo del juego ----------
  document.addEventListener('chicken:online-found', (e) => {
    const data = e.detail || {};
    const realSk = window.__chickenSocket || null;
    if (realSk) bindSocket(realSk);
    startMatch(data);
  });

  // Cuando el jugador muere (state pasa a 'over') y estamos online, avisamos
  let wasOver = false;
  function watchGameOver() {
    requestAnimationFrame(watchGameOver);
    if (!ON.active) { wasOver = false; return; }
    if (window.state === 'over' && !wasOver) {
      wasOver = true;
      finishMatch('muerte');
    }
    if (window.state === 'play') wasOver = false;
  }
  requestAnimationFrame(watchGameOver);

  // Cuando el jugador pasa el ÚLTIMO bioma, gana automáticamente
  let lastBiome = 0;
  function watchBiome() {
    requestAnimationFrame(watchBiome);
    if (!ON.active) { lastBiome = 0; return; }
    const b = window.bi || 0;
    if (b !== lastBiome) {
      lastBiome = b;
      if (b >= META_BIOME) {
        // Pasó el último bioma → gana
        finishMatch('meta');
      }
    }
  }
  requestAnimationFrame(watchBiome);

  window.ONLINE_MATCH = ON;
  window.onlineBindSocket = bindSocket;
})();