# Gestión Comercial PWA

Aplicación móvil de gestión comercial hecha en HTML, CSS y JavaScript. Incluye catálogo e inventario, compras, ventas, reportes, registro local y conexión opcional con Google Sheets a través de Google Apps Script.

## Estructura completa

```text
gestion-comercial-pwa/
├── index.html
├── manifest.json
├── sw.js
├── .nojekyll
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── sheets-api.js
│   └── pwa.js
├── assets/
│   ├── icon.svg
│   ├── icon-192.png
│   └── icon-512.png
├── data/
│   └── ventas-restaurante-sabado-2026-10-24.json
└── google-apps-script/
    └── Code.gs
```

## A. Publicar la web en GitHub Pages

1. Descarga el ZIP del proyecto y descomprímelo en tu computadora.
2. Entra en https://github.com e inicia sesión.
3. Pulsa **+ → New repository**. Ponle, por ejemplo, `gestion-comercial-pwa`.
4. Selecciona **Public** para una cuenta GitHub Free y crea el repositorio. Recuerda que la página publicada será accesible públicamente.
5. Dentro del repositorio, selecciona **Add file → Upload files**.
6. Abre la carpeta descomprimida en tu computadora. Sube los archivos y carpetas que están dentro de `gestion-comercial-pwa`, no el ZIP entero. `index.html` debe quedar en la raíz del repositorio.
7. En la parte inferior, pulsa **Commit changes**.
8. Abre **Settings → Pages**. En **Build and deployment**, selecciona **Deploy from a branch**; como rama, elige `main`; como carpeta, elige `/(root)`; pulsa **Save**.
9. Espera a que GitHub Pages publique el sitio y pulsa **Visit site**. La dirección suele ser `https://TU-USUARIO.github.io/gestion-comercial-pwa/`.
10. Abre esa dirección. Debes ver la pantalla de Gestión Comercial. Usa HTTPS para que el Service Worker y la instalación PWA puedan activarse.

Documentación oficial: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## B. Preparar Google Sheets

1. Entra en https://sheets.new y crea una hoja de cálculo.
2. Ponle un nombre, por ejemplo `Gestion Comercial`.
3. Observa su URL: `https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit#gid=0`. Copia solo el texto que aparece entre `/d/` y `/edit`.
4. Abre https://script.google.com y crea un proyecto nuevo de Apps Script.
5. En el editor, abre el archivo `Code.gs` que aparece por defecto. Borra su contenido.
6. En tu computadora, abre `google-apps-script/Code.gs` del proyecto descargado, copia todo el código y pégalo en el editor de Apps Script.
7. Busca al inicio la línea `const SPREADSHEET_ID = 'PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET';`. Sustituye solo el texto `PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET` por el ID que copiaste de tu hoja. No borres las comillas simples.
8. Pulsa **Guardar** (icono de disquete) y ponle un nombre al proyecto.
9. En la lista de funciones que está en la parte superior, selecciona `setupSheets` y pulsa **Ejecutar**.
10. Google mostrará la pantalla de permisos. Elige tu cuenta, revisa los permisos solicitados y autoriza el acceso a la hoja. Si aparece una advertencia de aplicación no verificada para tu propio script, comprueba que abriste tu proyecto y continúa solo si confías en el código que acabas de pegar.
11. Regresa a la hoja de cálculo. Deben aparecer dos pestañas: `Productos` y `Movimientos`, con sus encabezados.

## C. Cargar el ejemplo del restaurante (opcional)

El ejemplo corresponde al sábado 24 de octubre de 2026, entre las 11:00 y las 20:00. Tiene 44 movimientos demostrativos: los platos y bebidas suman Bs 4.500; la venta de 50 kg de chorizo parrillero a Bs 63/kg suma Bs 3.150; total de demostración Bs 7.650.

1. Vuelve al editor de Apps Script.
2. En la lista de funciones, elige `seedDemoRestaurantData`.
3. Pulsa **Ejecutar** una sola vez.
4. Regresa a Google Sheets y revisa las pestañas `Productos` y `Movimientos`.
5. La función se detendrá si detecta movimientos o productos ya cargados para evitar duplicados. No la ejecutes en una hoja con información real.

Estos son datos ficticios para probar la aplicación, no comprobantes ni ventas verificadas. El inventario inicial también es ilustrativo. Reemplázalos por registros reales antes de usar el sistema como control del negocio.

## D. Publicar el Apps Script como API web

