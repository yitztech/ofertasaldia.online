const assert = require("node:assert/strict");

const api = process.env.API_URL || "http://127.0.0.1:3001";
const site = process.env.SITE_URL || "http://localhost:8080";

(async () => {
  let available = false;
  try {
    const res = await fetch(api + "/api/health", { signal: AbortSignal.timeout(1500) });
    available = res.ok;
  } catch {
    available = false;
  }

  if (!available) {
    console.log("SKIP: API no disponible en " + api + " (la prueba de favoritos y sugerencias requiere el stack activo)");
    return;
  }

  // 1. Probar sugerencias de búsqueda (/api/products/suggestions y /api/buscar/sugerencias)
  const sugRes = await fetch(api + "/api/products/suggestions?q=Samsung");
  assert.equal(sugRes.status, 200, "GET /api/products/suggestions debe responder 200");
  const sugData = await sugRes.json();
  assert.ok(Array.isArray(sugData.items), "items debe ser un array");
  assert.ok(sugData.items.length > 0, "Debe devolver sugerencias para Samsung");

  const sugEsRes = await fetch(api + "/api/buscar/sugerencias?q=Samsung");
  assert.equal(sugEsRes.status, 200, "GET /api/buscar/sugerencias debe responder 200");

  // 2. Probar filtros avanzados en GET /api/products
  const advRes = await fetch(api + "/api/products?minDiscount=15&sort=discount&status=active");
  assert.equal(advRes.status, 200, "GET /api/products con filtros avanzados debe responder 200");
  const advData = await advRes.json();
  assert.ok(Array.isArray(advData.items) && advData.items.length > 0, "Debe devolver productos con descuento >= 15%");
  assert.ok(
    advData.items.every((p) => (p.discountPercentage ?? 0) >= 15),
    "Todos los productos filtrados deben tener al menos 15% de descuento",
  );

  const testProduct = advData.items[0];

  // 3. Probar GET /api/favorites sin sesión -> 401
  const unauthFav = await fetch(api + "/api/favorites");
  assert.equal(unauthFav.status, 401, "GET /api/favorites sin sesión debe responder 401");

  // 4. Registrar usuario para probar persistencia de favoritos
  const email = `fav-user-${Date.now()}@example.com`;
  const regRes = await fetch(api + "/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1" },
    body: JSON.stringify({
      name: "Usuario Favoritos",
      email,
      password: "Password-1234!",
      termsAccepted: true,
    }),
  });
  assert.equal(regRes.status, 201, "Registro de usuario exitoso");
  const cookie = regRes.headers.get("set-cookie").split(";")[0];

  // 5. Verificar lista vacía inicial
  const initialFavRes = await fetch(api + "/api/favorites", {
    headers: { cookie },
  });
  assert.equal(initialFavRes.status, 200);
  const initialFav = await initialFavRes.json();
  assert.deepEqual(initialFav.items, []);
  assert.deepEqual(initialFav.productIds, []);

  // 6. Probar protección CSRF en POST /api/favorites/:productId
  const noCsrfRes = await fetch(`${api}/api/favorites/${testProduct.id}`, {
    method: "POST",
    headers: { cookie },
  });
  assert.equal(noCsrfRes.status, 403, "POST /api/favorites sin cabecera CSRF debe responder 403");

  // 7. Probar producto inexistente -> 404
  const notFoundRes = await fetch(`${api}/api/favorites/00000000-0000-0000-0000-000000000000`, {
    method: "POST",
    headers: { cookie, origin: site, "x-csrf": "1" },
  });
  assert.equal(notFoundRes.status, 404, "Guardar producto inexistente debe responder 404");

  // 8. Guardar producto en favoritos
  const saveRes = await fetch(`${api}/api/favorites/${testProduct.id}`, {
    method: "POST",
    headers: { cookie, origin: site, "x-csrf": "1" },
  });
  assert.equal(saveRes.status, 200, "POST /api/favorites/:id debe responder 200");
  const saveBody = await saveRes.json();
  assert.equal(saveBody.saved, true);
  assert.equal(saveBody.productId, testProduct.id);

  // 9. Verificar que aparece en GET /api/favorites
  const listRes = await fetch(api + "/api/favorites", {
    headers: { cookie },
  });
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.equal(listBody.items.length, 1, "Debe haber 1 producto guardado");
  assert.equal(listBody.items[0].id, testProduct.id);
  assert.deepEqual(listBody.productIds, [testProduct.id]);

  // 10. Eliminar producto de favoritos
  const delRes = await fetch(`${api}/api/favorites/${testProduct.id}`, {
    method: "DELETE",
    headers: { cookie, origin: site, "x-csrf": "1" },
  });
  assert.equal(delRes.status, 200, "DELETE /api/favorites/:id debe responder 200");
  const delBody = await delRes.json();
  assert.equal(delBody.saved, false);

  // 11. Verificar que la lista vuelve a estar vacía
  const afterDelRes = await fetch(api + "/api/favorites", {
    headers: { cookie },
  });
  const afterDelBody = await afterDelRes.json();
  assert.equal(afterDelBody.items.length, 0, "No debe quedar ningún favorito tras eliminar");

  console.log("PASS: Favoritos, buscador avanzado y sugerencias validados con éxito");
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
