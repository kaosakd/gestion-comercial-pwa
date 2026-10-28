/**
 * API simple para Gestión Comercial PWA.
 * 1) Crea una hoja de cálculo nueva.
 * 2) Pega el ID de esa hoja en SPREADSHEET_ID.
 * 3) Ejecuta setupSheets() una vez desde el editor y autoriza permisos.
 * 4) Implementa el proyecto como aplicación web.
 *
 * ADVERTENCIA: si implementas el servicio para acceso anónimo, los datos y las
 * operaciones expuestas por esta API podrían quedar accesibles a cualquier
 * persona que conozca la URL. Para datos comerciales sensibles, restringe el
 * acceso y añade autenticación real antes de utilizarlo en producción.
 */
const SPREADSHEET_ID = 'PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET';
const PRODUCTS_SHEET = 'Productos';
const MOVEMENTS_SHEET = 'Movimientos';
const PRODUCT_HEADERS = ['id', 'name', 'category', 'price', 'costPrice', 'stock', 'minStock', 'updatedAt'];
const MOVEMENT_HEADERS = ['id', 'type', 'productId', 'productName', 'quantity', 'unitPrice', 'total', 'paymentMethod', 'notes', 'createdAt', 'userRole'];

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    if (params.action !== 'bootstrap') return output_({ ok: true, message: 'Gestión Comercial API activa.' });
    const snapshot = getSnapshot_();
    const callback = String(params.callback || '');
    if (callback) {
      // JSONP solo para lectura; nunca habilitar operaciones de escritura vía JSONP.
      if (!/^[A-Za-z_$][0-9A-Za-z_$]{0,80}$/.test(callback)) return output_({ ok: false, message: 'Callback no válido.' });
      return ContentService.createTextOutput(callback + '(' + JSON.stringify(Object.assign({ ok: true }, snapshot)) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return output_(Object.assign({ ok: true }, snapshot));
  } catch (error) {
    const params = (e && e.parameter) || {};
    const callback = String(params.callback || '');
    const result = { ok: false, message: error.message || String(error) };
    if (/^[A-Za-z_$][0-9A-Za-z_$]{0,80}$/.test(callback)) {
      return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return output_(result);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const raw = e && e.postData && e.postData.contents;
    if (!raw) throw new Error('Falta el contenido de la operación.');
    const request = JSON.parse(raw);
    const action = String(request.action || '');
    const data = request.data || {};
    let result;
    if (action === 'saveProduct') result = saveProduct_(data);
    else if (action === 'deleteProduct') result = deleteProduct_(data);
    else if (action === 'createMovement') result = createMovement_(data);
    else if (action === 'setup') result = { ok: true, message: 'API lista.' };
    else throw new Error('Acción no reconocida: ' + action);
    return output_(Object.assign({ ok: true }, result || {}));
  } catch (error) {
    return output_({ ok: false, message: error.message || String(error) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function setupSheets() {
  const ss = getSpreadsheet_();
  ensureSheet_(ss, PRODUCTS_SHEET, PRODUCT_HEADERS);
  ensureSheet_(ss, MOVEMENTS_SHEET, MOVEMENT_HEADERS);
  Logger.log('Hojas listas: ' + ss.getUrl());
}

/**
 * Carga un ejemplo de restaurante en una hoja VACÍA.
 * Ejecuta manualmente desde el editor de Apps Script después de configurar
 * SPREADSHEET_ID y ejecutar setupSheets(). No se ejecuta automáticamente.
 * Los registros son ficticios, fechados el sábado 24/10/2026 (hora de Bolivia).
 */
function seedDemoRestaurantData() {
  const ss = getSpreadsheet_();
  const productSheet = ensureSheet_(ss, PRODUCTS_SHEET, PRODUCT_HEADERS);
  const movementSheet = ensureSheet_(ss, MOVEMENTS_SHEET, MOVEMENT_HEADERS);
  if (productSheet.getLastRow() > 1 || movementSheet.getLastRow() > 1) {
    throw new Error('Carga cancelada para evitar duplicados: Productos y Movimientos deben contener solo encabezados.');
  }

  const updatedAt = new Date('2026-10-24T20:00:00-04:00').toISOString();
  const products = [
    { id: 'rest-choripan', name: 'Choripán', category: 'Platos', price: 15, costPrice: 0, stock: 25, minStock: 5, updatedAt: updatedAt },
    { id: 'rest-chorizo-yuca', name: 'Chorizo con yuca', category: 'Platos', price: 20, costPrice: 0, stock: 12, minStock: 5, updatedAt: updatedAt },
    { id: 'rest-mixto-yuca', name: 'Mixto con yuca', category: 'Platos', price: 33, costPrice: 0, stock: 10, minStock: 5, updatedAt: updatedAt },
    { id: 'rest-mixto-arroz', name: 'Mixto con arroz', category: 'Platos', price: 35, costPrice: 0, stock: 8, minStock: 5, updatedAt: updatedAt },
    { id: 'rest-asado-yuca', name: 'Asado con yuca', category: 'Platos', price: 25, costPrice: 0, stock: 15, minStock: 5, updatedAt: updatedAt },
    { id: 'rest-chorizo-arroz', name: 'Chorizo con arroz', category: 'Platos', price: 24, costPrice: 0, stock: 15, minStock: 5, updatedAt: updatedAt },
    { id: 'rest-asado-arroz', name: 'Asado con arroz', category: 'Platos', price: 27, costPrice: 0, stock: 12, minStock: 5, updatedAt: updatedAt },
    { id: 'rest-refresco-personal', name: 'Refresco personal', category: 'Bebidas', price: 3, costPrice: 0, stock: 30, minStock: 10, updatedAt: updatedAt },
    { id: 'rest-refresco-popular', name: 'Refresco popular', category: 'Bebidas', price: 9, costPrice: 0, stock: 20, minStock: 8, updatedAt: updatedAt },
    { id: 'rest-jugo', name: 'Jugo', category: 'Bebidas', price: 7, costPrice: 0, stock: 15, minStock: 8, updatedAt: updatedAt },
    { id: 'rest-chorizo-kilo', name: 'Chorizo parrillero por kilo', category: 'Venta por kilo', price: 63, costPrice: 0, stock: 10, minStock: 5, updatedAt: updatedAt }
  ];
  const timeWindows = [
    { times: ['11:05','11:12','11:20','11:31','11:45','11:58','12:10','12:18','12:32','12:45','12:55'], quantities: [7,5,3,2,4,5,4,14,8,6,10] },
    { times: ['13:02','13:10','13:20','13:35','13:47','13:56','14:05','14:20','14:32','14:44','14:55'], quantities: [12,9,6,5,7,8,6,18,9,9,15] },
    { times: ['15:02','15:11','15:25','15:38','15:50','16:03','16:17','16:29','16:40','16:51','16:57'], quantities: [6,6,4,3,4,5,4,12,5,6,10] },
    { times: ['17:03','17:15','17:27','17:40','17:55','18:08','18:22','18:35','18:47','19:02','19:45'], quantities: [10,8,5,5,5,7,6,17,8,8,15] }
  ];
  const movements = [];
  timeWindows.forEach(function(windowData, windowIndex) {
    products.forEach(function(product, productIndex) {
      const quantity = windowData.quantities[productIndex];
      const createdAt = new Date('2026-10-24T' + windowData.times[productIndex] + ':00-04:00').toISOString();
      movements.push({
        id: 'demo-sabado-' + (windowIndex + 1) + '-' + (productIndex + 1),
        type: 'VENTA', productId: product.id, productName: product.name,
        quantity: quantity, unitPrice: product.price, total: round2_(quantity * product.price),
        paymentMethod: (windowIndex + productIndex) % 4 === 0 ? 'QR' : 'EFECTIVO',
        notes: 'DEMOSTRACIÓN: verificar y reemplazar por el registro real si corresponde.',
        createdAt: createdAt, userRole: 'empleado'
      });
    });
  });

  productSheet.getRange(2, 1, products.length, PRODUCT_HEADERS.length)
    .setValues(products.map(function(product) { return PRODUCT_HEADERS.map(function(header) { return product[header] !== undefined ? product[header] : ''; }); }));
  movementSheet.getRange(2, 1, movements.length, MOVEMENT_HEADERS.length)
    .setValues(movements.map(function(movement) { return MOVEMENT_HEADERS.map(function(header) { return movement[header] !== undefined ? movement[header] : ''; }); }));

  Logger.log('Datos demostrativos cargados: ' + products.length + ' productos y ' + movements.length + ' movimientos.');
  Logger.log('Platos y bebidas: Bs 4.500; chorizo parrillero: 50 kg x Bs 63 = Bs 3.150; total: Bs 7.650.');
  return { products: products.length, movements: movements.length, restaurantSales: 4500, sausageKg: 50, sausageSales: 3150, totalSales: 7650 };
}

function getSnapshot_() {
  const ss = getSpreadsheet_();
  const products = readRows_(ensureSheet_(ss, PRODUCTS_SHEET, PRODUCT_HEADERS), PRODUCT_HEADERS)
    .map(normalizeProduct_);
  const movements = readRows_(ensureSheet_(ss, MOVEMENTS_SHEET, MOVEMENT_HEADERS), MOVEMENT_HEADERS)
    .map(normalizeMovement_)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return { products: products, movements: movements };
}

function saveProduct_(input) {
  const sheet = ensureSheet_(getSpreadsheet_(), PRODUCTS_SHEET, PRODUCT_HEADERS);
  const p = {
    id: requiredString_(input.id || Utilities.getUuid(), 'id'),
    name: requiredString_(input.name, 'nombre'),
    category: String(input.category || 'General').trim() || 'General',
    price: nonNegativeNumber_(input.price, 'precio'),
    costPrice: nonNegativeNumber_(input.costPrice || 0, 'costo'),
    stock: nonNegativeNumber_(input.stock || 0, 'stock'),
    minStock: nonNegativeNumber_(input.minStock || 0, 'stock mínimo'),
    updatedAt: new Date().toISOString()
  };
  const rows = readRows_(sheet, PRODUCT_HEADERS);
  const index = rows.findIndex((row) => String(row.id) === p.id);
  const rowValues = PRODUCT_HEADERS.map((header) => p[header] !== undefined ? p[header] : '');
  if (index >= 0) sheet.getRange(index + 2, 1, 1, PRODUCT_HEADERS.length).setValues([rowValues]);
  else sheet.appendRow(rowValues);
  return { id: p.id };
}

function deleteProduct_(input) {
  const id = requiredString_(input.id, 'id');
  const sheet = ensureSheet_(getSpreadsheet_(), PRODUCTS_SHEET, PRODUCT_HEADERS);
  const rows = readRows_(sheet, PRODUCT_HEADERS);
  const index = rows.findIndex((row) => String(row.id) === id);
  if (index >= 0) sheet.deleteRow(index + 2);
  return { id: id, deleted: index >= 0 };
}

function createMovement_(input) {
  const ss = getSpreadsheet_();
  const productSheet = ensureSheet_(ss, PRODUCTS_SHEET, PRODUCT_HEADERS);
  const movementSheet = ensureSheet_(ss, MOVEMENTS_SHEET, MOVEMENT_HEADERS);
  const id = requiredString_(input.id || Utilities.getUuid(), 'id');
  const existingMovements = readRows_(movementSheet, MOVEMENT_HEADERS);
  if (existingMovements.some((row) => String(row.id) === id)) return { id: id, duplicate: true };

  const productId = requiredString_(input.productId, 'producto');
  const quantity = positiveNumber_(input.quantity, 'cantidad');
  const productRows = readRows_(productSheet, PRODUCT_HEADERS);
  const productIndex = productRows.findIndex((row) => String(row.id) === productId);
  if (productIndex < 0) throw new Error('El producto no existe en Google Sheets: ' + productId);
  const p = normalizeProduct_(productRows[productIndex]);
  const type = String(input.type || '').toUpperCase();
  if (type !== 'VENTA' && type !== 'COMPRA') throw new Error('Tipo de movimiento no válido.');
  let unitPrice;
  if (type === 'VENTA') {
    if (Number(p.stock) < quantity) throw new Error('Stock insuficiente para ' + p.name + '.');
    unitPrice = input.unitPrice !== undefined && input.unitPrice !== ''
      ? nonNegativeNumber_(input.unitPrice, 'precio unitario')
      : Number(p.price);
    p.stock = round2_(Number(p.stock) - quantity);
  } else {
    unitPrice = nonNegativeNumber_(input.unitPrice, 'costo unitario');
    p.stock = round2_(Number(p.stock) + quantity);
    p.costPrice = unitPrice;
  }
  p.updatedAt = new Date().toISOString();
  productSheet.getRange(productIndex + 2, 1, 1, PRODUCT_HEADERS.length)
    .setValues([PRODUCT_HEADERS.map((header) => p[header] !== undefined ? p[header] : '')]);

  const movement = {
    id: id,
    type: type,
    productId: productId,
    productName: p.name,
    quantity: quantity,
    unitPrice: round2_(unitPrice),
    total: round2_(unitPrice * quantity),
    paymentMethod: String(input.paymentMethod || 'EFECTIVO'),
    notes: String(input.notes || '').slice(0, 180),
    createdAt: new Date().toISOString(),
    userRole: String(input.userRole || 'empleado')
  };
  movementSheet.appendRow(MOVEMENT_HEADERS.map((header) => movement[header] !== undefined ? movement[header] : ''));
  return { id: id, productId: productId, stock: p.stock, total: movement.total };
}

function getSpreadsheet_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf('PEGA_AQUI') === 0) {
    throw new Error('Configura SPREADSHEET_ID en Code.gs antes de ejecutar la API.');
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  } else {
    const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
    const currentHeaders = current.slice(0, headers.length).map(String);
    if (headers.some((header, index) => currentHeaders[index] !== header)) {
      throw new Error('Los encabezados de la hoja "' + name + '" no coinciden. Ejecuta setupSheets() en una hoja nueva o corrige la primera fila.');
    }
  }
  return sheet;
}

function readRows_(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map((cells) => {
    const row = {};
    headers.forEach((header, index) => row[header] = cells[index]);
    return row;
  }).filter((row) => String(row.id || '').trim() !== '');
}

function normalizeProduct_(p) {
  return {
    id: String(p.id || ''), name: String(p.name || ''), category: String(p.category || 'General'),
    price: Number(p.price) || 0, costPrice: Number(p.costPrice) || 0, stock: Number(p.stock) || 0,
    minStock: Number(p.minStock) || 0, updatedAt: toIso_(p.updatedAt)
  };
}

function normalizeMovement_(m) {
  return {
    id: String(m.id || ''), type: String(m.type || ''), productId: String(m.productId || ''),
    productName: String(m.productName || ''), quantity: Number(m.quantity) || 0,
    unitPrice: Number(m.unitPrice) || 0, total: Number(m.total) || 0,
    paymentMethod: String(m.paymentMethod || 'EFECTIVO'), notes: String(m.notes || ''),
    createdAt: toIso_(m.createdAt), userRole: String(m.userRole || '')
  };
}

function toIso_(value) {
  if (value instanceof Date) return value.toISOString();
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function requiredString_(value, label) {
  const result = String(value == null ? '' : value).trim();
  if (!result) throw new Error('El campo ' + label + ' es obligatorio.');
  return result;
}

function nonNegativeNumber_(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error('El campo ' + label + ' debe ser un número mayor o igual a cero.');
  return round2_(n);
}

function positiveNumber_(value, label) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error('El campo ' + label + ' debe ser mayor que cero.');
  return round2_(n);
}

function round2_(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

function output_(object) {
  return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(ContentService.MimeType.JSON);
}
