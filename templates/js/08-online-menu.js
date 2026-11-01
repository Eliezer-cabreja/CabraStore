/* Chicken Runner - menú online.
 * La imagen del modo la entrega el servidor mediante Socket.IO:
 * socket.emit('imagen_modo_online', { url: '/ruta/imagen.png' })
 * o socket.emit('imagen_modo_online', { image: 'data:image/png;base64,...' }).
 */
(function () {
  'use strict';

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
    let imageSocket = null;

    function getSocket() {
      return window.socket || window.sk || window.socketClient || null;
    }

    function applyModeImage(payload) {
      let imageSource = '';
      if (typeof payload === 'string') imageSource = payload;
      else if (payload && typeof payload === 'object') {
        imageSource = payload.url || payload.src || payload.image || payload.data || '';
      }
      if (!modeImage || typeof imageSource !== 'string' || !imageSource.trim()) return;

      // El servidor puede enviar una URL o una imagen codificada como data URL.
      modeImage.onload = function () {
        modeImage.hidden = false;
      };
      modeImage.onerror = function () {
        modeImage.hidden = true;
      };
      modeImage.src = imageSource.trim();
    }

    function listenForModeImage() {
      const socket = getSocket();
      if (!socket || typeof socket.on !== 'function' || socket === imageSocket) return;
      imageSocket = socket;
      socket.on('imagen_modo_online', applyModeImage);
      // Pide la imagen al servidor al abrir el menú.
      if (typeof socket.emit === 'function') socket.emit('solicitar_imagen_modo', '1vs1');
    }

    function openOnline() {
      screen.classList.add('on');
      screen.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      listenForModeImage();
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
      if (socket && typeof socket.emit === 'function') socket.emit('cancelar_busqueda');
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
      if (event.key === 'Escape' && screen.classList.contains('on')) closeOnline();
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
