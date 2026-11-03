const assert = require("node:assert/strict");

const api = process.env.API_URL || "http://127.0.0.1:3001";
const site = process.env.SITE_URL || "http://localhost:8080";

(async () => {
  // 1. Comprobar disponibilidad de la API
  let available = false;
  try {
    const res = await fetch(api + "/api/health", { signal: AbortSignal.timeout(1500) });
    available = res.ok;
  } catch {
    available = false;
  }

  if (!available) {
    console.log("SKIP: API no disponible en " + api + " (la prueba de catálogo requiere el stack activo)");
    return;
  }

  // 2. Probar GET /api/categories
  const catRes = await fetch(api + "/api/categories");
  assert.equal(catRes.status, 200, "GET /api/categories debe responder 200");
  const catData = await catRes.json();
  assert.ok(Array.isArray(catData.items), "Categorías debe ser un array");
  assert.ok(catData.items.length >= 10, "Debe haber al menos 10 categorías");
  const electronica = catData.items.find((c) => c.id === "electronica");
  assert.ok(electronica && electronica.name === "Electrónica", "Debe existir categoría Electrónica");

  // 3. Probar GET /api/products (listado completo)
  const prodRes = await fetch(api + "/api/products");
  assert.equal(prodRes.status, 200, "GET /api/products debe responder 200");
  const prodData = await prodRes.json();
  assert.ok(Array.isArray(prodData.items), "Productos debe ser un array");
  assert.ok(prodData.items.length > 0, "Debe haber productos persistidos en la base de datos");

  const primerProducto = prodData.items[0];
  assert.ok(primerProducto.id, "El producto debe tener id");
  assert.ok(primerProducto.title, "El producto debe tener título");
  assert.ok(primerProducto.platform, "El producto debe tener plataforma");
  assert.ok(primerProducto.priceCents, "El producto debe tener precio en centavos (§21)");

  // 4. Probar filtros de GET /api/products
  // Filtro por categoría
  const filtroCatRes = await fetch(api + "/api/products?category=electronica");
  assert.equal(filtroCatRes.status, 200);
  const filtroCatData = await filtroCatRes.json();
  assert.ok(filtroCatData.items.every((p) => p.categoryId === "electronica"), "Todos los productos deben ser de electrónica");

  // Filtro por plataforma
  const filtroPlatRes = await fetch(api + "/api/products?platform=mercadolibre");
  assert.equal(filtroPlatRes.status, 200);
  const filtroPlatData = await filtroPlatRes.json();
  assert.ok(filtroPlatData.items.every((p) => p.platform === "mercadolibre"), "Todos deben ser de Mercado Libre");

  // Búsqueda por texto
  const filtroBusquedaRes = await fetch(api + "/api/products?q=Samsung");
  assert.equal(filtroBusquedaRes.status, 200);
  const filtroBusquedaData = await filtroBusquedaRes.json();
  assert.ok(filtroBusquedaData.items.some((p) => /samsung/i.test(p.title)), "Debe encontrar productos Samsung");

  // Validación de parámetros inválidos (422)
  const invalidLimitRes = await fetch(api + "/api/products?limit=999");
  assert.equal(invalidLimitRes.status, 422, "Límite > 100 debe responder 422");

  // 5. Probar GET /api/products/:id con historial de precios
  const detalleRes = await fetch(api + "/api/products/" + primerProducto.id);
  assert.equal(detalleRes.status, 200, "GET /api/products/:id debe responder 200");
  const detalleData = await detalleRes.json();
  assert.equal(detalleData.id, primerProducto.id);
  assert.ok(Array.isArray(detalleData.priceHistory), "Debe incluir priceHistory");
  assert.ok(detalleData.priceHistory.length > 0, "Debe tener al menos un registro en priceHistory");

  // Producto inexistente responde 404 RFC 9457
  const noExisteRes = await fetch(api + "/api/products/00000000-0000-0000-0000-000000000000");
  assert.equal(noExisteRes.status, 404, "Producto inexistente debe dar 404");
  const noExisteProb = await noExisteRes.json();
  assert.equal(noExisteProb.code, "product_not_found");

  // ID inválido responde 422
  const idInvalidoRes = await fetch(api + "/api/products/not-a-uuid");
  assert.equal(idInvalidoRes.status, 422, "ID inválido debe dar 422");

  // 6. Probar POST /api/products/:id/check-price (revalidación de precio)
  const checkRes = await fetch(api + "/api/products/" + primerProducto.id + "/check-price", {
    method: "POST",
    headers: { origin: site, "x-csrf": "1" },
  });
  assert.equal(checkRes.status, 200, "POST check-price debe responder 200");
  const checkData = await checkRes.json();
  assert.equal(checkData.status, "ok");
  assert.equal(checkData.productId, primerProducto.id);
  assert.ok(typeof checkData.currentPriceCents === "number", "currentPriceCents debe ser numérico");
  assert.ok(checkData.lastCheckedAt, "Debe registrar lastCheckedAt");

  // 7. Probar POST /api/admin/catalog/sync (permisos)
  // Sin sesión -> 401
  const anonSyncRes = await fetch(api + "/api/admin/catalog/sync", {
    method: "POST",
    headers: { origin: site, "x-csrf": "1" },
  });
  assert.equal(anonSyncRes.status, 401, "Sync sin sesión debe dar 401");

  console.log("PASS: Pruebas del catálogo y sincronización de Mercado Libre completadas con éxito");
})();
