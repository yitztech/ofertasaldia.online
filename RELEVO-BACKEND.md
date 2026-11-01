# Estado y relevo del backend

Actualizado: 2026-11-01. Rama: `feat/backend-admin-production`, basada en `origin/main` (`d1bc23f`). No interpretar los archivos de diseño sin seguimiento como código entregado.

## Implementado

- API NestJS 11/Fastify, PostgreSQL, migraciones 1–7 transaccionales con bloqueo, salud y disponibilidad.
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
- Hadolint: Dockerfiles API, admin y PostgreSQL correctos.
- Reglas de plataforma sobre `compose.prod.yml`: correctas; ningún `ports:`/`build:`, todos los servicios con límites, hardening y healthcheck.
- Arranque completo del Compose de desarrollo con web/API/admin/PostgreSQL/Mailpit/gateway.
- Compose de producción aislado (`ofertas-production-check`), base vacía: migraciones hasta 7, `/api/health` y `/admin/` 200. Consulta real confirmó `ofertas_app`, `rolsuper=false`.
- `tests/api/recovery.cjs`: registro, login, correo recibido en Mailpit, cambio, token reutilizado rechazado, revocación de sesión y contraseña anterior, nuevo login. Pasó también con el rol y Compose de producción aislado.
- `tests/api/oauth.cjs`: rechazos seguros sin credenciales. `oauth-state.cjs`: inicio Google con cliente ficticio, PKCE/nonce/cookie, estado inválido, código inválido y rechazo de replay. Pasaron; no equivalen a login real con proveedores.
- `tests/e2e/forms.cjs`: 16 controles pasados, Chromium visible, escritorio 1280×900 y móvil 390×844; registro y aceptación de términos, login, recuperación/correo, restablecimiento, revocación, token reutilizado, permisos admin, listado, activación manual, suspensión, auditoría, catálogo, ausencia de errores JS y overflow de página. Ver `tests/e2e/results/forms.json` y capturas `admin-desktop.png`, `admin-mobile.png` (ignorados por Git, artefactos CI).
- `tests/api/production-proxy.cjs`: registro/login a través del gateway simulando Traefik HTTPS; redirecciones 302 y cookie `__Host-session`, Secure, HttpOnly, SameSite=Lax verificadas.
- Dump PostgreSQL y restauración en `restore_check` local: migraciones hasta 7 y usuarios conservados. No demuestra backup remoto ni recuperación del VPS.

Las pruebas se repiten cuando hay cambios posteriores relevantes; registrar aquí el resultado final del CI y despliegue antes de declarar publicación.

## Preparación real de producción

Se consultó Coolify sin exponer valores: ya tenía dominio, SMTP y remitente. Se añadieron POSTGRES_PASSWORD y APP_DATABASE_PASSWORD, sin reiniciar aplicación. Copias locales 0600: `~/.ansible/secretos-clientes/ofertasaldia/app_postgres_root` y `app_postgres_app`. No guardarlas en Git. Falta incorporar estas variables al aprovisionamiento declarativo de infra para conservar la fuente de verdad.

La cuenta inicial de administrador se crea registrando un correo controlado y ejecutando `node dist/cli-admin.js <correo>` en la consola autorizada de la API. No hay contraseña predeterminada ni promociones públicas.

## Pendientes y límites

- CI del PR, integración y despliegue de esta rama: registrar resultado y SHA servido. GitHub exige aprobación del equipo antes del merge; no saltarse la regla.
- Configurar clientes reales Google/Apple y verificar consentimiento y sesión con ambos. Requieren credenciales y callback HTTPS registrado. No afirmar acceso real validado.
- Verificar SMTP real y los backups externos después de desplegar. Solo se ha probado Mailpit y restauración local.
- Catálogo y perfil de afiliado persistente completo: la portada/panel aún usan ejemplos. No confundir estadísticas demo del panel con métricas reales del admin.
- Los planes son manuales. No hay proveedor de pagos, cobro, renovaciones automáticas, ventas ni comisiones verificadas.
- Verificación de correo de registro, vinculación explícita de identidades existentes, documentos legales aprobados, contrato OpenAPI completo, endurecimiento/limpieza de límites de intentos y cobertura adicional de autorización/IDOR y navegadores.
- No se ha probado un dispositivo móvil nativo ni comportamiento offline.

## Continuación

Guía de operación: `docs/DESPLIEGUE-BACKEND.md`. OAuth: `docs/OAUTH.md`. Ejecutar E2E desde la raíz con `node tests/e2e/forms.cjs` después de instalar Playwright en `tests/e2e` y arrancar el Compose dev. Nunca apuntar la prueba con fixtures de administrador a producción.

Los archivos `.impeccable/`, `DESIGN.md`, `PRODUCT.md`, sus equivalentes en `apps/web` y `design/` ya estaban sin seguimiento; se preservaron y no forman parte del cambio.
