# Estado y relevo del backend

## Revisión 2026-11-01 (09:10, revisión independiente del trabajo anterior)

Lo que se comprobó (hechos, con evidencia), y lo que cambia del plan de abajo.

### Estado real

| Punto | Lo que decía el plan | Estado comprobado |
|---|---|---|
| PR #4 | CI en curso, merge pendiente de aprobación | **Fusionado** en `main` (`c46aaf7`, 14:57 UTC) **sin revisiones** y con `Verificar` en **FAILURE**. El ruleset de `main` exige 1 aprobación del equipo y `Verificar`: se saltó con permisos de bypass. |
| CI en `main` | — | Rojo en el push (run 41318755627) y en el cron (41319733456). `Escenarios` pasa; `Verificar` falla; `Publicar` y `Desplegar` se omiten. |
| Producción | — | Sigue sirviendo `d1bc23f` (`/version.json`); `/api/health` responde 404. Nada del backend está publicado. |
| Typecheck web/API/admin | Correcto | Correcto otra vez (`pnpm typecheck` en los tres). |

**Causa del rojo**: la prueba de humo recorre `docker compose -f compose.prod.yml ps --services`, que incluye `mailpit` de
`compose.ci.yml`, y `axllent/mailpit:v1.28` corre como root (`id -u` = 0, reproducido en local con el stack
`ofertas-production-check`). La verificación local de «producción aislada» del plan no ejecutó este paso del CI.

### Bloqueantes (antes de cualquier despliegue)

1. **Arreglar `Verificar`**: en `compose.ci.yml` dar a `mailpit` un usuario sin root (p. ej. `user: "65534:65534"`; usa
   los puertos 1025/8025, sin privilegios) y, según §35, perfil y etiqueta `ofertasaldia.solo-pruebas: "true"`. Probar
   en local los mismos comandos del paso «Prueba de humo», completos, antes de subirlo.
2. **Arreglo por PR normal, con aprobación del equipo** y los checks en verde. No volver a usar el bypass. Al fusionar,
   registrar aquí el run de `main`, el SHA servido por `/version.json` y `/api/health` = 200.
3. **Riesgo de memoria en login (OOM)**: `login` ejecuta dos Argon2id por petición (`hash(randomBytes)` de relleno +
   `verify`), con ~64 MiB cada uno por defecto, en un contenedor de 384 MB. Unos pocos logins simultáneos pueden
   matar la API. Calcular el hash de relleno una vez al arrancar y acotar la concurrencia de Argon2 (o ajustar
   `memoryCost` dentro de lo que pide OWASP). Medirlo con una prueba de carga corta.
4. **Límite de intentos global por error**: `reset` y el inicio de OAuth usan como clave de cuenta las constantes
   `"reset"` y `"oauth-start"`, así que 20 peticiones de cualquiera en 15 min bloquean a todos (429). Usar solo la IP
   en esos casos (o el hash del token / el proveedor + IP). Además `x-real-ip` vacío (`""`) no cae a `request.ip`
   (`??` no cubre cadena vacía).

### Incumplimientos de AGENTS.md encontrados (no bloquean el arreglo del CI, sí el «Done» del backend)

- §22: los 422 no llevan `errors[]` con `field`/`code`; el frontend no puede marcar campos desde la API.
- §30: la API solo registra errores 5xx; falta el log JSON por petición (`method`, `path`, `status`, `durationMs`,
  `requestId`) y devolver `X-Request-ID`.
- §24: el límite de intentos cuenta también los aciertos y no distingue fallos de login; no hay aviso al bloquear.
- §33/§32: sin contrato OpenAPI ni pruebas de contrato; sin pruebas de autorización sistemáticas (401/403/404 por
  endpoint).
- Parte 3 (§35–§40): las pruebas son scripts `.cjs` sueltos. Faltan Gherkin + playwright-bdd, `npm test` y
  `test:unit|api|endpoints|security|db`, `tests/db/` (migraciones, rol sin privilegios, longitudes = §6.3),
  Squawk, `scripts/check-test-only.mjs` y los checks `Base de datos` y `Seguridad`.
- §21: identificadores nuevos con `randomUUID()` (v4); la norma pide UUIDv7 en tablas nuevas (menor).
- `statement_timeout` y `connectionTimeoutMillis` de 500 ms con pool de 5: riesgo de 503 bajo carga; revisar con
  medición.
- UX OAuth: los errores del callback devuelven JSON al navegador en vez de volver a `/entrar` con un mensaje.

### Avance (rama `fix/api-endurecimiento`, PR #6)

