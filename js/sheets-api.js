/* Cliente Google Apps Script: lectura JSONP y escritura POST en modo no-cors. */
(function () {
  'use strict';
  const KEY = 'gestionComercial.sheetsEndpoint.v1';

  function getEndpoint() {
    try { return localStorage.getItem(KEY) || ''; }
    catch (_) { return ''; }
  }

  function setEndpoint(value) {
    const url = String(value || '').trim();
    if (!url) {
      try { localStorage.removeItem(KEY); } catch (_) {}
      return '';
    }
    let parsed;
    try { parsed = new URL(url); }
    catch (_) { throw new Error('La URL no es válida. Pega la dirección completa de Apps Script.'); }
    if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('google.com') || !parsed.pathname.includes('/macros/s/') || !parsed.pathname.endsWith('/exec')) {
      throw new Error('Usa la URL HTTPS de la aplicación web de Apps Script que termina en /exec.');
    }
    try { localStorage.setItem(KEY, url); }
    catch (_) { throw new Error('El navegador no permitió guardar la URL.'); }
    return url;
  }

  function readSnapshot() {
    const endpoint = getEndpoint();
    if (!endpoint) return Promise.reject(new Error('No se ha configurado la conexión con Google Sheets.'));
    return new Promise((resolve, reject) => {
      const callbackName = '__gs_cb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      const script = document.createElement('script');
      const separator = endpoint.includes('?') ? '&' : '?';
      let finished = false;
      const timeout = window.setTimeout(() => finish(new Error('Tiempo de espera agotado al leer Google Sheets.')), 15000);

      function finish(error, data) {
        if (finished) return;
        finished = true;
        window.clearTimeout(timeout);
        try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
        script.onerror = null;
        if (script.parentNode) script.parentNode.removeChild(script);
        if (error) reject(error);
        else if (!data || data.ok !== true) reject(new Error((data && data.message) || 'Google Sheets devolvió una respuesta no válida.'));
        else resolve({ products: Array.isArray(data.products) ? data.products : [], movements: Array.isArray(data.movements) ? data.movements : [] });
      }

      window[callbackName] = (data) => finish(null, data);
      script.onerror = () => finish(new Error('No se pudo acceder a Apps Script. Revisa la URL y los permisos del despliegue.'));
      script.src = endpoint + separator + 'action=bootstrap&callback=' + encodeURIComponent(callbackName) + '&_=' + Date.now();
      document.head.appendChild(script);
    });
  }

  async function write(payload) {
    const endpoint = getEndpoint();
    if (!endpoint) return { sent: false, reason: 'not-configured' };
    try {
      // no-cors solo permite una confirmación opaca del envío. La app verifica
      // después consultando la hoja con readSnapshot().
      await fetch(endpoint, {
        method: 'POST',
        mode: 'no-cors',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      return { sent: true };
    } catch (error) {
      console.warn('Error al enviar la operación a Google Sheets.', error);
      return { sent: false, reason: 'network-error' };
    }
  }

  window.SheetsAPI = { getEndpoint, setEndpoint, readSnapshot, write };
})();
