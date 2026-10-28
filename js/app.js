(function () {
  'use strict';

  const STORAGE_KEY = 'gestionComercial.state.v1';
  const ROLE_KEY = 'gestionComercial.role.v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const SAMPLE_PRODUCTS = [
    { id: 'demo-1', name: 'Producto de ejemplo A', category: 'General', price: 25, costPrice: 16, stock: 18, minStock: 5, updatedAt: new Date().toISOString() },
    { id: 'demo-2', name: 'Producto de ejemplo B', category: 'General', price: 42, costPrice: 28, stock: 7, minStock: 4, updatedAt: new Date().toISOString() },
    { id: 'demo-3', name: 'Producto de ejemplo C', category: 'Accesorios', price: 12.5, costPrice: 7, stock: 2, minStock: 5, updatedAt: new Date().toISOString() }
  ];

  const savedState = readLocalState();
  const state = {
    products: savedState?.products || SAMPLE_PRODUCTS.map((p) => ({ ...p })),
    movements: savedState?.movements || [],
    role: localStorage.getItem(ROLE_KEY) || 'gerente',
    view: 'dashboard',
    productSearch: '',
    salesSearch: '',
    cart: [],
    activeProductId: null,
    remoteStatus: 'local',
    pendingWrites: Array.isArray(savedState?.pendingWrites) ? savedState.pendingWrites : []
  };

  const roleNames = { cliente: 'Cliente', empleado: 'Empleado', gerente: 'Gerente' };
  const pageInfo = {
    dashboard: { title: 'Resumen', eyebrow: 'PANEL DE CONTROL' },
    productos: { title: 'Inventario', eyebrow: 'PRODUCTOS Y EXISTENCIAS' },
    ventas: { title: 'Punto de venta', eyebrow: 'VENTAS Y COBROS' },
    compras: { title: 'Registrar compra', eyebrow: 'REPOSICIÓN DE STOCK' },
    reportes: { title: 'Movimientos', eyebrow: 'HISTORIAL Y EXPORTACIÓN' },
    ods: { title: 'Impacto sostenible', eyebrow: 'OBJETIVOS DE DESARROLLO SOSTENIBLE' }
  };

  function readLocalState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.products) || !Array.isArray(parsed.movements)) return null;
      return parsed;
    } catch (error) {
      console.warn('No se pudo leer el almacenamiento local.', error);
      return null;
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ products: state.products, movements: state.movements, pendingWrites: state.pendingWrites }));
      return true;
    } catch (error) {
      toast('No se pudo guardar en este dispositivo. Libera espacio del navegador.', true);
      return false;
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function money(value) {
    const n = Number(value) || 0;
    return 'Bs ' + n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function number(value) {
    return (Number(value) || 0).toLocaleString('es-BO', { maximumFractionDigits: 2 });
  }

  function uid() {
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function localDateKey(date = new Date()) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function dateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
  }

  function dateLong(value = new Date()) {
    return new Date(value).toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function canManage() { return state.role === 'gerente'; }
  function canSell() { return state.role === 'empleado' || state.role === 'gerente'; }
  function canPurchase() { return canManage(); }

  function navItems() {
    if (state.role === 'cliente') return [
      { id: 'dashboard', label: 'Catálogo', icon: 'bi-grid' },
      { id: 'productos', label: 'Productos', icon: 'bi-box-seam' },
      { id: 'ods', label: 'ODS', icon: 'bi-globe-americas' }
    ];
    if (state.role === 'empleado') return [
      { id: 'dashboard', label: 'Inicio', icon: 'bi-house' },
      { id: 'productos', label: 'Productos', icon: 'bi-box-seam' },
      { id: 'ventas', label: 'Vender', icon: 'bi-cart-check' },
      { id: 'ods', label: 'ODS', icon: 'bi-globe-americas' }
    ];
    return [
      { id: 'dashboard', label: 'Resumen', icon: 'bi-grid-1x2' },
      { id: 'productos', label: 'Inventario', icon: 'bi-box-seam' },
      { id: 'ventas', label: 'Ventas', icon: 'bi-cart-check' },
      { id: 'compras', label: 'Compras', icon: 'bi-bag-plus' },
      { id: 'reportes', label: 'Reportes', icon: 'bi-bar-chart-line' },
      { id: 'ods', label: 'ODS', icon: 'bi-globe-americas' }
    ];
  }

  function go(view) {
    const allowed = navItems().some((item) => item.id === view);
    state.view = allowed ? view : 'dashboard';
    render();
    $('#app-main').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function render() {
    const info = pageInfo[state.view] || pageInfo.dashboard;
    $('#page-title').textContent = state.role === 'cliente' && state.view === 'dashboard' ? 'Catálogo' : info.title;
    $('#today-label').textContent = state.role === 'cliente' ? 'PRODUCTOS DISPONIBLES' : info.eyebrow;
    $('#role-switch').value = state.role;
    renderNav();
    const main = $('#app-main');
    if (state.view === 'productos') main.innerHTML = renderProducts();
    else if (state.view === 'ventas') main.innerHTML = renderSales();
    else if (state.view === 'compras') main.innerHTML = renderPurchases();
    else if (state.view === 'reportes') main.innerHTML = renderReports();
    else if (state.view === 'ods') main.innerHTML = renderOds();
    else main.innerHTML = renderDashboard();
    updateConnectionBadge();
  }

  function renderNav() {
    $('#bottom-nav').innerHTML = navItems().map((item) => `
      <button type="button" class="nav-item ${state.view === item.id ? 'active' : ''}" data-nav="${item.id}" aria-current="${state.view === item.id ? 'page' : 'false'}">
        <i class="bi ${item.icon}" aria-hidden="true"></i><span>${item.label}</span>
      </button>`).join('');
  }

  function stockClass(product) {
    const stock = Number(product.stock) || 0;
    if (stock <= 0) return 'stock-out';
    if (stock <= Number(product.minStock || 0)) return 'stock-low';
    return 'stock-ok';
  }

  function stockLabel(product) {
    if ((Number(product.stock) || 0) <= 0) return 'Agotado';
    if ((Number(product.stock) || 0) <= Number(product.minStock || 0)) return 'Stock bajo';
    return 'Disponible';
  }

  function symbolFor(category = '') {
    const c = String(category).toLowerCase();
    if (c.includes('comida') || c.includes('alimento')) return 'bi-egg-fried';
    if (c.includes('ropa') || c.includes('vest')) return 'bi-handbag';
    if (c.includes('bebida')) return 'bi-cup-straw';
    if (c.includes('elect')) return 'bi-plug';
    return 'bi-box-seam';
  }

  function productCard(product, compact = false) {
    const actions = canManage() ? `<div class="product-actions"><button type="button" data-action="edit-product" data-id="${escapeHtml(product.id)}" aria-label="Editar ${escapeHtml(product.name)}"><i class="bi bi-pencil"></i></button><button type="button" data-action="delete-product" data-id="${escapeHtml(product.id)}" aria-label="Eliminar ${escapeHtml(product.name)}"><i class="bi bi-trash3"></i></button></div>` : '';
    const price = state.role === 'cliente' || !compact ? `<div class="product-price">${money(product.price)} <small>/ unidad</small></div>` : '';
    return `<article class="product-card">
      <div class="product-card-top"><span class="product-symbol"><i class="bi ${symbolFor(product.category)}"></i></span>${actions}</div>
      <div class="product-card-body"><div class="product-category">${escapeHtml(product.category || 'General')}</div><h3>${escapeHtml(product.name)}</h3>${price}</div>
      <div class="product-stockline"><span>Stock: <strong>${number(product.stock)}</strong></span><span class="stock-badge ${stockClass(product)}">${stockLabel(product)}</span></div>
    </article>`;
  }

  function emptyState(icon, title, copy) {
    return `<div class="panel"><div class="empty-state"><span class="empty-icon"><i class="bi ${icon}"></i></span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></div></div>`;
  }

  function renderDashboard() {
    const products = [...state.products].sort((a, b) => Number(a.stock) - Number(b.stock));
    if (state.role === 'cliente') {
      const available = products.filter((p) => Number(p.stock) > 0).slice(0, 6);
      return `<section class="view-heading"><div><h2>Productos para ti</h2><p>Consulta precios y disponibilidad de productos.</p></div><button class="btn-secondary-custom" type="button" data-nav="productos"><i class="bi bi-arrow-right"></i> Ver todos</button></section>
        ${available.length ? `<div class="product-grid">${available.map((p) => productCard(p)).join('')}</div>` : emptyState('bi-box-seam', 'Todavía no hay productos', 'Cuando el negocio registre su inventario, los productos aparecerán aquí.')}
        <div class="ods-note mt-3"><strong>Compra responsable:</strong> confirma la disponibilidad y el precio antes de realizar un pedido. Esta vista es un catálogo; no procesa pagos.</div>`;
    }

    const today = localDateKey();
    const todaySales = state.movements.filter((m) => m.type === 'VENTA' && localDateKey(m.createdAt) === today);
    const monthSales = state.movements.filter((m) => m.type === 'VENTA' && String(m.createdAt || '').slice(0, 7) === today.slice(0, 7));
    const totalSales = monthSales.reduce((sum, m) => sum + Number(m.total || 0), 0);
    const units = state.products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
    const low = state.products.filter((p) => Number(p.stock) <= Number(p.minStock || 0)).length;
    const inventoryValue = state.products.reduce((sum, p) => sum + Number(p.stock || 0) * Number(p.price || 0), 0);
    const stats = state.role === 'gerente' ? [
      { icon: 'bi-cash-stack', caption: 'Ventas del mes', value: money(totalSales), note: `${monthSales.length} transacciones` },
      { icon: 'bi-receipt', caption: 'Ventas de hoy', value: money(todaySales.reduce((s, m) => s + Number(m.total || 0), 0)), note: `${todaySales.length} ventas registradas` },
      { icon: 'bi-box-seam', caption: 'Unidades en stock', value: number(units), note: `${state.products.length} productos distintos` },
      { icon: 'bi-exclamation-triangle', caption: 'Stock por revisar', value: number(low), note: `Valor a precio de venta: ${money(inventoryValue)}` }
    ] : [
      { icon: 'bi-cart-check', caption: 'Mis ventas de hoy', value: number(todaySales.length), note: 'Registros de esta jornada' },
      { icon: 'bi-box-seam', caption: 'Productos en catálogo', value: number(state.products.length), note: `${number(units)} unidades en stock` }
    ];
    const recent = state.movements.filter((m) => state.role === 'gerente' || m.type === 'VENTA').slice(0, 5);
    const recentHtml = recent.length ? `<div class="movement-list">${recent.map(movementRow).join('')}</div>` : `<div class="empty-state"><span class="empty-icon"><i class="bi bi-receipt"></i></span><h3>Sin movimientos por ahora</h3><p>Cuando registres ventas o compras, aparecerán aquí.</p></div>`;
    return `<section class="stats-grid">${stats.map((s) => `<article class="stat-card"><div class="stat-top"><span class="stat-caption">${s.caption}</span><span class="stat-icon"><i class="bi ${s.icon}"></i></span></div><div class="stat-value">${s.value}</div><div class="stat-note">${s.note}</div></article>`).join('')}</section>
      <div class="content-grid mt-4">
        <section class="panel"><div class="panel-header"><h3>Actividad reciente</h3>${state.role === 'gerente' ? '<button type="button" class="text-link" data-nav="reportes">Ver historial <i class="bi bi-arrow-up-right"></i></button>' : ''}</div><div class="panel-body">${recentHtml}</div></section>
        <section><div class="view-heading"><div><h2>Accesos rápidos</h2><p>Lo que necesitas, a un toque.</p></div></div><div class="quick-actions">
        ${canSell() ? `<button type="button" class="quick-action" data-nav="ventas"><span class="quick-icon"><i class="bi bi-cart-plus"></i></span><span><strong>Registrar una venta</strong><small>Agrega productos y registra el pago</small></span><i class="bi bi-chevron-right"></i></button>` : ''}
        ${canManage() ? `<button type="button" class="quick-action" data-action="new-product"><span class="quick-icon"><i class="bi bi-plus-square"></i></span><span><strong>Nuevo producto</strong><small>Actualiza el inventario del negocio</small></span><i class="bi bi-chevron-right"></i></button><button type="button" class="quick-action" data-nav="compras"><span class="quick-icon"><i class="bi bi-bag-plus"></i></span><span><strong>Registrar una compra</strong><small>Repón existencias de productos</small></span><i class="bi bi-chevron-right"></i></button>` : ''}
        <button type="button" class="quick-action" data-nav="productos"><span class="quick-icon"><i class="bi bi-box-seam"></i></span><span><strong>Consultar productos</strong><small>Revisa stock y precios</small></span><i class="bi bi-chevron-right"></i></button>
        <button type="button" class="quick-action" data-nav="ods"><span class="quick-icon"><i class="bi bi-globe-americas"></i></span><span><strong>ODS y sostenibilidad</strong><small>Conoce el impacto del sistema</small></span><i class="bi bi-chevron-right"></i></button>
        </div></section>
      </div>`;
  }

  function renderProducts() {
    const isClient = state.role === 'cliente';
    const filtered = state.products.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(state.productSearch.toLowerCase()));
    return `<section class="view-heading"><div><h2>${isClient ? 'Catálogo de productos' : 'Todos los productos'}</h2><p>${isClient ? 'Precios y existencias disponibles.' : 'Controla las existencias y detecta productos por reponer.'}</p></div>${canManage() ? '<button type="button" class="btn-primary-custom" data-action="new-product"><i class="bi bi-plus-lg"></i><span>Nuevo producto</span></button>' : ''}</section>
      <div class="filterbar"><div class="search-field"><i class="bi bi-search"></i><input class="form-control-custom" id="product-search" data-search-products="true" type="search" placeholder="Buscar producto o categoría…" value="${escapeHtml(state.productSearch)}" aria-label="Buscar productos"></div>${canManage() ? `<button type="button" class="btn-secondary-custom" data-action="export-json"><i class="bi bi-download"></i> Exportar</button>` : ''}</div>
      ${filtered.length ? `<div class="product-grid" id="product-grid">${filtered.map((p) => productCard(p)).join('')}</div>` : emptyState('bi-search', 'No encontramos productos', 'Prueba otra búsqueda o agrega un producto al inventario.')}
      ${canManage() ? '<p class="muted mt-3" style="font-size:10px">El stock se actualiza automáticamente al registrar compras y ventas.</p>' : ''}`;
  }

  function renderSales() {
    if (!canSell()) return emptyState('bi-lock', 'Vista no disponible', 'Este rol no puede registrar ventas.');
    const filtered = state.products.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(state.salesSearch.toLowerCase()) && Number(p.stock) > 0);
    const cartRows = state.cart.map((item) => {
      const p = state.products.find((x) => x.id === item.productId);
      if (!p) return '';
      return `<div class="ticket-line"><div><strong>${escapeHtml(p.name)}</strong><small>${money(p.price)} × ${number(item.quantity)}</small><strong class="mt-1 d-block">${money(p.price * item.quantity)}</strong></div><div class="qty-controls"><button type="button" data-action="cart-decrease" data-id="${escapeHtml(p.id)}" aria-label="Disminuir cantidad"><i class="bi bi-dash"></i></button><span>${number(item.quantity)}</span><button type="button" data-action="cart-increase" data-id="${escapeHtml(p.id)}" aria-label="Aumentar cantidad"><i class="bi bi-plus"></i></button></div></div>`;
    }).join('');
    const total = state.cart.reduce((sum, item) => {
      const p = state.products.find((x) => x.id === item.productId);
      return sum + (p ? Number(p.price) * item.quantity : 0);
    }, 0);
    return `<section class="view-heading"><div><h2>Nueva venta</h2><p>Selecciona productos, revisa cantidades y registra el método de pago.</p></div><span class="status-badge stock-ok"><i class="bi bi-shield-check"></i> Punto de venta</span></section>
      <div class="pos-layout"><section><div class="filterbar"><div class="search-field"><i class="bi bi-search"></i><input class="form-control-custom" id="sales-search" data-search-sales="true" type="search" placeholder="Buscar producto…" value="${escapeHtml(state.salesSearch)}" aria-label="Buscar producto para vender"></div></div>
        ${filtered.length ? `<div class="pos-product-list" id="sales-products">${filtered.map((p) => `<button type="button" class="pos-product" data-action="cart-add" data-id="${escapeHtml(p.id)}"><span class="product-symbol"><i class="bi ${symbolFor(p.category)}"></i></span><span class="pos-product-copy"><strong>${escapeHtml(p.name)}</strong><small>${number(p.stock)} unidades disponibles</small></span><span class="pos-product-price">${money(p.price)}</span><i class="bi bi-plus-circle"></i></button>`).join('')}</div>` : emptyState('bi-box-seam', 'No hay productos disponibles', 'Agrega stock mediante una compra antes de vender.')}
      </section><section class="panel ticket-panel"><div class="panel-header"><h3><i class="bi bi-receipt me-2"></i>Detalle de venta</h3><span class="status-badge stock-ok">${state.cart.length} ítems</span></div><div class="panel-body">
        ${cartRows || '<div class="empty-state" style="padding:20px 8px"><span class="empty-icon"><i class="bi bi-cart"></i></span><h3>Tu venta está vacía</h3><p>Toca un producto para añadirlo al detalle.</p></div>'}
        <div class="ticket-total"><span>Total a cobrar</span><strong>${money(total)}</strong></div>
        <form id="sale-form"><div class="form-field"><label for="sale-payment">Método de pago</label><select class="form-select-custom" id="sale-payment" name="paymentMethod"><option value="EFECTIVO">Efectivo</option><option value="QR">Código QR</option></select></div><div class="form-field mt-3"><label for="sale-notes">Nota (opcional)</label><input id="sale-notes" name="notes" class="form-control-custom" maxlength="180" placeholder="Ej. cliente, referencia…"></div><button class="btn-primary-custom mt-3" type="submit" ${state.cart.length ? '' : 'disabled'}><i class="bi bi-check-circle"></i> Confirmar venta</button>
        </form><p class="muted mt-3 mb-0" style="font-size:10px;line-height:1.6">El método QR solo se registra como forma de pago. Esta aplicación no genera ni valida cobros QR reales.</p>
      </div></section></div>`;
  }

  function renderPurchases() {
    if (!canPurchase()) return emptyState('bi-lock', 'Vista no disponible', 'Solo el gerente puede registrar compras en esta versión.');
    const products = state.products;
    return `<section class="view-heading"><div><h2>Registrar una compra</h2><p>La compra aumenta el stock del producto seleccionado.</p></div></section>
      ${products.length ? `<div class="content-grid"><section class="panel"><div class="panel-header"><h3>Datos de la compra</h3></div><div class="panel-body"><form id="purchase-form"><div class="form-grid">
        <div class="form-field span-2"><label for="purchase-product">Producto</label><select id="purchase-product" name="productId" class="form-select-custom" required>${products.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} — Stock: ${number(p.stock)}</option>`).join('')}</select></div>
        <div class="form-field"><label for="purchase-quantity">Cantidad comprada</label><input id="purchase-quantity" name="quantity" class="form-control-custom" type="number" min="0.01" step="0.01" value="1" required></div>
        <div class="form-field"><label for="purchase-unit-price">Costo por unidad (Bs)</label><input id="purchase-unit-price" name="unitPrice" class="form-control-custom" type="number" min="0" step="0.01" placeholder="0,00" required></div>
        <div class="form-field"><label for="purchase-payment">Método de pago</label><select id="purchase-payment" name="paymentMethod" class="form-select-custom"><option value="EFECTIVO">Efectivo</option><option value="QR">Código QR</option><option value="CRÉDITO">Crédito / pendiente</option></select></div>
        <div class="form-field"><label for="purchase-notes">Proveedor o nota</label><input id="purchase-notes" name="notes" class="form-control-custom" maxlength="180" placeholder="Nombre del proveedor…"></div>
        </div><div class="info-note mt-3">Registra el costo unitario real de la compra. El precio de venta del producto no cambiará automáticamente.</div><div class="form-actions"><button type="submit" class="btn-primary-custom"><i class="bi bi-bag-check"></i> Guardar compra</button></div></form></div></section>
        <section class="panel"><div class="panel-header"><h3>Stock más bajo</h3></div><div class="panel-body">${[...products].sort((a, b) => Number(a.stock) - Number(b.stock)).slice(0, 5).map((p) => `<div class="movement-row"><span class="product-symbol"><i class="bi ${symbolFor(p.category)}"></i></span><span class="movement-detail"><strong>${escapeHtml(p.name)}</strong><small>Stock mínimo: ${number(p.minStock)}</small></span><span class="stock-badge ${stockClass(p)}">${number(p.stock)} uds.</span></div>`).join('')}</div></section></div>` : emptyState('bi-box-seam', 'Primero crea un producto', 'Debes tener al menos un producto para registrar una compra.')}`;
  }

  function movementRow(m) {
    const isSale = m.type === 'VENTA';
    return `<div class="movement-row"><span class="movement-icon ${isSale ? 'sale' : 'purchase'}"><i class="bi ${isSale ? 'bi-arrow-up-right' : 'bi-arrow-down-left'}"></i></span><span class="movement-detail"><strong>${escapeHtml(m.productName || 'Producto')}</strong><small>${isSale ? 'Venta' : 'Compra'} · ${dateTime(m.createdAt)} · ${escapeHtml(m.paymentMethod || '—')}</small></span><span class="movement-amount ${isSale ? 'positive' : 'negative'}">${isSale ? '+' : '−'}${money(m.total)}</span></div>`;
  }

  function renderReports() {
    if (!canManage()) return emptyState('bi-lock', 'Vista no disponible', 'Solo el gerente puede consultar todos los movimientos.');
    const movements = [...state.movements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const totalSales = movements.filter((m) => m.type === 'VENTA').reduce((sum, m) => sum + Number(m.total || 0), 0);
    const totalPurchases = movements.filter((m) => m.type === 'COMPRA').reduce((sum, m) => sum + Number(m.total || 0), 0);
    return `<section class="view-heading"><div><h2>Historial transaccional</h2><p>Consulta compras y ventas registradas en este sistema.</p></div><button type="button" class="btn-primary-custom" data-action="export-json"><i class="bi bi-filetype-json"></i><span>Exportar JSON</span></button></section>
      <div class="stats-grid"><article class="stat-card"><div class="stat-top"><span class="stat-caption">Ventas acumuladas</span><span class="stat-icon"><i class="bi bi-graph-up-arrow"></i></span></div><div class="stat-value">${money(totalSales)}</div><div class="stat-note">${movements.filter((m) => m.type === 'VENTA').length} transacciones</div></article><article class="stat-card"><div class="stat-top"><span class="stat-caption">Compras acumuladas</span><span class="stat-icon"><i class="bi bi-bag"></i></span></div><div class="stat-value">${money(totalPurchases)}</div><div class="stat-note">${movements.filter((m) => m.type === 'COMPRA').length} transacciones</div></article><article class="stat-card"><div class="stat-top"><span class="stat-caption">Movimientos totales</span><span class="stat-icon"><i class="bi bi-arrow-left-right"></i></span></div><div class="stat-value">${number(movements.length)}</div><div class="stat-note">Compras y ventas</div></article><article class="stat-card"><div class="stat-top"><span class="stat-caption">Productos activos</span><span class="stat-icon"><i class="bi bi-box-seam"></i></span></div><div class="stat-value">${number(state.products.length)}</div><div class="stat-note">En inventario</div></article></div>
      <section class="panel mt-4"><div class="panel-header"><h3>Todos los movimientos</h3><span class="muted" style="font-size:10px">${movements.length} registros</span></div>
      ${movements.length ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Cantidad</th><th>Pago</th><th>Total</th><th>Registrado como</th></tr></thead><tbody>${movements.map((m) => `<tr><td>${dateTime(m.createdAt)}</td><td><span class="type-pill ${m.type === 'VENTA' ? 'type-sale' : 'type-purchase'}">${m.type === 'VENTA' ? 'VENTA' : 'COMPRA'}</span></td><td><strong>${escapeHtml(m.productName)}</strong>${m.notes ? `<div class="muted mt-1">${escapeHtml(m.notes)}</div>` : ''}</td><td>${number(m.quantity)}</td><td>${escapeHtml(m.paymentMethod || '—')}</td><td><strong>${money(m.total)}</strong></td><td>${escapeHtml(roleNames[m.userRole] || m.userRole || '—')}</td></tr>`).join('')}</tbody></table></div>` : emptyState('bi-receipt', 'Aún no hay movimientos', 'Registra una compra o una venta para generar el historial.')}</section>`;
  }

  function renderOds() {
    return `<section class="view-heading"><div><h2>Cómo contribuye el sistema</h2><p>La herramienta puede apoyar la gestión responsable de un pequeño negocio.</p></div></section>
      <div class="ods-grid"><article class="ods-card"><span class="ods-number">8</span><div><h3>Trabajo decente y crecimiento económico</h3><p>Facilita el registro ordenado de operaciones, mejora la visibilidad de ingresos y ayuda a tomar decisiones para hacer crecer el negocio.</p></div></article>
      <article class="ods-card"><span class="ods-number">9</span><div><h3>Industria, innovación e infraestructura</h3><p>Acerca herramientas digitales, automatización básica y almacenamiento estructurado a microempresas y pequeños comercios.</p></div></article>
      <article class="ods-card"><span class="ods-number">12</span><div><h3>Producción y consumo responsables</h3><p>El control de inventario y las alertas de stock pueden ayudar a comprar mejor, reducir excedentes y prevenir pérdidas de productos.</p></div></article>
      <article class="ods-card"><span class="ods-number">4</span><div><h3>Educación de calidad</h3><p>Su uso puede impulsar habilidades de alfabetización digital, análisis de datos y manejo de registros en la gestión cotidiana.</p></div></article></div>
      <div class="ods-note"><strong>Nota:</strong> estos son aportes potenciales de la herramienta, no una certificación oficial ni una medición del cumplimiento de los ODS. El impacto depende del uso real y de las prácticas del negocio.</div>`;
  }

  function showModal(title, kicker, content) {
    $('#modal-title').textContent = title;
    $('#modal-kicker').textContent = kicker;
    $('#modal-body').innerHTML = content;
    $('#modal-backdrop').classList.remove('d-none');
    $('#app-modal').classList.remove('d-none');
    $('#modal-backdrop').setAttribute('aria-hidden', 'false');
    setTimeout(() => $('#modal-body input, #modal-body select, #modal-body button')?.focus(), 30);
  }

  function closeModal() {
    $('#modal-backdrop').classList.add('d-none');
    $('#app-modal').classList.add('d-none');
    $('#modal-backdrop').setAttribute('aria-hidden', 'true');
  }

  function openProductModal(product = null) {
    if (!canManage()) return;
    const p = product || { id: '', name: '', category: 'General', price: '', costPrice: '', stock: 0, minStock: 3 };
    showModal(product ? 'Editar producto' : 'Nuevo producto', 'INVENTARIO', `<form id="product-form"><input type="hidden" name="id" value="${escapeHtml(p.id)}"><div class="form-grid">
      <div class="form-field span-2"><label for="product-name">Nombre del producto *</label><input id="product-name" name="name" class="form-control-custom" maxlength="100" value="${escapeHtml(p.name)}" required placeholder="Ej. Producto principal"></div>
      <div class="form-field"><label for="product-category">Categoría</label><input id="product-category" name="category" class="form-control-custom" maxlength="60" value="${escapeHtml(p.category || '')}" placeholder="General"></div>
      <div class="form-field"><label for="product-price">Precio de venta (Bs) *</label><input id="product-price" name="price" class="form-control-custom" type="number" min="0" step="0.01" value="${escapeHtml(p.price)}" required></div>
      <div class="form-field"><label for="product-cost">Costo unitario (Bs)</label><input id="product-cost" name="costPrice" class="form-control-custom" type="number" min="0" step="0.01" value="${escapeHtml(p.costPrice ?? 0)}"></div>
      <div class="form-field"><label for="product-stock">Stock actual</label><input id="product-stock" name="stock" class="form-control-custom" type="number" min="0" step="0.01" value="${escapeHtml(p.stock)}" ${product ? '' : 'required'}></div>
      <div class="form-field span-2"><label for="product-min-stock">Avisar cuando queden (o menos)</label><input id="product-min-stock" name="minStock" class="form-control-custom" type="number" min="0" step="0.01" value="${escapeHtml(p.minStock ?? 3)}"></div>
      </div><div class="form-actions"><button type="button" class="btn-secondary-custom" data-action="close-modal">Cancelar</button><button type="submit" class="btn-primary-custom"><i class="bi bi-check2"></i> Guardar producto</button></div></form>`);
  }

  function openSettingsModal() {
    const endpoint = SheetsAPI.getEndpoint();
    showModal('Conectar Google Sheets', 'CONFIGURACIÓN', `<form id="settings-form"><div class="form-field"><label for="sheets-url">URL de Apps Script (/exec)</label><input id="sheets-url" name="endpoint" class="form-control-custom" type="url" value="${escapeHtml(endpoint)}" placeholder="https://script.google.com/macros/s/…/exec"></div>
      <p class="muted mt-2 mb-3" style="font-size:11px;line-height:1.6">Pega aquí la URL obtenida al implementar el archivo <strong>Code.gs</strong> como aplicación web. Los datos seguirán guardándose en este dispositivo cuando no haya conexión.</p>
      <div class="warning-note mb-3"><strong>Importante:</strong> los roles de esta interfaz solo ocultan opciones; no son un sistema de autenticación. No publiques el enlace de una hoja con datos sensibles ni permitas acceso público sin revisar los permisos.</div>
      <div class="form-actions"><button type="button" class="btn-secondary-custom" data-action="clear-sheets"><i class="bi bi-link-45deg"></i> Desconectar</button><button type="button" class="btn-secondary-custom" data-action="test-sheets"><i class="bi bi-arrow-repeat"></i> Probar</button><button type="button" class="btn-secondary-custom" data-action="migrate-local"><i class="bi bi-cloud-upload"></i> Importar local</button><button type="submit" class="btn-primary-custom">Guardar conexión</button></div>
      <div class="mt-3" style="font-size:10px;color:var(--muted)">La instalación PWA requiere publicar la web por HTTPS, por ejemplo mediante GitHub Pages.</div></form>`);
  }

  function toast(message, isError = false) {
    const region = $('#toast-region');
    if (!region) return;
    const item = document.createElement('div');
    item.className = 'toast-message' + (isError ? ' error' : '');
    item.textContent = message;
    region.appendChild(item);
    window.setTimeout(() => item.remove(), 5200);
  }

  function updateConnectionBadge(status = state.remoteStatus) {
    state.remoteStatus = status;
    const pill = $('#connection-indicator');
    const label = $('#connection-label');
    if (!pill || !label) return;
    pill.classList.toggle('connected', status === 'connected');
    pill.classList.toggle('warning', status === 'warning');
    label.textContent = status === 'connected' ? 'Sheets' : status === 'warning' ? 'Sin conexión' : 'Local';
    pill.title = status === 'connected' ? 'Google Sheets sincronizado recientemente' : status === 'warning' ? 'No se pudo confirmar la conexión con Sheets' : 'Guardado en este dispositivo';
  }

  function verifyPayload(payload, snapshot) {
    if (!snapshot) return false;
    const data = payload.data || {};
    if (payload.action === 'saveProduct') {
      const found = snapshot.products.find((p) => p.id === data.id);
      return Boolean(found && found.name === data.name && Math.abs(Number(found.price) - Number(data.price)) < 0.011 && Math.abs(Number(found.stock) - Number(data.stock)) < 0.011);
    }
    if (payload.action === 'deleteProduct') return !snapshot.products.some((p) => p.id === data.id);
    if (payload.action === 'createMovement') return snapshot.movements.some((m) => m.id === data.id);
    return false;
  }

  function enqueuePending(payload) {
    const index = state.pendingWrites.findIndex((item) => item.action === payload.action && item.data?.id === payload.data?.id);
    if (index >= 0) state.pendingWrites[index] = payload;
    else state.pendingWrites.push(payload);
    persist();
  }

  async function syncFromSheets(showMessage = false) {
    if (!SheetsAPI.getEndpoint()) {
      updateConnectionBadge('local');
      if (showMessage) toast('Conexión no configurada. Los datos siguen guardados en este dispositivo.', true);
      return false;
    }
    try {
      let snapshot = await SheetsAPI.readSnapshot();
      if (!snapshot || !Array.isArray(snapshot.products) || !Array.isArray(snapshot.movements)) throw new Error('La respuesta no contiene inventario y movimientos.');

      if (state.pendingWrites.length) {
        const pending = [...state.pendingWrites];
        for (const item of pending) {
          const sent = await SheetsAPI.write(item);
          if (!sent.sent) throw new Error('No se pudo volver a enviar una operación pendiente.');
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1300));
        snapshot = await SheetsAPI.readSnapshot();
        const stillPending = pending.filter((item) => !verifyPayload(item, snapshot));
        state.pendingWrites = stillPending;
        if (stillPending.length) {
          persist(); updateConnectionBadge('warning');
          if (showMessage) toast(`${stillPending.length} operación(es) siguen sin confirmarse. Tus datos locales se conservaron.`, true);
          return false;
        }
      }

      // No sobrescribir registros locales si la hoja recién conectada aún está vacía.
      if (snapshot.products.length === 0 && snapshot.movements.length === 0 && (state.products.length > 0 || state.movements.length > 0)) {
        updateConnectionBadge('warning');
        if (showMessage) toast('La hoja está vacía. Tus datos locales se conservaron; puedes importarlos desde Configuración.', true);
        return false;
      }
      state.products = snapshot.products;
      state.movements = snapshot.movements;
      persist();
      updateConnectionBadge('connected');
      render();
      if (showMessage) toast('Sincronización completada con Google Sheets.');
      return true;
    } catch (error) {
      console.warn('Sincronización con Sheets fallida:', error);
      updateConnectionBadge('warning');
      if (showMessage) toast('No se pudo leer Google Sheets. Verifica URL, permisos y conexión.', true);
      return false;
    }
  }

  async function sendToSheets(payload, label) {
    if (!SheetsAPI.getEndpoint()) {
      updateConnectionBadge('local');
      toast(`${label} guardada en este dispositivo. Configura Google Sheets para sincronizar.`);
      return;
    }
    const result = await SheetsAPI.write(payload);
    if (!result.sent) {
      enqueuePending(payload);
      updateConnectionBadge('warning');
      toast(`${label} guardada localmente. Se intentará sincronizar después.`, true);
      return;
    }
    toast(`${label} guardada localmente. Verificando Google Sheets…`);
    window.setTimeout(async () => {
      try {
        const snapshot = await SheetsAPI.readSnapshot();
        if (verifyPayload(payload, snapshot)) {
          state.products = snapshot.products;
          state.movements = snapshot.movements;
          state.pendingWrites = state.pendingWrites.filter((item) => !(item.action === payload.action && item.data?.id === payload.data?.id));
          persist(); updateConnectionBadge('connected'); render();
          toast('Cambio confirmado en Google Sheets.');
        } else {
          enqueuePending(payload);
          updateConnectionBadge('warning');
          toast('No se confirmó el cambio en Sheets. Tus datos locales se conservaron; revisa la conexión.', true);
        }
      } catch (error) {
        enqueuePending(payload);
        updateConnectionBadge('warning');
        toast('No se pudo verificar Google Sheets. El cambio queda guardado localmente.', true);
      }
    }, 1700);
  }

  async function migrateLocalToSheets() {
    if (!SheetsAPI.getEndpoint()) { toast('Primero guarda la URL de Apps Script.', true); return; }
    try {
      const remote = await SheetsAPI.readSnapshot();
      if (remote.products.length || remote.movements.length) {
        toast('La hoja ya contiene datos. La importación se canceló para evitar duplicados.', true);
        return;
      }
      if (!state.products.length && !state.movements.length) { toast('No hay datos locales para importar.'); return; }
      const productIds = new Set(state.products.map((p) => p.id));
      const missingHistoryProducts = [...new Set(state.movements.filter((m) => !productIds.has(m.productId)).map((m) => m.productName || m.productId))];
      if (missingHistoryProducts.length) { toast('No se puede importar automáticamente: hay movimientos de productos eliminados (' + missingHistoryProducts.slice(0, 3).join(', ') + '). Exporta el JSON y revisa esos registros antes de importar.', true); return; }
      toast('Importando datos locales a Google Sheets…');
      const baseProducts = state.products.map((p) => {
        const buys = state.movements.filter((m) => m.productId === p.id && m.type === 'COMPRA').reduce((sum, m) => sum + Number(m.quantity || 0), 0);
        const sales = state.movements.filter((m) => m.productId === p.id && m.type === 'VENTA').reduce((sum, m) => sum + Number(m.quantity || 0), 0);
        return { ...p, stock: Math.max(0, Number(p.stock) - buys + sales) };
      });
      const writes = [
        ...baseProducts.map((p) => ({ action: 'saveProduct', data: p })),
        ...[...state.movements].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((m) => ({ action: 'createMovement', data: m }))
      ];
      for (const item of writes) {
        const response = await SheetsAPI.write(item);
        if (!response.sent) throw new Error('La red falló al enviar una operación.');
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1800));
      const finalSnapshot = await SheetsAPI.readSnapshot();
      if (finalSnapshot.products.length !== state.products.length || finalSnapshot.movements.length !== state.movements.length) {
        updateConnectionBadge('warning');
        toast('La importación quedó incompleta. Revisa las hojas Productos y Movimientos antes de volver a intentarlo.', true);
        return;
      }
      state.products = finalSnapshot.products;
      state.movements = finalSnapshot.movements;
      state.pendingWrites = [];
      persist(); updateConnectionBadge('connected'); closeModal(); render();
      toast('Datos locales importados a Google Sheets.');
    } catch (error) {
      console.error(error);
      updateConnectionBadge('warning');
      toast('No se pudo importar. Revisa la URL y los permisos de Apps Script.', true);
    }
  }

  function exportJson() {
    const report = {
      application: 'Gestión Comercial PWA',
      exportedAt: new Date().toISOString(),
      currency: 'BOB',
      products: state.products,
      movements: [...state.movements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-comercial-${localDateKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast('Reporte JSON descargado.');
  }

  function findProduct(id) { return state.products.find((product) => product.id === id); }

  function onClick(event) {
    const nav = event.target.closest('[data-nav]');
    if (nav) { go(nav.getAttribute('data-nav')); return; }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.getAttribute('data-action');
    const id = button.getAttribute('data-id');
    if (action === 'close-modal') closeModal();
    if (action === 'new-product') openProductModal();
    if (action === 'edit-product') openProductModal(findProduct(id));
    if (action === 'delete-product') {
      const product = findProduct(id);
      if (!canManage() || !product) return;
      const linked = state.movements.some((m) => m.productId === id);
      const message = linked ? `El producto “${product.name}” tiene movimientos históricos. ¿Eliminarlo del inventario? Los movimientos se conservarán.` : `¿Eliminar “${product.name}” del inventario?`;
      if (window.confirm(message)) {
        state.products = state.products.filter((p) => p.id !== id);
        persist(); render();
        void sendToSheets({ action: 'deleteProduct', data: { id } }, 'Producto eliminado');
      }
    }
    if (action === 'cart-add') addToCart(id, 1);
    if (action === 'cart-increase') addToCart(id, 1);
    if (action === 'cart-decrease') addToCart(id, -1);
    if (action === 'export-json') exportJson();
    if (action === 'clear-sheets') {
      SheetsAPI.setEndpoint(''); updateConnectionBadge('local'); closeModal(); toast('Conexión con Sheets desconectada. Los datos locales se conservan.');
    }
    if (action === 'test-sheets') {
      const url = $('#sheets-url')?.value.trim();
      try { SheetsAPI.setEndpoint(url); }
      catch (error) { toast(error.message, true); return; }
      void syncFromSheets(true);
    }
    if (action === 'migrate-local') void migrateLocalToSheets();
  }

  function addToCart(id, delta = 1) {
    const product = findProduct(id);
    if (!product) return;
    const found = state.cart.find((item) => item.productId === id);
    const nextQuantity = (found ? found.quantity : 0) + delta;
    if (nextQuantity > Number(product.stock)) { toast('No hay suficiente stock para esa cantidad.', true); return; }
    if (nextQuantity <= 0) state.cart = state.cart.filter((item) => item.productId !== id);
    else if (found) found.quantity = nextQuantity;
    else state.cart.push({ productId: id, quantity: nextQuantity });
    render();
  }

  function onSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.id === 'product-form') {
      event.preventDefault();
      if (!canManage()) return;
      const data = new FormData(form);
      const id = String(data.get('id') || '').trim();
      const name = String(data.get('name') || '').trim();
      const price = Number(data.get('price'));
      const costPrice = Number(data.get('costPrice') || 0);
      const stock = Number(data.get('stock') || 0);
      const minStock = Number(data.get('minStock') || 0);
      if (!name || !Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || stock < 0 || !Number.isFinite(costPrice) || costPrice < 0 || !Number.isFinite(minStock) || minStock < 0) {
        toast('Revisa el nombre, los precios y las cantidades del producto.', true); return;
      }
      const product = { id: id || uid(), name, category: String(data.get('category') || 'General').trim() || 'General', price, costPrice, stock, minStock, updatedAt: new Date().toISOString() };
      const existingIndex = state.products.findIndex((p) => p.id === product.id);
      if (existingIndex >= 0) state.products[existingIndex] = product;
      else state.products.unshift(product);
      persist(); closeModal(); render();
      void sendToSheets({ action: 'saveProduct', data: product }, 'Producto');
    }

    if (form.id === 'sale-form') {
      event.preventDefault();
      if (!canSell() || !state.cart.length) return;
      for (const item of state.cart) {
        const p = findProduct(item.productId);
        if (!p || Number(p.stock) < item.quantity) { toast(`Stock insuficiente para ${p?.name || 'uno de los productos'}.`, true); return; }
      }
      const data = new FormData(form);
      const paymentMethod = String(data.get('paymentMethod') || 'EFECTIVO');
      const notes = String(data.get('notes') || '').trim();
      const movements = [];
      state.cart.forEach((item) => {
        const product = findProduct(item.productId);
        if (!product) return;
        const quantity = Number(item.quantity);
        const movement = { id: uid(), type: 'VENTA', productId: product.id, productName: product.name, quantity, unitPrice: Number(product.price), total: Number((Number(product.price) * quantity).toFixed(2)), paymentMethod, notes, createdAt: new Date().toISOString(), userRole: state.role };
        product.stock = Number((Number(product.stock) - quantity).toFixed(2));
        product.updatedAt = new Date().toISOString();
        state.movements.unshift(movement);
        movements.push(movement);
      });
      state.cart = [];
      persist(); render();
      void (async () => {
        for (const movement of movements) await sendToSheets({ action: 'createMovement', data: movement }, 'Venta');
      })();
    }

    if (form.id === 'purchase-form') {
      event.preventDefault();
      if (!canPurchase()) return;
      const data = new FormData(form);
      const product = findProduct(String(data.get('productId') || ''));
      const quantity = Number(data.get('quantity'));
      const unitPrice = Number(data.get('unitPrice'));
      if (!product || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) { toast('Verifica el producto, la cantidad y el costo unitario.', true); return; }
      const movement = { id: uid(), type: 'COMPRA', productId: product.id, productName: product.name, quantity, unitPrice, total: Number((quantity * unitPrice).toFixed(2)), paymentMethod: String(data.get('paymentMethod') || 'EFECTIVO'), notes: String(data.get('notes') || '').trim(), createdAt: new Date().toISOString(), userRole: state.role };
      product.stock = Number((Number(product.stock) + quantity).toFixed(2));
      product.costPrice = unitPrice;
      product.updatedAt = new Date().toISOString();
      state.movements.unshift(movement);
      persist(); render();
      void sendToSheets({ action: 'createMovement', data: movement }, 'Compra');
      toast(`Compra registrada: +${number(quantity)} unidades de ${product.name}.`);
    }

    if (form.id === 'settings-form') {
      event.preventDefault();
      try {
        const url = SheetsAPI.setEndpoint(new FormData(form).get('endpoint'));
        closeModal();
        if (!url) { updateConnectionBadge('local'); toast('Conexión no configurada.'); }
        else { toast('URL guardada. Probando sincronización…'); void syncFromSheets(true); }
      } catch (error) { toast(error.message, true); }
    }
  }

  function onInput(event) {
    if (event.target.matches('[data-search-products]')) {
      state.productSearch = event.target.value;
      const grid = $('#product-grid');
      if (grid) {
        const filtered = state.products.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(state.productSearch.toLowerCase()));
        grid.outerHTML = filtered.length ? `<div class="product-grid" id="product-grid">${filtered.map((p) => productCard(p)).join('')}</div>` : emptyState('bi-search', 'No encontramos productos', 'Prueba otra búsqueda o agrega un producto al inventario.');
      } else {
        const main = $('#app-main');
        const input = $('#product-search');
        main.innerHTML = renderProducts();
        const newInput = $('#product-search');
        if (newInput) { newInput.focus(); newInput.setSelectionRange(state.productSearch.length, state.productSearch.length); }
      }
    }
    if (event.target.matches('[data-search-sales]')) {
      state.salesSearch = event.target.value;
      const main = $('#app-main');
      main.innerHTML = renderSales();
      const newInput = $('#sales-search');
      if (newInput) { newInput.focus(); newInput.setSelectionRange(state.salesSearch.length, state.salesSearch.length); }
    }
  }

  function setRole(role) {
    if (!['cliente', 'empleado', 'gerente'].includes(role)) return;
    state.role = role;
    localStorage.setItem(ROLE_KEY, role);
    state.cart = [];
    state.view = navItems().some((item) => item.id === state.view) ? state.view : 'dashboard';
    toast(`Vista de demostración: ${roleNames[role]}. Esto no es autenticación real.`);
    render();
  }

  function init() {
    $('#today-label').textContent = dateLong().toUpperCase();
    $('#role-switch').value = state.role;
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('input', onInput);
    $('#role-switch').addEventListener('change', (event) => setRole(event.target.value));
    $('#settings-button').addEventListener('click', openSettingsModal);
    $('#modal-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
    render();
    window.AppUI = { toast, go, sync: () => syncFromSheets(true) };
    if (SheetsAPI.getEndpoint()) void syncFromSheets(false);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
