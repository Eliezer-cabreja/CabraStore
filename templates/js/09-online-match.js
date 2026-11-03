/* Chicken Runner - Partida online 1v1 (v2.6) */
(function () {
  'use strict';

  const ON = {
    active: false,
    rivalDist: 0,
    rivalBiome: 0,
    rivalName: 'RIVAL',
    rivalId: '',
    rival: {
      px: -2.2, py: 0, lane: 0,
      dist: 0, bioma: 0,
      saltando: false, aturdido: false
    },
    room: null,
    myDist: 0,
    myBiome: 0,
    stunTime: 0,
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

  const DEPTH_PER_METER = 0.12;
  const MAX_AHEAD_Z = -25;
  const MAX_BEHIND_Z = 12;

  let hudEl = null, panelEl = null, countEl = null, resultEl = null;

  const $id = id => document.getElementById(id);
  const fmt = n => Math.floor(Number(n) || 0) + ' m';
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

  const getSocket = () => window.__chickenSocket || null;

  // Actualiza el nombre del rival en el modelo 3D.
  function updateRivalName(nombre) {
    ON.rivalName = String(nombre || 'RIVAL');

    if (typeof window.crearNombreRival === 'function') {
      window.crearNombreRival(ON.rivalName);
    }
  }

  function getRivalDepth() {
    const difference = ON.myDist - ON.rivalDist;

    return clamp(
      difference * DEPTH_PER_METER,
      MAX_AHEAD_Z,
      MAX_BEHIND_Z
    );
  }

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
    const rivalBiomeName = ON.rivalBiome >= META_BIOME
      ? '🏁 Meta'
      : (BIOME_NAMES[ON.rivalBiome] || '');

    hudEl.innerHTML = `
      <span style="color:#7fd4ff;text-align:left">
        TÚ<br><b style="font-size:20px">${fmt(ON.myDist)}</b>
        <br><small style="color:#8a93ab">${myBiomeName}</small>
      </span>
      <span style="opacity:.6">vs</span>
      <span style="color:#ff9d94;text-align:right">
        ${esc(ON.rivalName)}<br><b style="font-size:20px">${fmt(ON.rivalDist)}</b>
        <br><small style="color:#8a93ab">${rivalBiomeName}</small>
      </span>
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
        width:56px;height:56px;border-radius:14px;
        border:2px solid ${enabled ? '#ffc933' : '#3a4357'};
        background:${enabled ? '#232a3a' : '#1a2030'};
        color:#fff;font-size:24px;display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        cursor:${enabled ? 'pointer' : 'not-allowed'};
        opacity:${enabled ? 1 : .45};
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
    if (!ON.active || typeof window.usePU !== 'function') return;
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
        setTimeout(() => {
          countEl.style.transform = 'scale(1)';
        }, 120);
      } else {
        countEl.textContent = '¡YA!';
        clearInterval(iv);

        setTimeout(() => {
          countEl.style.display = 'none';
          ON.countdownDone = true;
          if (cb) cb();
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
        saltando: (window.py || 0) > 0.01,
        aturdido: ON.stunTime > 0
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
    if (ON.sendTimer) {
      clearInterval(ON.sendTimer);
      ON.sendTimer = null;
    }
  }

  function startMatch(data) {
    buildUI();

    const d = data || {};

    ON.room = d.sala || d.room || d.sala_id || d.id || null;

    const rivalName =
      (d.rival && (d.rival.nombre || d.rival.name)) ||
      d.rival_nombre ||
      'RIVAL';

    updateRivalName(rivalName);

    ON.rivalId = (d.rival && (d.rival.id || d.rival.socket)) || d.rival_id || '';

    ON.active = true;
    ON.finished = false;
    ON.rivalFinished = false;
    ON.result = null;
    ON.rivalDist = 0;
    ON.rivalBiome = 0;
    ON.myDist = 0;
    ON.myBiome = 0;
    ON.stunTime = 0;
    ON.countdownDone = false;

    ON.rival = {
      px: -2.2,
      py: 0,
      lane: 0,
      dist: 0,
      bioma: 0,
      saltando: false,
      aturdido: false
    };

    const onlineScreen = $id('onlineScreen');
    if (onlineScreen) onlineScreen.classList.remove('on');
    document.body.style.overflow = '';

    const pausebtn = $id('pausebtn');
    if (pausebtn) pausebtn.style.display = 'none';

    if (typeof window.reset === 'function') window.reset();

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

    if (typeof window.chickenRival !== 'undefined') {
      window.chickenRival.visible = true;
      window.chickenRival.position.set(-2.2, 0, 0);
      window.chickenRival.rotation.set(0, 0, 0);

      // Asegura que el nombre esté colocado sobre el rival.
      if (typeof window.crearNombreRival === 'function') {
        window.crearNombreRival(ON.rivalName);
      }
    }

    const menu = $id('menu');
    if (menu) menu.classList.add('hide');

    const hud = $id('hud');
    if (hud) hud.classList.remove('hide');

    const corn = $id('corn');
    if (corn) corn.style.display = 'none';

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

    const sk = getSocket();
    if (sk && sk.connected) {
      sk.emit('posicion_partida', {
        px: 0, py: 0, lane: 1,
        dist: 0, bioma: 0,
        saltando: false, aturdido: false
      });
    }

    if (document.activeElement) document.activeElement.blur();
    window.focus();

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
        Esperando al rival…<br>
        <small style="color:#8a93ab">Tu distancia: ${fmt(window.dist)}</small>
      </div>`;
    }
  }

  function showResult(result) {
    ON.result = result;

    const me = Math.floor(window.dist || 0);
    const rv = ON.rivalDist;

    const title = result === 'win' ? '¡GANASTE!' :
                  result === 'lose' ? 'PERDISTE' : 'EMPATE';

    const color = result === 'win' ? '#7bc96f' :
                  result === 'lose' ? '#ff9d94' : '#ffc933';

    resultEl.style.display = 'flex';

    resultEl.innerHTML = `
      <div style="background:#121622;border:2px solid #2f3748;border-radius:18px;padding:26px 24px;color:#fff;font-family:Inter,system-ui;max-width:360px;width:100%;text-align:center;box-shadow:0 18px 55px #0009">
        <h2 style="margin:0 0 6px;font:400 32px 'Lilita One';color:${color}">${title}</h2>
        <p style="margin:0 0 16px;color:#8a93ab;font-size:14px">${esc(ON.rivalName)}</p>
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

    if (typeof window.chickenRival !== 'undefined') {
      window.chickenRival.visible = false;
      window.chickenRival.position.set(-2.2, 0, 0);
    }

    stopSending();

    ON.active = false;
    ON.finished = false;
    ON.countdownDone = false;
    ON.stunTime = 0;

    if (typeof window.home === 'function') window.home();
  }

  function bindSocket(sk) {
    if (!sk || sk.__onlineMatchBound) return;
    sk.__onlineMatchBound = true;

    sk.on('posicion_rival', data => {
      if (!ON.active) return;

      const d = data || {};

      if (typeof d.dist === 'number') {
        ON.rivalDist = d.dist;
        ON.rival.dist = d.dist;
      }

      if (typeof d.bioma === 'number') {
        ON.rivalBiome = d.bioma;
        ON.rival.bioma = d.bioma;
      }

      if (typeof d.px === 'number') ON.rival.px = d.px;
      if (typeof d.py === 'number') ON.rival.py = d.py;
      if (typeof d.lane === 'number') ON.rival.lane = d.lane;
      if (typeof d.saltando === 'boolean') ON.rival.saltando = d.saltando;
      if (typeof d.aturdido === 'boolean') ON.rival.aturdido = d.aturdido;

      renderHud();
    });

    sk.on('rival_termino', data => {
      if (!ON.active) return;

      ON.rivalFinished = true;

      if (data && typeof data.distancia === 'number') {
        ON.rivalDist = data.distancia;
        ON.rival.dist = data.distancia;
      }

      if (data && typeof data.bioma === 'number') {
        ON.rivalBiome = data.bioma;
        ON.rival.bioma = data.bioma;
      }

      renderHud();

      if (ON.finished) {
        const res = (window.bi > ON.rivalBiome) ? 'win' :
                    (window.bi < ON.rivalBiome ? 'lose' :
                    (window.dist > ON.rivalDist ? 'win' :
                    (window.dist < ON.rivalDist ? 'lose' : 'draw')));

        showResult(res);
      }
    });

    sk.on('resultado_partida', data => {
      if (!ON.active && !ON.finished) return;

      const res = data && (data.resultado || data.result);

      if (res === 'ganaste' || res === 'win') showResult('win');
      else if (res === 'perdiste' || res === 'lose') showResult('lose');
      else showResult('draw');
    });

    sk.on('rival_desconectado', () => {
      if (!ON.active) return;

      ON.rivalFinished = true;

      if (typeof window.chickenRival !== 'undefined') {
        window.chickenRival.visible = false;
        window.chickenRival.position.set(-2.2, 0, 0);
      }

      if (!ON.finished) {
        stopSending();
        showResult('win');

        const sk2 = getSocket();

        if (sk2 && sk2.connected) {
          sk2.emit('fin_partida', {
            distancia: Math.floor(window.dist || 0),
            bioma: window.bi || 0,
            motivo: 'rival_desconectado'
          });
        }
      }
    });

    sk.on('partida_iniciada', data => {
      if (!ON.active) return;

      if (data && data.rival) {
        const rivalName = data.rival.nombre || data.rival.name;

        if (rivalName) {
          updateRivalName(rivalName);
        }

        ON.rivalId = data.rival.id || ON.rivalId;
      }

      renderHud();
    });
  }

  document.addEventListener('chicken:online-found', e => {
    const data = e.detail || {};
    const realSk = window.__chickenSocket || null;

    if (realSk) bindSocket(realSk);
    startMatch(data);
  });

  // El renderizado del rival se controla únicamente desde este archivo.
  let rivalRenderStarted = false;
  let rivalAnimTime = 0;
  let rivalLastFrame = 0;

  function renderRivalFrame(now) {
    requestAnimationFrame(renderRivalFrame);

    if (!ON.active) {
      rivalLastFrame = now;
      return;
    }

    const chicken = window.chickenRival;
    const parts = window.rivalParts;

    if (!chicken) return;

    const dt = rivalLastFrame
      ? Math.min((now - rivalLastFrame) / 1000, 0.05)
      : 0;

    rivalLastFrame = now;
    rivalAnimTime += dt;

    const lane = clamp(Number(ON.rival.lane) || 0, 0, 2);
    const targetX = Number.isFinite(Number(ON.rival.px))
      ? Number(ON.rival.px)
      : LANES[lane];

    const targetY = Number.isFinite(Number(ON.rival.py))
      ? Number(ON.rival.py)
      : 0;

    const targetZ = getRivalDepth();
    const stunned = ON.rival.aturdido;

    chicken.position.x += (targetX - chicken.position.x) * Math.min(1, dt * 14);
    chicken.position.y += (targetY - chicken.position.y) * Math.min(1, dt * 14);
    chicken.position.z += (targetZ - chicken.position.z) * Math.min(1, dt * 8);

    chicken.visible = true;

    if (stunned) {
      chicken.rotation.z = Math.sin(rivalAnimTime * 22) * 0.16;

      if (parts) {
        const wobble = Math.sin(rivalAnimTime * 24) * 0.45;

        if (parts.lL) parts.lL.rotation.x = wobble;
        if (parts.lR) parts.lR.rotation.x = -wobble;
        if (parts.wLR) parts.wLR.rotation.z = Math.sin(rivalAnimTime * 18) * 0.35;
        if (parts.wRR) parts.wRR.rotation.z = -Math.sin(rivalAnimTime * 18) * 0.35;
        if (parts.bodyR) parts.bodyR.position.y = 0;
      }
    } else {
      chicken.rotation.z += (0 - chicken.rotation.z) * Math.min(1, dt * 10);

      if (parts) {
        const running = ON.countdownDone && !ON.rivalFinished;
        const phase = rivalAnimTime * (running ? 13 : 5);
        const swing = running ? 0.75 : 0.18;

        if (parts.lL) parts.lL.rotation.x = Math.sin(phase) * swing;
        if (parts.lR) parts.lR.rotation.x = Math.sin(phase + Math.PI) * swing;
        if (parts.wLR) parts.wLR.rotation.z = Math.sin(phase * 0.8) * 0.18;
        if (parts.wRR) parts.wRR.rotation.z = -Math.sin(phase * 0.8) * 0.18;

        if (parts.bodyR) {
          parts.bodyR.position.y = Math.abs(Math.sin(phase)) * (running ? 0.07 : 0.015);
        }
      }
    }
  }

  if (!rivalRenderStarted) {
    rivalRenderStarted = true;
    requestAnimationFrame(renderRivalFrame);
  }

  let wasOver = false;

  function watchGameOver() {
    requestAnimationFrame(watchGameOver);

    if (!ON.active) {
      wasOver = false;
      return;
    }

    if (window.state === 'over' && !wasOver) {
      wasOver = true;
      finishMatch('muerte');
    }

    if (window.state === 'play') wasOver = false;
  }

  requestAnimationFrame(watchGameOver);

  let lastBiome = 0;

  function watchBiome() {
    requestAnimationFrame(watchBiome);

    if (!ON.active) {
      lastBiome = 0;
      return;
    }

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