Hecho y probado en local con el compose de producción + CI (`tests/api/hardening.cjs`, además de oauth/recovery/production-proxy): Argon2id con mínimos OWASP, hash de relleno único y máximo 2 hashes simultáneos (12 logins concurrentes: todos 401, API a ~59 MiB de 384); límite de intentos solo por IP en `reset`/OAuth y `x-real-ip` vacío; `errors[]` por campo en los 422 de auth; `X-Request-ID` y log JSON por petición. Pendiente de esta lista: OpenAPI, pruebas de autorización por endpoint, estructura de la parte 3, UUIDv7, OAuth con errores amigables, medición de `statement_timeout`.

### Avance (rama `feat/redireccion-portada-sesion`)

- Redirección tras registro e inicio de sesión: redirigen a la portada (`/`) con cookie de sesión activa (`Set-Cookie`). Si el login recibe `next=/admin/`, preserva la redirección al admin.
- Portada y afiliado (`portada.tsx`, `afiliado.tsx`): leen la sesión vía `obtenerUsuario(request)` llamando a `/api/auth/me`. Si el usuario está autenticado, la cabecera muestra `MenuUsuario` (enlazando al panel `/panel`) en lugar de `BotonesCuenta` ("Iniciar sesión" / "Regístrate").
- API (`services/api/src/auth.ts`, `oauth.ts`): `register` crea la sesión en base de datos y setea la cookie al crear el usuario. El callback de OAuth redirige a `/`.
- Pruebas actualizadas y añadidas:
  - `tests/api/production-proxy.cjs`: valida redirección a `/` y cookie `__Host-session` en registro y login.
  - `tests/api/recovery.cjs`: valida que `register` genera sesión y cookie.
  - `tests/e2e/forms.cjs`: valida en navegador que registro y login redirigen a `/`, muestran la cuenta en cabecera ("Cuenta de María Pérez") y permiten entrar al panel desde ella.

### Avance (rama `feat/estandares-openapi-auth-ux`)

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

### Orden propuesto

1. PR «CI: mailpit sin root y solo-pruebas» → aprobación → merge → comprobar publicación/despliegue y salud.
2. PR de endurecimiento: Argon2 (memoria), claves del límite de intentos, logs por petición, `errors[]` en 422.
3. Verificar en producción: SMTP real (un correo de recuperación a una cuenta controlada), backup remoto y
   restauración, y crear el primer admin con `cli-admin`.
4. Estructura de pruebas de la parte 3 y checks `Base de datos`/`Seguridad`; OpenAPI.
5. Lo funcional pendiente de la lista de abajo (OAuth real, verificación de correo, catálogo persistente, pagos).

Limpieza local: siguen arrancados los stacks Docker `ofertas-production-check` y `ofertasaldiaonline` (dev); apagarlos
con `docker compose -p <proyecto> down` cuando no se usen (sin `-v` si se quieren conservar los datos).

---

Actualizado: 2026-11-01. Rama: `feat/backend-admin-production`, basada en `origin/main` (`d1bc23f`). No interpretar los archivos de diseño sin seguimiento como código entregado.

## Implementado

- API NestJS 12.3.2/Fastify 5.12.7, PostgreSQL, migraciones 1–7 transaccionales con bloqueo, salud y disponibilidad.
- Registro, acceso, sesiones hash/cookies HttpOnly, logout, recuperación y cambio de contraseña con tokens de una hora y consumo único; revocación de sesiones al restablecer.
- Correo SMTP en cola PostgreSQL pg-boss con reintentos; Mailpit solo en desarrollo/CI.
- Google/Apple OAuth con estado de un uso, nonce, PKCE Google, firmas OIDC y callback POST Apple. Botones conectados. Sin credenciales, acceso desactivado. No se vinculan cuentas automáticamente por correo.
- Formularios frontend conectados y panel protegido. El panel conserva datos demo y ahora lo informa explícitamente.
- Administrador independiente React/shadcn en `/admin/`: estadísticas reales, usuarios, productos, activación manual de planes, suspensión/reactivación y auditoría. Permisos, paginación y validación en API.
- Compose dev y prod; nginx como entrada única. En producción ningún servicio publica puertos y Traefik conecta solo al gateway. PostgreSQL tiene rol de aplicación sin superusuario. Admin y API tienen imágenes propias; la base incorpora init del rol.
- Servidor web con confianza de un salto de proxy para HTTPS y logs sin query strings. El enlace de recuperación lleva token en fragmento, no en URL enviada al servidor.
- CI construye y revisa cinco imágenes; publicación depende de `Verificar` y `Escenarios`. Chromium guarda evidencia `qa-evidence`.

## Evidencia ejecutada localmente

