/* Chicken Runner - menú online.
 * La imagen del modo se obtiene por HTTP desde la API.
 * La búsqueda de partidas continúa usando Socket.IO.
 */
(function () {
  'use strict';

  const IMAGE_API = 'https://api-chicken-runner.monitorealo.online/api/online/modos/1vs1/imagen';

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

    function getSocket() {
      return window.socket || window.sk || window.socketClient || null;
    }

    async function loadModeImage() {
      if (!modeImage) return;

      try {
        const response = await fetch(IMAGE_API, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-cache'
        });

        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status}`);
        }

        const data = await response.json();
        const imageSource = typeof data === 'string'
          ? data
          : data && (data.imagen || data.url || data.src);

        if (typeof imageSource !== 'string' || !imageSource.trim()) {
          throw new Error('La API no devolvió una URL de imagen válida.');
        }

        modeImage.onload = function () {
          modeImage.hidden = false;
        };

        modeImage.onerror = function () {
          modeImage.hidden = true;
          console.error('No se pudo cargar la imagen del modo online.');
        };

        modeImage.src = imageSource.trim();
      } catch (error) {
        modeImage.hidden = true;
        console.error('Error al obtener la imagen del modo online:', error);
      }
    }

    function openOnline() {
      screen.classList.add('on');
      screen.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      loadModeImage();
      close.focus();
    }

    function closeOnline() {
      if (searching) stopSearch();
      screen.classList.remove('on');
      screen.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      entry.focus();
    }

    function startSearch() {
      if (searching) return;

      const socket = getSocket();
      if (!socket || typeof socket.emit !== 'function') {
        status.textContent = 'No se pudo conectar con el servidor.';
        return;
      }

      searching = true;
      play.disabled = true;
      play.textContent = 'BUSCANDO RIVAL...';
      cancel.hidden = false;
      status.textContent = 'Buscando un jugador disponible...';
      socket.emit('buscar_partida');
      document.dispatchEvent(new CustomEvent('chicken:online-search'));
    }

    function stopSearch() {
      const socket = getSocket();
      if (socket && typeof socket.emit === 'function') {
        socket.emit('cancelar_busqueda');
      }

      document.dispatchEvent(new CustomEvent('chicken:online-cancel-search'));
      searching = false;
      play.disabled = false;
      play.textContent = 'JUGAR';
      cancel.hidden = true;
      status.textContent = 'Búsqueda cancelada.';
    }

    entry.addEventListener('click', openOnline);
    close.addEventListener('click', closeOnline);
    play.addEventListener('click', startSearch);
    cancel.addEventListener('click', stopSearch);

    screen.addEventListener('click', function (event) {
      if (event.target === screen) closeOnline();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && screen.classList.contains('on')) {
        closeOnline();
      }
    });

    document.addEventListener('chicken:online-found', function () {
      searching = false;
      play.disabled = false;
      play.textContent = 'JUGAR';
      cancel.hidden = true;
      status.textContent = '¡Rival encontrado! Preparando la partida...';
    });

    document.addEventListener('chicken:online-error', function (event) {
      searching = false;
      play.disabled = false;
      play.textContent = 'JUGAR';
      cancel.hidden = true;
      status.textContent = event.detail && event.detail.message
        ? event.detail.message
        : 'No se pudo iniciar la búsqueda. Inténtalo otra vez.';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnlineMenu, { once: true });
  } else {
    initOnlineMenu();
  }
})();