1. En el editor de Apps Script, pulsa **Implementar → Nueva implementación**.
2. En el tipo de implementación, elige **Aplicación web**.
3. Para una prueba de demostración desde una página estática, suele configurarse **Ejecutar como: yo**. La configuración de **Quién tiene acceso** dependerá de la disponibilidad de tu cuenta. Para que GitHub Pages acceda sin pedir iniciar sesión, el endpoint debe permitir ese acceso; si no puedes permitirlo, no lo hagas público y necesitarás añadir una solución de autenticación.
4. **Advertencia crítica:** si configuras acceso para cualquier persona y ejecutas como propietario, cualquiera que consiga la URL podría leer o modificar datos a través de esta API. Utiliza únicamente una hoja vacía/de prueba y datos no sensibles mientras el endpoint esté así configurado. Para ventas reales de un negocio, esta API necesita autenticación y control de permisos antes de hacerse pública.
5. Pulsa **Implementar** y concede los permisos que se soliciten.
6. Copia la **URL de aplicación web** que termina en `/exec`. No copies la dirección de prueba `/dev`.
7. Para comprobar que la API responde, abre la URL terminada en `/exec` en otra pestaña. Debería verse un mensaje parecido a `Gestión Comercial API activa.`. Si sale un error que menciona `SPREADSHEET_ID`, corrige ese valor, guarda y vuelve a implementar.

Documentación oficial: https://developers.google.com/apps-script/guides/web

## E. Conectar GitHub Pages con Google Sheets

1. Abre la dirección de tu página publicada en GitHub Pages.
2. Pulsa el engranaje de **Configuración** que está arriba a la derecha.
3. En `URL de Apps Script (/exec)`, pega la URL de aplicación web que copiaste.
4. Pulsa **Guardar conexión**. La aplicación probará la lectura de productos y movimientos de la hoja.
5. Si el ejemplo ya se cargó en Sheets, el indicador de arriba debería cambiar de `Local` a `Sheets`, y en la página aparecerán los 11 productos y los 44 movimientos.
6. Si la hoja está vacía, puedes ver un aviso de que los datos locales se conservaron. No uses **Importar local** salvo que estés seguro de que la hoja está vacía y realmente deseas cargar esos registros locales.
7. Para comprobarlo, abre la sección **Reportes** y verifica los movimientos. Luego abre la hoja de Google Sheets y comprueba que coinciden.

## F. Probar una operación

1. En la parte superior, deja la vista `Gerente`.
2. Abre **Inventario** y confirma que aparecen los productos.
3. Abre **Ventas** (punto de venta), agrega un producto, selecciona Efectivo o QR como etiqueta del método de pago y pulsa **Confirmar venta**.
4. Espera el mensaje de confirmación. La aplicación envía la operación y luego vuelve a leer la hoja para intentar verificarla.
5. Abre la pestaña `Movimientos` de Google Sheets. El registro debe aparecer y el stock debe disminuir.
6. Prueba una compra desde **Compras** para aumentar el stock.
7. Abre **Reportes → Exportar JSON** para descargar una copia de los registros.

## G. Instalar en un celular

1. Abre el enlace HTTPS de GitHub Pages en Chrome u otro navegador compatible.
2. Cuando aparezca **Instalar**, púlsalo. Si no aparece, abre el menú del navegador y selecciona **Instalar aplicación** o **Añadir a pantalla de inicio**.
3. Abre la app desde el nuevo icono.
4. La interfaz básica puede abrir sin internet después de haberse cargado y almacenado en caché. La sincronización con Google Sheets requiere conexión a internet.

## Problemas frecuentes

- **Pantalla sin estilo o archivos 404:** revisa que subiste todas las carpetas y que `index.html` está en la raíz; respeta los nombres y mayúsculas/minúsculas.
- **El indicador no cambia a Sheets:** confirma que pegaste la URL `/exec`, no `/dev`; abre el `/exec` en una pestaña y confirma que el ID de hoja está correcto.
- **El navegador no puede leer la hoja:** revisa la implementación y el permiso de acceso que tenga Apps Script. Algunas cuentas de Google Workspace restringen el acceso anónimo.
- **Cambios pendientes o no confirmados:** comprueba si el movimiento apareció en `Movimientos` antes de volver a registrarlo, para evitar duplicados. La escritura en modo `no-cors` no permite leer una respuesta inmediata; la app intenta verificar mediante una lectura posterior.
- **No aparece el botón Instalar:** asegúrate de entrar mediante HTTPS y no por `file://`, recarga la página y revisa que el manifiesto, iconos y `sw.js` estén publicados.
- **No se instala en escritorio:** algunos navegadores no muestran el mismo botón; el menú del navegador puede ofrecer la instalación o el acceso directo.

## Limitaciones y seguridad

- Los roles `cliente`, `empleado` y `gerente` solo controlan qué elementos de la interfaz se ven. No son autenticación real y no protegen la API.
- El registro `QR` es solo una etiqueta del medio de pago: no genera un QR bancario, no consulta el banco ni confirma el pago.
- Los registros locales se guardan en el navegador del dispositivo, no en la nube. Borrar los datos del navegador puede eliminarlos.
- Los datos de restaurante precargados son demostrativos; verifica cada registro antes de usar la app en el negocio.
- No es un sistema fiscal o contable certificado. Necesita una capa de autenticación y controles de seguridad antes de gestionar datos comerciales reales en una URL pública.
