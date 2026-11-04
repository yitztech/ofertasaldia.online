# Estado y relevo del backend

## Revisión 2026-11-01 (09:10, revisión independiente del trabajo anterior)

Lo que se comprobó (hechos, con evidencia), y el estado de cierre de cada punto.

### Estado real

| Punto | Estado original (2026-11-01) | Estado actual comprobado (2026-11-04) |
|---|---|---|
| PR #4 | Fusionado en `main` (`c46aaf7`) con `Verificar` en rojo por `mailpit` corriendo como root | **RESUELTO** desde PR #5 y PRs subsecuentes (#6–#18): `mailpit` corre con `user: "65534:65534"`, perfil `solo-pruebas` y etiqueta `ofertasaldia.solo-pruebas: "true"` en `compose.ci.yml`. |
| CI en `main` | Rojo en `Verificar` | **VERDE** en `Verificar`, `Escenarios`, `Base de datos` y `Seguridad` en todos los merges posteriores (PRs #6–#18). |
| Riesgo de memoria Argon2 en 384 MB | Abierto como bloqueante #3 | **CERRADO Y VERIFICADO** en `services/api/src/auth.ts` (líneas 80–103) y validado en cada CI por `tests/api/hardening.cjs` (12 logins concurrentes con RSS ~59 MiB sobre límite de 384 MiB). |
| Typecheck web/API/admin | Correcto | Correcto (`pnpm typecheck` en todos los workspaces). |

**Causa original del rojo (resuelta)**: la prueba de humo recorre `docker compose -f compose.prod.yml ps --services`, que incluye `mailpit` de `compose.ci.yml`, y `axllent/mailpit:v1.28` corría por defecto como root (`id -u` = 0). Se corrigió fijando `user: "65534:65534"` en `compose.ci.yml` y `compose.dev.yml`.

### Bloqueantes de la revisión original — Estado: TODOS CERRADOS

1. **[CERRADO — PR #5] Arreglar `Verificar`**: En `compose.ci.yml` y `compose.dev.yml`, `mailpit` corre con `user: "65534:65534"` (puertos 1025/8025 sin privilegios) y lleva `profiles: ["solo-pruebas"]` y etiqueta `ofertasaldia.solo-pruebas: "true"`, verificado automáticamente por `scripts/check-test-only.mjs`.
2. **[CERRADO — PR #5 en adelante] Flujo de PR con checks en verde**: Todos los cambios posteriores (PRs #5 a #18) se integraron con las suites de CI en verde.
3. **[CERRADO Y CONFIRMADO — PR #6 (`services/api/src/auth.ts:80-103` y `tests/api/hardening.cjs:79-85`)] Riesgo de memoria en login (OOM por Argon2id en 384 MB)**:
   - **Problema original**: `login` ejecutaba dos operaciones Argon2id por petición (`hash(randomBytes)` de relleno + `verify`) con ~64 MiB cada una por defecto, pudiendo agotar los 384 MB del contenedor ante logins concurrentes.
   - **Solución implementada en `services/api/src/auth.ts` (líneas 80–103)**:
     1. **Parámetros Argon2id ajustados al mínimo seguro OWASP**: `argonOptions = { memoryCost: 19456, timeCost: 2, parallelism: 1 }` (~19 MiB por operación en lugar de 64 MiB).
     2. **Hash de relleno único en caché (`fallbackHash` / `dummyHash()`)**: El hash señuelo para mitigar ataques de enumeración por tiempo se calcula **una sola vez** y se reutiliza en memoria, eliminando el segundo cálculo de Argon2 por petición cuando el correo no existe.
     3. **Semáforo de concurrencia (`withArgon`, máximo 2 operaciones simultáneas)**: `argonActive` limita a **2** las ejecuciones nativas simultáneas de Argon2id y encola el resto en `argonQueue`. El pico máximo de memoria nativa de Argon2 queda acotado a `2 × 19 MiB ≈ 38 MiB`.
     4. **Presupuesto de memoria del contenedor (`compose.prod.yml` y `services/api/Dockerfile`)**: Con `mem_limit: 384m` y `NODE_OPTIONS=--max-old-space-size=192` (192 MiB máximo de heap V8 + ~38 MiB pico nativo Argon2 + ~25 MiB base), el consumo medido bajo ráfaga es de **~59 MiB RSS** (15 % del límite de 384 MB).
   - **Evidencia automatizada en CI**: `tests/api/hardening.cjs` (líneas 79–85) lanza 12 peticiones `POST /api/auth/login` simultáneas en cada ejecución del job `Verificar` contra el contenedor de producción con límite de 384 MB, comprobando que las 12 responden `401` y `/api/health` responde `200` sin OOM.
4. **[CERRADO — PR #6 y PR #8] Límite de intentos global por error**: En `services/api/src/auth.ts`, `reset` y el inicio de OAuth limitan intentos únicamente por IP (`[ip]`), el login estructura la tupla como `[ip, "${ip}:${email}"]` para evitar bloqueo cruzado de cuentas desde otra IP, solo se contabilizan los fallos de credenciales (`recordFailedLogin`), y la extracción de IP en `services/api/src/http.ts` ignora cadenas vacías en `x-real-ip` antes de caer a `x-forwarded-for` / `request.ip`.

### Incumplimientos de AGENTS.md encontrados originalmente — Estado: TODOS CERRADOS

- **[CERRADO — PR #6]** §22: todos los errores `422` devuelven Problem Details (RFC 9457) con `errors[]` (`field`, `code`, `message`) y diccionario de errores por campo.
- **[CERRADO — PR #6]** §30: el hook global de Fastify en `services/api/src/main.ts` emite log JSON estructurado por petición (`method`, `path`, `status`, `durationMs`, `requestId`) y devuelve siempre la cabecera `X-Request-ID`.
- **[CERRADO — PR #8 y PR #13]** §24: el límite de intentos de login solo cuenta fallos (`recordFailedLogin`), limpia el contador al autenticar (`clearLoginFailures`) y envía aviso de seguridad por correo al bloquearse.
- **[CERRADO — PR #7]** §33/§32: especificación OpenAPI 3.1 completa en `/api/openapi.json` y `docs/openapi.json`, validada por `tests/api/openapi-contract.cjs`, más pruebas sistemáticas de autorización en `tests/api/authorization.cjs`.
- **[CERRADO — PR #7 y PR #9]** Parte 3 (§35–§40): suites `tests/db/` (migraciones, privilegios `ofertas_app`, paridad de longitudes §6.3), `scripts/check-test-only.mjs`, scripts estandarizados `npm test`, `npm run test:unit|api|endpoints|security|db` y jobs dedicados en CI.
- **[CERRADO — PR #7]** §21: generador UUIDv7 (RFC 9562) en `services/api/src/uuid.ts` utilizado en todas las tablas y entidades nuevas.
- **[CERRADO — PR #8]** Pool PostgreSQL en `services/api/src/database.ts` ajustado a `max: 8`, `connectionTimeoutMillis: 2500` y `statement_timeout: 2000`, verificado bajo concurrencia en `tests/api/maintenance.cjs`.
- **[CERRADO — PR #7]** UX OAuth: errores y cancelaciones en el callback redirigen a `/entrar?error=<código>` con alerta accesible en lugar de devolver JSON crudo al navegador.

### Avance (rama `fix/api-endurecimiento`, PR #6)

Hecho y probado en local con el compose de producción + CI (`tests/api/hardening.cjs`, además de oauth/recovery/production-proxy): Argon2id con mínimos OWASP, hash de relleno único y máximo 2 hashes simultáneos (12 logins concurrentes: todos 401, API a ~59 MiB de 384); límite de intentos solo por IP en `reset`/OAuth y `x-real-ip` vacío; `errors[]` por campo en los 422 de auth; `X-Request-ID` y log JSON por petición.

### Avance (rama `feat/redireccion-portada-sesion`)

- Redirección tras registro e inicio de sesión: redirigen a la portada (`/`) con cookie de sesión activa (`Set-Cookie`). Si el login recibe `next=/admin/`, preserva la redirección al admin.
- Portada y afiliado (`portada.tsx`, `afiliado.tsx`): leen la sesión vía `obtenerUsuario(request)` llamando a `/api/auth/me`. Si el usuario está autenticado, la cabecera muestra `MenuUsuario` (enlazando al panel `/panel`) en lugar de `BotonesCuenta` ("Iniciar sesión" / "Regístrate").
- API (`services/api/src/auth.ts`, `oauth.ts`): `register` crea la sesión en base de datos y setea la cookie al crear el usuario. El callback de OAuth redirige a `/`.
- Pruebas actualizadas y añadidas:
  - `tests/api/production-proxy.cjs`: valida redirección a `/` y cookie `__Host-session` en registro y login.
  - `tests/api/recovery.cjs`: valida que `register` genera sesión y cookie.
  - `tests/e2e/forms.cjs`: valida en navegador que registro y login redirigen a `/`, muestran la cuenta en cabecera ("Cuenta de María Pérez") y permiten entrar al panel desde ella.

### Avance (rama `feat/estandares-openapi-auth-ux`, PR #7)

- **UUIDv7 (§21)**: Implementado generador centralizado RFC 9562 con fallback nativo (`services/api/src/uuid.ts`). Reemplazado `randomUUID()` (v4) en creación de usuarios, suscripciones, registros de auditoría y solicitudes.
- **UX en Callback de OAuth**: Ante errores o cancelaciones en flujos iniciados desde el navegador, redirige a `/entrar?error=<código>` en lugar de emitir un error JSON plano. `apps/web/app/routes/entrar.tsx` maneja el estado mostrando alertas claras y accesibles (`role="alert"`).
- **Especificación y Contrato OpenAPI 3.1 (§33/§32)**:
  - Documentación completa de endpoints, esquemas y Problem Details (RFC 9457) expuesta en `/api/openapi.json` y respaldada en `docs/openapi.json`.
  - Nueva prueba automatizada `tests/api/openapi-contract.cjs` que valida el contrato contra el esquema y el endpoint vivo.
- **Pruebas Sistemáticas de Autorización (§32)**:
  - Nueva prueba `tests/api/authorization.cjs`: verifica respuestas 401 para peticiones anónimas a rutas protegidas y 403 para usuarios sin rol de administración en `/api/admin/*`.
- **Estructura de Pruebas y Scripts de Plataforma (Parte 3, §35–§37)**:
  - `scripts/check-test-only.mjs`: comprueba que ningún servicio exclusivo de pruebas (`mailpit`) se filtre a `compose.prod.yml`, Dockerfiles o workflows de despliegue.
  - `package.json` raíz y `scripts/test-all.mjs`: comandos estandarizados `npm test`, `npm run test:unit`, `npm run test:api`, `npm run typecheck` con resumen de ejecución y tiempos.
- Verificación completa en local con Docker Compose (`compose.dev.yml`), suites de API y E2E Chromium (`tests/e2e/forms.cjs` con 17 comprobaciones exitosas).

---

Actualizado: 2026-11-04. Rama: `fix/produccion-stripe-y-relevo`, basada en `origin/main` (`08d2218`). No interpretar los archivos de diseño sin seguimiento como código entregado.

## Implementado

- API NestJS 12.3.2/Fastify 5.12.7, PostgreSQL, migraciones 1–16 transaccionales con bloqueo asesor, salud (`/healthz` y `/api/health`) y apagado ordenado.
- Registro con verificación de correo (`/verificar-correo`), acceso con Argon2id acotado en memoria (máx. 2 hashes concurrentes de 19 MiB y hash señuelo en caché), sesiones hash/cookies HttpOnly, logout, recuperación y cambio de contraseña con tokens de una hora y consumo único; revocación de sesiones al restablecer.
- Correo SMTP en cola PostgreSQL pg-boss con reintentos; Mailpit solo en desarrollo/CI (`user: "65534:65534"`, perfil `solo-pruebas`).
- Google/Apple OAuth con estado de un uso, nonce, PKCE Google, firmas OIDC, callback POST Apple y flujo explícito de vinculación de identidades existentes mediante contraseña. Sin credenciales, acceso desactivado.
- Catálogo persistente en PostgreSQL con sincronización e inspección en vivo de precios contra Mercado Libre (`MeliSyncService`), historial de precios de 90 días (`price_history`), ficha detallada de producto (`/oferta/:slugId` y `/c/:alias/:slugId`), buscador avanzado con sugerencias en tiempo real (`/buscar` y `GET /api/buscar/sugerencias`), códigos de cupón de tienda y persistencia de favoritos (`favorites`).
- Perfiles públicos de creadores (`/c/:alias`), redirección con analítica de clics reales (`/ir/:id` y `click_events`), panel de creador (`/panel`) conectado a PostgreSQL y páginas legales (`/terminos` y `/privacidad`) con divulgación de afiliados PROFECO/FTC.
- Suscripciones Plan Pro ($299 MXN/mes) mediante Stripe Checkout (`POST /api/payments/checkout-session`), validación y redención de cupones promocionales (`promo_coupons`, `coupon_redemptions`), webhooks firmados con HMAC-SHA256 e idempotencia (`POST /api/public/v1/webhooks/payments`) y cancelación directa (`POST /api/payments/cancel`). En producción (`NODE_ENV=production`), el modo simulado (`stripe_simulated`) está desactivado, las suscripciones simuladas previas quedan revocadas (migración 16) y la ausencia de `STRIPE_SECRET_KEY` o `STRIPE_WEBHOOK_SECRET` responde `503 Service Unavailable` (`payment_unavailable`).
- Administrador independiente React/shadcn en `/admin/`: estadísticas reales, usuarios, productos, cupones promocionales, activación manual de planes, sincronización de catálogo, purga de mantenimiento, suspensión/reactivación y auditoría.
- Compose dev y prod; nginx como entrada única. En producción ningún servicio publica puertos y Traefik conecta solo al gateway. PostgreSQL tiene rol de aplicación `ofertas_app` sin superusuario.

## Evidencia ejecutada localmente

- Typecheck de web/API/admin y compilaciones API/admin correctos; las imágenes también compilan la web.
- Trivy sobre las cinco imágenes: sin HIGH/CRITICAL con corrección disponible.
- Hadolint: Dockerfiles API, admin y PostgreSQL correctos.
- Reglas de plataforma sobre `compose.prod.yml` (`.github/scripts/reglas-compose.sh`): correctas; ningún `ports:`/`build:`, todos los servicios con límites, hardening y healthcheck.
- Suites de pruebas automatizadas (`npm test` / `scripts/test-all.mjs`): pruebas unitarias, contrato OpenAPI 3.1 (`openapi-contract.cjs`), autorización (`authorization.cjs`), endurecimiento y concurrencia Argon2 (`hardening.cjs`), recuperación (`recovery.cjs`), mantenimiento (`maintenance.cjs`), catálogo (`catalog.cjs`), pagos, cupones y webhooks (`payments.cjs`), características de producto (`product-features.cjs`) y base de datos (`tests/db/`).

## Preparación real de producción

Se consultó Coolify sin exponer valores: ya tenía dominio, SMTP y remitente. Se añadieron `POSTGRES_PASSWORD` y `APP_DATABASE_PASSWORD`, sin reiniciar aplicación. Copias locales 0600: `~/.ansible/secretos-clientes/ofertasaldia/app_postgres_root` y `app_postgres_app`. No guardarlas en Git.

La cuenta inicial de administrador se crea registrando un correo controlado y ejecutando `node dist/cli-admin.js <correo>` en la consola autorizada de la API. No hay contraseña predeterminada ni promociones públicas.

## Pendientes operativos en el entorno de producción (Coolify)

- **Secretos de Stripe en Coolify**: Cargar `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` en las variables de entorno del proyecto en Coolify y registrar el endpoint HTTPS `/api/public/v1/webhooks/payments` en el panel de Stripe. Mientras no estén definidas en producción, los endpoints de cobro y webhook responden de forma segura `503 Service Unavailable` (`payment_unavailable`).
- **Proveedores OAuth en vivo**: Configurar `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` y credenciales de Apple en Coolify con sus callbacks HTTPS autorizados (`docs/OAUTH.md`).
- **Verificación de recepción SMTP externa y backups remotos**: Comprobar tras el despliegue la recepción de correos en bandejas externas (Gmail/Outlook) y la ejecución periódica de backups remotos del volumen `postgres-data` en el VPS.
- **Alcance de métricas de afiliados**: Los clics registrados en `/ir/:id` (`click_events`) miden redirecciones verificadas a las tiendas y no constituyen liquidaciones de ventas ni comisiones confirmadas por Amazon o Mercado Libre.

## Continuación y bitácora de sesiones

Guía de operación: `docs/DESPLIEGUE-BACKEND.md`. OAuth: `docs/OAUTH.md`. Plan de seguridad por sesiones: `docs/PLAN-SEGURIDAD.md`. Ejecutar E2E desde la raíz con `node tests/e2e/forms.cjs` después de instalar Playwright en `tests/e2e` y arrancar el Compose dev. Nunca apuntar la prueba con fixtures de administrador a producción.

### Sesión 1 de Seguridad completada (2026-11-02, PR #8)
- **Rate limiting anti-DoS**: Clave de intentos estructurada por tupla `[ip, ip:cuenta]` en `services/api/src/auth.ts`. Los intentos fallidos solo se incrementan en fallos de credenciales (`recordFailedLogin`), y se limpian con `clearLoginFailures` tras autenticación correcta. Un atacante en una IP no puede bloquear la cuenta de una víctima en otra IP.
- **Registro anti-enumeración (409 Conflict)**: `POST /api/auth/register` responde 409 con RFC 9457 `account_already_exists` ante colisión de correo. `apps/web/app/routes/registro.tsx` muestra banner accesible con enlaces a `/entrar` y `/recuperar` y marca el campo de correo en rojo.
- **OpenAPI 3.1**: Respuestas `409 Conflict` agregadas a `services/api/src/openapi.ts` y `docs/openapi.json`.
- **Verificación**: `npm test` verde (unit, openapi, typecheck); pruebas en contenedor API (`hardening.cjs`, `recovery.cjs`, `authorization.cjs`, `oauth.cjs`) y Playwright E2E (`forms.cjs` con 18 checks) 100% pasando.

### Sesión 2 de Seguridad completada (2026-11-02, PR #8)
- **Purga periódica y al arranque**: `MaintenanceService` en `services/api/src/maintenance.ts` purga `auth_attempts`, `password_tokens`, `sessions` y `oauth_flows` vencidos en el arranque y programa tarea horaria recurrente en `pg-boss` (`0 * * * *`). Expuesto endpoint protegido `POST /api/admin/maintenance/purge` con registro en `admin_audit`.
- **Resiliencia de PostgreSQL**: Pool configurado en `services/api/src/database.ts` con `max: 8`, `connectionTimeoutMillis: 2500` y `statement_timeout: 2000`. Cero errores 500/503 bajo ráfagas concurrentes.
- **Verificación**: Nueva suite `tests/api/maintenance.cjs` (15 peticiones concurrentes y prueba de ciclo de vida de registros temporales); OpenAPI 3.1 actualizado; `npm test` y pruebas E2E pasando.

### Sesión de Estabilidad y Remediación de CVEs (2026-11-03, PR #11)
- **Mitigación Trivy en imágenes Alpine**: Actualizado `libexpat` a `>= 2.10.0-r0` en `gateway/Dockerfile` y `admin/Dockerfile` ante las vulnerabilidades HIGH `CVE-2026-117610` y `CVE-2026-118370`. Escaneo de Trivy 100% limpio (0 vulnerabilidades) y checks de CI en verde.

### Sesión de Catálogo Persistente y Sincronización Mercado Libre (2026-11-03, PR #12)
- **Migraciones 11 y 12 (`services/api/src/migrations.ts`)**:
  - Ampliada la tabla `products` con `external_id`, `affiliate_url`, `original_price_cents`, `discount_percentage`, `rating`, `reviews_count`, `status` y `last_checked_at`.
  - Nueva tabla `price_history` con identificadores UUIDv7 para registrar el comportamiento histórico de precios (base para el gráfico de 90 días).
  - Sembrados 12 productos verificados con datos reales de Mercado Libre / Amazon y 3 puntos históricos de precio por producto.
- **Servicio de Sincronización Mercado Libre (`services/api/src/meli.ts`)**:
  - `MeliSyncService`: cliente HTTP sin scraping para `api.mercadolibre.com` (`/items/{id}` y `/sale_price?context=channel_marketplace`), timeouts de 5s, traducción de estados (`active`, `paused`, `closed`) y cálculo de descuentos.
- **Controlador de Catálogo (`services/api/src/catalog.controller.ts`)**:
  - `GET /api/products`: listado enriquecido con categorías, descuentos, valoraciones y paginación por cursor.
  - `GET /api/products/:id`: detalle completo con colección ordenada de `priceHistory`.
  - `POST /api/products/:id/check-price`: comprobación y revalidación de precio en vivo contra Mercado Libre con registro en historial.
  - `POST /api/admin/catalog/sync`: sincronización por lotes protegida por rol de administración con registro en `admin_audit`.
- **Integración Frontend (`apps/web/app/servicios/catalogo.ts`)**:
  - Conexión dinámica con `GET /api/products` y `GET /api/categories` de la API, con fallback seguro a catálogo estático si la API no está disponible.
- **Calidad y Contratos**:
  - Especificación OpenAPI 3.1 y `docs/openapi.json` actualizados con nuevos esquemas y rutas.
  - Nueva suite automatizada `tests/api/catalog.cjs` añadida al runner central `scripts/test-all.mjs`.

### Sesión de Verificación de Correo, Vinculación OAuth, Creadores, Pagos y Producto (2026-11-03 a 2026-11-04, PRs #13–#18)
- **Verificación de correo y vinculación de identidades (PR #13)**: Tokens de verificación de correo en el registro (`email_verification_tokens`, `/verificar-correo`), vinculación explícita de cuentas OAuth con confirmación de contraseña y alerta por correo ante bloqueo de cuenta.
- **Perfiles de creadores, redirección `/ir/:id`, pagos Stripe y artículos (PRs #14 y #15)**: Migraciones 13 y 14 (`creator_profiles`, `collections`, `click_events`, `processed_webhook_events`, `articles`). Rutas públicas `/c/:alias`, redirección auditada `/ir/:id`, panel `/panel` conectado a PostgreSQL y servicio de pagos Stripe con webhooks HMAC idempotentes.
- **Ficha de producto, páginas legales, favoritos persistentes y buscador dedicado (PR #16)**: Rutas `/oferta/:slugId` y `/c/:alias/:slugId` con gráfica SVG de historial de 90 días y revalidación en vivo, páginas `/terminos` y `/privacidad`, endpoints `/api/favorites` conectados a la pestaña «Guardados» en `/panel` y buscador `/buscar` con autocompletado `/api/buscar/sugerencias`.
- **Identidad visual y cupones de descuento (PRs #17 y #18)**: Favicon oficial en `apps/web` y `apps/admin`; migración 15 (`promo_coupons`, `coupon_redemptions` y columnas `coupon_code`/`coupon_description` en `products`), validación de cupones en `/planes`, cancelación en `/panel` (`POST /api/payments/cancel`) y administración de cupones en `/admin/`.

### Sesión de Endurecimiento de Pagos en Producción y Cierre de Relevo (2026-11-04, PR #19)
- **Variables de Stripe en despliegue (`compose.prod.yml` y `.env.example`)**: Añadidas `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` al bloque `environment` del servicio `api` en `compose.prod.yml` y documentadas en `.env.example` y `docs/DESPLIEGUE-BACKEND.md`.
- **Desactivación del modo simulado y eliminación de secreto por defecto en producción (`services/api/src/payments.ts` y `services/api/src/main.ts`)**:
  - En producción (`NODE_ENV=production`), `createCheckoutSession` exige `STRIPE_SECRET_KEY` para cualquier cobro (`finalPriceCents > 0`) y lanza `503 Service Unavailable` (`payment_unavailable`) si no está configurada, sin caer jamás al modo `stripe_simulated`.
  - Eliminado el secreto por defecto en `handleWebhook`: si `STRIPE_WEBHOOK_SECRET` no está configurada, el webhook rechaza cualquier petición con `503 Service Unavailable` (`payment_unavailable`).
  - Validación en el arranque (`services/api/src/main.ts`): en producción, si se define una sola de las dos variables (`STRIPE_SECRET_KEY` o `STRIPE_WEBHOOK_SECRET`), el proceso termina de inmediato con un error explícito.
- **Revocación de suscripciones `stripe_simulated` (Migración 16 en `services/api/src/migrations.ts`)**:
  - La migración 16 revoca todas las filas existentes con `provider = 'stripe_simulated'` (`SET revoked_at = now(), updated_at = now()`).
  - Además, `getSubscription` filtra `provider IS DISTINCT FROM 'stripe_simulated'` cuando `NODE_ENV=production`.
- **Confirmación de cierre del bloqueante de memoria Argon2 en 384 MB**: Documentado y verificado en la sección superior de este relevo (`argonOptions` de 19 MiB, `fallbackHash` único en caché, semáforo `withArgon` con concurrencia máxima de 2 y prueba de ráfaga en `tests/api/hardening.cjs` con RSS ~59 MiB sobre 384 MiB).

Los archivos `.impeccable/`, `DESIGN.md`, `PRODUCT.md`, sus equivalentes en `apps/web` y `design/` ya estaban sin seguimiento; se preservaron y no forman parte del cambio.
