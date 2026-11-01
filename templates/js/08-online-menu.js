
/* Chicken Runner - menú online.
 * La imagen del modo se obtiene por HTTP desde la API.
 * El emparejamiento y las notificaciones utilizan Socket.IO.
 */
(function () {
  'use strict';

  const IMAGE_API =
    'https://api-chicken-runner.monitorealo.online/api/online/modos/1vs1/imagen';

  function initOnlineMenu() {
    const entry = document.getElementById('onlineEntry');
    const screen = document.getElementById('onlineScreen');
    const close = document.getElementById('onlineClose');
    const play = document.getElementById('onlinePlay');
    const cancel = document.getElementById('onlineCancel');
    const status = document.getElementById('onlineStatus');
    const modeImage = document.getElementById('onlineModeImage');

    if (!entry || !screen || !close || !play || !cancel || !status) {
      return;
    }

    let searching = false;
    let partidaEncontrada = false;
    let socketEscuchando = null;

    function getSocket() {
      return window.socket || window.sk || window.socketClient || null;
    }

    function getMessage(data, fallback) {
      return data && (data.mensaje || data.message)
        ? data.mensaje || data.message
        : fallback;
    }

    // -----------------------------------------
    // IMAGEN DEL MODO
    // -----------------------------------------

    async function loadModeImage() {
      if (!modeImage) return;

      try {
        const response = await fetch(IMAGE_API, {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          },
          cache: 'no-cache'
        });

        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status}`);
        }

        const data = await response.json();

        const imageSource = typeof data === 'string'
          ? data
          : data && (data.imagen || data.url || data.src);

        if (
          typeof imageSource !== 'string' ||
          !imageSource.trim()
        ) {
          throw new Error('La API no devolvió una URL de imagen válida.');
        }

        modeImage.onload = function () {
          modeImage.hidden = false;
        };

        modeImage.onerror = function () {
          modeImage.hidden = true;
          console.error('No se pudo cargar la imagen del modo online.');
        };

        // Permite recibir tanto URLs completas como rutas relativas.
        modeImage.src = new URL(imageSource.trim(), IMAGE_API).href;

      } catch (error) {
        modeImage.hidden = true;
        console.error(
          'Error al obtener la imagen del modo online:',
          error
        );
      }
    }

    // -----------------------------------------
    // ESTADO DE LA INTERFAZ
    // -----------------------------------------

    function resetSearch() {
      searching = false;
      partidaEncontrada = false;

      play.disabled = false;
      play.textContent = 'JUGAR';

      cancel.hidden = true;
    }

    function showSearchError(message) {
      resetSearch();
      status.textContent = message;
    }

    // -----------------------------------------
    // EVENTOS SOCKET.IO
    // -----------------------------------------

    function listenSocketEvents() {
      const socket = getSocket();

      if (!socket || typeof socket.on !== 'function') {
        return false;
      }

      // Evita registrar los mismos eventos varias veces.
      if (socketEscuchando === socket) {
        return true;
      }

      socketEscuchando = socket;

      // El servidor confirmó que el jugador entró en la cola.
      socket.on('busqueda_iniciada', function (data) {
        if (!searching) return;

        status.textContent = getMessage(
          data,
          'Buscando un jugador disponible...'
        );
      });

      // El servidor encontró un rival.
      socket.on('partida_encontrada', function (data) {
        searching = false;
        partidaEncontrada = true;

        play.disabled = false;
        play.textContent = 'JUGAR';

        cancel.hidden = true;

        status.textContent = '¡Rival encontrado! Preparando la partida...';

        document.dispatchEvent(
          new CustomEvent('chicken:online-found', {
            detail: data
          })
        );
      });

      // El servidor confirmó la cancelación.
      socket.on('busqueda_cancelada', function (data) {
        if (partidaEncontrada) return;

        resetSearch();

        status.textContent = getMessage(
          data,
          'Búsqueda cancelada.'
        );
      });

      // Error durante la búsqueda.
      socket.on('error_busqueda', function (data) {
        showSearchError(
          getMessage(data, 'No se pudo iniciar la búsqueda.')
        );

        document.dispatchEvent(
          new CustomEvent('chicken:online-error', {
            detail: data
          })
        );
      });

      // El rival abandonó la partida.
      socket.on('rival_desconectado', function (data) {
        resetSearch();

        status.textContent = getMessage(
          data,
          'Tu rival se desconectó.'
        );

        document.dispatchEvent(
          new CustomEvent('chicken:online-error', {
            detail: data
          })
        );
      });

      // Problemas de conexión con Socket.IO.
      socket.on('connect_error', function (error) {
        if (!searching) return;

        status.textContent = 'Error de conexión con el servidor.';
        console.error('Error Socket.IO:', error);
      });

      return true;
    }

    // -----------------------------------------
    // ABRIR Y CERRAR MENÚ
    // -----------------------------------------

    function openOnline() {
      screen.classList.add('on');
      screen.setAttribute('aria-hidden', 'false');

      document.body.style.overflow = 'hidden';

      listenSocketEvents();
      loadModeImage();

      close.focus();
    }

    function closeOnline() {
      if (searching) {
        stopSearch();
      }

      screen.classList.remove('on');
      screen.setAttribute('aria-hidden', 'true');

      document.body.style.overflow = '';

      entry.focus();
    }

    // -----------------------------------------
    // BUSCAR PARTIDA
    // -----------------------------------------

    function startSearch() {
      if (searching || partidaEncontrada) return;

      const socket = getSocket();

      if (!socket || typeof socket.emit !== 'function') {
        status.textContent = 'No se pudo conectar con el servidor.';
        return;
      }

      listenSocketEvents();

      searching = true;

      play.disabled = true;
      play.textContent = 'BUSCANDO RIVAL...';

      cancel.hidden = false;

      status.textContent = 'Conectando con el servidor...';

      socket.emit('buscar_partida');

      document.dispatchEvent(
        new CustomEvent('chicken:online-search')
      );
    }

    // -----------------------------------------
    // CANCELAR BÚSQUEDA
    // -----------------------------------------

    function stopSearch() {
      if (!searching) return;

      const socket = getSocket();

      if (socket && typeof socket.emit === 'function') {
        socket.emit('cancelar_busqueda');
      }

      searching = false;

      play.disabled = false;
      play.textContent = 'JUGAR';

      cancel.hidden = true;

      status.textContent = 'Cancelando búsqueda...';

      document.dispatchEvent(
        new CustomEvent('chicken:online-cancel-search')
      );
    }

    // -----------------------------------------
    // EVENTOS DE LA INTERFAZ
    // -----------------------------------------

    entry.addEventListener('click', openOnline);

    close.addEventListener('click', closeOnline);

    play.addEventListener('click', startSearch);

    cancel.addEventListener('click', stopSearch);

    screen.addEventListener('click', function (event) {
      if (event.target === screen) {
        closeOnline();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (
        event.key === 'Escape' &&
        screen.classList.contains('on')
      ) {
        closeOnline();
      }
    });

    // Permite que otros scripts consulten los datos recibidos.
    document.addEventListener('chicken:online-found', function (event) {
      console.log('Datos de la partida:', event.detail);
    });

    // Si otro script genera un error, también actualizamos el menú.
    document.addEventListener('chicken:online-error', function (event) {
      if (searching) {
        showSearchError(
          getMessage(
            event.detail,
            'No se pudo iniciar la búsqueda.'
          )
        );
      }
    });

    listenSocketEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initOnlineMenu,
      { once: true }
    );
  } else {
    initOnlineMenu();
  }
})();