- Typecheck de web/API/admin y compilaciones API/admin correctos; las imágenes también compilan la web.
- Trivy 0.76.0 sobre las cinco imágenes: sin HIGH/CRITICAL con corrección disponible. Se actualizó el backend nuevo a NestJS 12.3.2/Fastify 5.12.7 porque Nest 11 fijaba Fastify vulnerable; en PostgreSQL se parchearon brotli/libcurl y se reemplazó gosu (runtime Go vulnerable) por su-exec 0.3. El backend usa ESM, con instalación limpia y pruebas repetidas.
- Hadolint: Dockerfiles API, admin y PostgreSQL correctos.
- Reglas de plataforma sobre `compose.prod.yml`: correctas; ningún `ports:`/`build:`, todos los servicios con límites, hardening y healthcheck.
- Arranque completo del Compose de desarrollo con web/API/admin/PostgreSQL/Mailpit/gateway.
- Compose de producción aislado (`ofertas-production-check`), base vacía: migraciones hasta 7, `/api/health` y `/admin/` 200. Consulta real confirmó `ofertas_app`, `rolsuper=false`.
- `tests/api/recovery.cjs`: registro, login, correo recibido en Mailpit, cambio, token reutilizado rechazado, revocación de sesión y contraseña anterior, nuevo login. Pasó también con el rol y Compose de producción aislado.
- `tests/api/oauth.cjs`: rechazos seguros sin credenciales. `oauth-state.cjs`: inicio Google con cliente ficticio, PKCE/nonce/cookie, estado inválido, código inválido y rechazo de replay. Pasaron; no equivalen a login real con proveedores.
- `tests/e2e/forms.cjs`: 16 controles pasados, Chromium visible, escritorio 1280×900 y móvil 390×844; registro y aceptación de términos, login, recuperación/correo, restablecimiento, revocación, token reutilizado, permisos admin, listado, activación manual, suspensión, auditoría, catálogo, ausencia de errores JS y overflow de página. Ver `tests/e2e/results/forms.json` y capturas `admin-desktop.png`, `admin-mobile.png` (ignorados por Git, artefactos CI).
- `tests/api/production-proxy.cjs`: registro/login a través del gateway simulando Traefik HTTPS; redirecciones 302 y cookie `__Host-session`, Secure, HttpOnly, SameSite=Lax verificadas.
- SMTP real de Coolify: conexión y autenticación verificadas con `nodemailer.verify()` sin enviar mensajes. La entrega real sigue pendiente.
- Dump PostgreSQL y restauración en `restore_check` local: migraciones hasta 7 y usuarios conservados. No demuestra backup remoto ni recuperación del VPS.

Las pruebas se repiten cuando hay cambios posteriores relevantes; registrar aquí el resultado final del CI y despliegue antes de declarar publicación.

## Preparación real de producción

Se consultó Coolify sin exponer valores: ya tenía dominio, SMTP y remitente. Se añadieron POSTGRES_PASSWORD y APP_DATABASE_PASSWORD, sin reiniciar aplicación. Copias locales 0600: `~/.ansible/secretos-clientes/ofertasaldia/app_postgres_root` y `app_postgres_app`. No guardarlas en Git. Falta incorporar estas variables al aprovisionamiento declarativo de infra para conservar la fuente de verdad.

La cuenta inicial de administrador se crea registrando un correo controlado y ejecutando `node dist/cli-admin.js <correo>` en la consola autorizada de la API. No hay contraseña predeterminada ni promociones públicas.

## Pendientes y límites

- PR #4: https://github.com/yitztech/ofertasaldia.online/pull/4. **Desactualizado, ver «Revisión 2026-11-01»**: el PR se fusionó (`c46aaf7`) sin aprobación y con `Verificar` en rojo; no se ha desplegado.
- Configurar clientes reales Google/Apple y verificar consentimiento y sesión con ambos. Requieren credenciales y callback HTTPS registrado. No afirmar acceso real validado.
- Verificar SMTP real y los backups externos después de desplegar. Solo se ha probado Mailpit y restauración local.
- Catálogo y perfil de afiliado persistente completo: la portada/panel aún usan ejemplos. No confundir estadísticas demo del panel con métricas reales del admin.
- Los planes son manuales. No hay proveedor de pagos, cobro, renovaciones automáticas, ventas ni comisiones verificadas.
- Verificación de correo de registro, vinculación explícita de identidades existentes, documentos legales aprobados, contrato OpenAPI completo, endurecimiento/limpieza de límites de intentos y cobertura adicional de autorización/IDOR y navegadores.
- No se ha probado un dispositivo móvil nativo ni comportamiento offline.

## Continuación

Guía de operación: `docs/DESPLIEGUE-BACKEND.md`. OAuth: `docs/OAUTH.md`. Ejecutar E2E desde la raíz con `node tests/e2e/forms.cjs` después de instalar Playwright en `tests/e2e` y arrancar el Compose dev. Nunca apuntar la prueba con fixtures de administrador a producción.

Los archivos `.impeccable/`, `DESIGN.md`, `PRODUCT.md`, sus equivalentes en `apps/web` y `design/` ya estaban sin seguimiento; se preservaron y no forman parte del cambio.
