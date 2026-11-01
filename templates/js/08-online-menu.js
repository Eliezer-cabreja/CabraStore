/* Chicken Runner - menú online (v1.6)
 * - transports polling primero (evita error WebSocket si el server no lo tiene)
 * - expone window.__chickenSocket y llama a window.onlineBindSocket
 */
(function () {
  'use strict';

  const API_BASE = 'https://api-chicken-runner.monitorealo.online';
  const IMAGE_API = `${API_BASE}/api/online/modos/1vs1/imagen`;
  const SOCKET_URL = 'https://api-chicken-runner.monitorealo.online';
  const SOCKET_CLIENT_URL = 'https://cdn.socket.io/4.7.5/socket.io.min.js';

  let socket = null;
  let socketPromise = null;

  function conectarSocket() {
    if (socket && socket.connected) return Promise.resolve(socket);
    if (socketPromise) return socketPromise;

    socketPromise = new Promise((resolve, reject) => {

      function iniciarConexion() {
        if (typeof window.io !== 'function') {
          reject(new Error('Socket.IO no está disponible.'));
          socketPromise = null;
          return;
        }

        if (!socket) {
          socket = window.io(SOCKET_URL, {
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 20000,
            auth: { token: (typeof TOKEN !== 'undefined' ? TOKEN : '') }
          });
        }

        window.__chickenSocket = socket;
        if (typeof window.onlineBindSocket === 'function') {
          window.onlineBindSocket(socket);
        }

        if (socket.connected) {
          resolve(socket);
          return;
        }

        socket.once('connect', () => {
          console.log('Socket.IO conectado:', socket.id);
          window.__chickenSocket = socket;
          if (typeof window.onlineBindSocket === 'function') {
            window.onlineBindSocket(socket);
          }
          resolve(socket);
        });

        socket.once('connect_error', (error) => {
          console.error('Error Socket.IO:', error);
          reject(error);
        });
      }

      if (typeof window.io === 'function') {
        iniciarConexion();
        return;
      }

      let script = document.querySelector(`script[src="${SOCKET_CLIENT_URL}"]`);
      if (script) {
        script.addEventListener('load', iniciarConexion, { once: true });
        script.addEventListener('error', () => {
          socketPromise = null;
          reject(new Error('No se pudo cargar Socket.IO.'));
        }, { once: true });
        return;
      }

      script = document.createElement('script');
      script.src = SOCKET_CLIENT_URL;
      script.async = true;
      script.onload = iniciarConexion;
      script.onerror = () => {
        socketPromise = null;
        reject(new Error('No se pudo cargar Socket.IO.'));
      };
      document.head.appendChild(script);
    });

    return socketPromise;
  }

  function initOnlineMenu() {
    const entry = document.getElementById('onlineEntry');
    const screen = document.getElementById('onlineScreen');
    const close = document.getElementById('onlineClose');
    const play = document.getElementById('onlinePlay');
    const cancel = document.getElementById('onlineCancel');
    const status = document.getElementById('onlineStatus');
    const modeImage = document.getElementById('onlineModeImage');

    if (!entry || !screen || !close || !play || !cancel || !status) return;

    let searching = false;
    let partidaEncontrada = false;
    let eventosRegistrados = false;

    async function loadModeImage() {
      if (!modeImage) return;
      try {
        const response = await fetch(IMAGE_API, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-cache'
        });
        if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
        const data = await response.json();
        const imageSource = typeof data === 'string' ? data : data && (data.imagen || data.url || data.src);
        if (typeof imageSource !== 'string' || !imageSource.trim()) throw new Error('La API no devolvió una imagen válida.');
        modeImage.onload = () => { modeImage.hidden = false; };
        modeImage.onerror = () => { modeImage.hidden = true; console.error('No se pudo cargar la imagen del modo.'); };
        modeImage.src = new URL(imageSource.trim(), API_BASE).href;
      } catch (error) {
        modeImage.hidden = true;
        console.error('Error al obtener la imagen del modo online:', error);
      }
    }

    function resetSearch() {
      searching = false;
      partidaEncontrada = false;
      play.disabled = false;
      play.textContent = 'JUGAR';
      cancel.hidden = true;
    }

    function getMessage(data, fallback) {
      return data && (data.mensaje || data.message) ? (data.mensaje || data.message) : fallback;
    }

    function registrarEventos(sk) {
      if (eventosRegistrados) return;
      eventosRegistrados = true;

      sk.on('busqueda_iniciada', (data) => {
        if (!searching) return;
        status.textContent = getMessage(data, 'Buscando un jugador disponible...');
      });

      sk.on('partida_encontrada', (data) => {
        searching = false;
        partidaEncontrada = true;
        play.disabled = false;
        play.textContent = 'JUGAR';
        cancel.hidden = true;
        status.textContent = '¡Rival encontrado! Preparando la partida...';
        document.dispatchEvent(new CustomEvent('chicken:online-found', { detail: data }));
        console.log('Partida encontrada:', data);
      });

      sk.on('busqueda_cancelada', (data) => {
        if (partidaEncontrada) return;
        resetSearch();
        status.textContent = getMessage(data, 'Búsqueda cancelada.');
      });

      sk.on('error_busqueda', (data) => {
        resetSearch();
        status.textContent = getMessage(data, 'No se pudo iniciar la búsqueda.');
        document.dispatchEvent(new CustomEvent('chicken:online-error', { detail: data }));
      });

      sk.on('rival_desconectado', (data) => {
        resetSearch();
        status.textContent = getMessage(data, 'Tu rival se desconectó.');
        document.dispatchEvent(new CustomEvent('chicken:online-error', { detail: data }));
      });

      sk.on('disconnect', (reason) => {
        console.warn('Socket.IO desconectado:', reason);
        if (searching) {
          resetSearch();
          status.textContent = 'Se perdió la conexión con el servidor.';
        }
      });

      sk.on('connect_error', (error) => {
        console.error('Error de conexión:', error);
        if (searching) {
          resetSearch();
          status.textContent = 'No se pudo conectar con el servidor.';
        }
      });
    }

    async function prepararSocket() {
      try {
        const sk = await conectarSocket();
        registrarEventos(sk);
        return sk;
      } catch (error) {
        console.error('No se pudo conectar con el servidor:', error);
        status.textContent = 'No se pudo conectar con el servidor.';
        return null;
      }
    }

    function openOnline() {
      screen.classList.add('on');
      screen.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      loadModeImage();
      prepararSocket();
      close.focus();
    }

    function closeOnline() {
      if (searching) stopSearch();
      screen.classList.remove('on');
      screen.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      entry.focus();
    }

    async function startSearch() {
      if (searching || partidaEncontrada) return;
      searching = true;
      play.disabled = true;
      play.textContent = 'CONECTANDO...';
      cancel.hidden = false;
      status.textContent = 'Conectando con el servidor...';
      const sk = await prepararSocket();
      if (!sk) { resetSearch(); return; }
      if (!sk.connected) {
        status.textContent = 'Esperando conexión con el servidor...';
        return;
      }
      play.textContent = 'BUSCANDO RIVAL...';
      status.textContent = 'Buscando un jugador disponible...';
      sk.emit('buscar_partida');
      document.dispatchEvent(new CustomEvent('chicken:online-search'));
    }

    function stopSearch() {
      if (!searching) return;
      const sk = socket;
      searching = false;
      if (sk && sk.connected) sk.emit('cancelar_busqueda');
      play.disabled = false;
      play.textContent = 'JUGAR';
      cancel.hidden = true;
      status.textContent = 'Búsqueda cancelada.';
      document.dispatchEvent(new CustomEvent('chicken:online-cancel-search'));
    }

    entry.addEventListener('click', openOnline);
    close.addEventListener('click', closeOnline);
    play.addEventListener('click', startSearch);
    cancel.addEventListener('click', stopSearch);
    screen.addEventListener('click', (event) => { if (event.target === screen) closeOnline(); });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && screen.classList.contains('on')) closeOnline();
    });

    prepararSocket();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnlineMenu, { once: true });
  } else {
    initOnlineMenu();
  }
})();