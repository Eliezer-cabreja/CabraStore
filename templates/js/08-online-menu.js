/* Chicken Runner - Online Arena UI
 * Interfaz independiente. La conexión real del matchmaking se conecta después.
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

    if (!entry || !screen || !close || !play || !cancel || !status) return;

    let searching = false;

    function openOnline() {
      screen.classList.add('on');
      screen.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      close.focus();
    }

    function closeOnline() {
      if (searching) stopSearch();
      screen.classList.remove('on');
      screen.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      entry.focus();
    }

    function getSocket() {
      // Se admiten nombres globales comunes si el cliente Socket.IO ya los expone.
      return window.socket || window.sk || window.socketClient || null;
    }

    function startSearch() {
      if (searching) return;
      searching = true;
      play.disabled = true;
      play.textContent = 'BUSCANDO RIVAL...';
      cancel.hidden = false;
      status.textContent = 'Buscando un jugador disponible...';

      const socket = getSocket();
      if (socket && typeof socket.emit === 'function') {
        socket.emit('buscar_partida');
        status.textContent = 'Solicitud enviada. Esperando rival...';
      } else {
        status.textContent = 'Interfaz lista. Falta conectar el evento Socket.IO del emparejamiento.';
        play.disabled = false;
        play.textContent = 'INTENTAR DE NUEVO';
        searching = false;
        cancel.hidden = true;
      }

      // Permite conectar el matchmaking si el socket existente está encapsulado
      // en otro módulo, sin modificar los módulos actuales.
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
      play.textContent = 'BUSCAR RIVAL';
      cancel.hidden = true;
      status.textContent = 'Búsqueda cancelada. ¿Quieres intentarlo otra vez?';
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

    // Preparado para que el módulo de Socket.IO avise cuando encuentre un rival.
    document.addEventListener('chicken:online-found', function () {
      searching = false;
      play.disabled = false;
      play.textContent = 'RIVAL ENCONTRADO';
      cancel.hidden = true;
      status.textContent = '¡Rival encontrado! Preparando la partida...';
    });

    document.addEventListener('chicken:online-error', function (event) {
      searching = false;
      play.disabled = false;
      play.textContent = 'INTENTAR DE NUEVO';
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
