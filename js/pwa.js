(function () {
  'use strict';
  const installButton = document.getElementById('install-button');
  let deferredPrompt = null;

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then((registration) => console.info('PWA lista. Service Worker activo:', registration.scope))
        .catch((error) => console.warn('No se pudo registrar el Service Worker:', error));
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installButton) installButton.classList.remove('d-none');
  });

  if (installButton) {
    installButton.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        installButton.classList.add('d-none');
      } else {
        alert('Para instalar: abre el menú del navegador y elige “Instalar aplicación” o “Añadir a pantalla de inicio”.');
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    if (installButton) installButton.classList.add('d-none');
    deferredPrompt = null;
    console.info('Gestión Comercial se instaló correctamente.');
  });
})();
