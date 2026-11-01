# Backend, administración y operación

## Desarrollo

```sh
docker compose -f compose.dev.yml up -d --build --wait
pnpm -C tests/e2e install --frozen-lockfile
pnpm -C tests/e2e exec playwright install chromium
node tests/e2e/forms.cjs
```

Web: http://localhost:8080. Administración: http://localhost:8080/admin/. Solo nginx publica un puerto, enlazado a localhost. Mailpit, PostgreSQL, API y admin no publican puertos. Los correos pueden inspeccionarse desde la API interna de Mailpit (las pruebas lo hacen desde el contenedor API).

La prueba crea usuarios QA en la base local y promueve solamente su fixture a administrador. Nunca ejecutarla contra producción. Los datos locales persisten en `postgres-dev`; no borrarlo para actualizar la aplicación.

## Producción

`compose.prod.yml` consume imágenes GHCR; no compila ni publica puertos. Traefik debe dirigir el dominio únicamente al gateway. Servicios: gateway, web SSR, api, admin y postgres. Mailpit solo existe en desarrollo/CI. La API usa el rol `ofertas_app`, sin superusuario. El init de PostgreSQL crea ese rol en una base vacía; cambiar variables de contraseña no cambia roles de una base ya inicializada.

Variables obligatorias: `IMAGE_PREFIX`, `TRUSTED_PROXY_CIDR`, `SITE_URL`, `POSTGRES_PASSWORD`, `APP_DATABASE_PASSWORD`, `SMTP_HOST`, `MAIL_FROM`. SMTP usa también `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER` y `SMTP_PASSWORD`. Ver `.env.example`. No usar el SMTP de pruebas en producción.

El 2026-11-01 se configuraron las dos contraseñas nuevas en Coolify para `ofertasaldia-web`. Sus copias están en `~/.ansible/secretos-clientes/ofertasaldia/app_postgres_root` y `app_postgres_app`, con permisos 0600. No incluir esos archivos en Git. El SMTP y dominio ya existían en Coolify. Se verificaron conexión y autenticación SMTP sin enviar mensajes; la entrega real sigue pendiente. Registrar estas variables también en el proceso de aprovisionamiento de la plataforma para conservar la fuente de verdad.

OAuth es opcional hasta configurar sus credenciales: ver `OAUTH.md`. Ningún secreto llega al código cliente.

Las migraciones se aplican al arrancar, con bloqueo y transacción. Si fallan, no se abre el puerto de API. `/healthz` mide vida del proceso; `/api/health` comprueba PostgreSQL y la versión del esquema. No editar migraciones aplicadas. Volver a una imagen anterior no revierte la base de datos.

## Primer administrador

1. Registrar una cuenta con un correo controlado por el administrador y una contraseña privada.
2. Desde la consola autorizada del contenedor API ejecutar:

```sh
node dist/cli-admin.js correo-del-administrador@example.com
```

La orden exige una cuenta activa existente, asigna el rol y registra la acción. No hay credenciales predeterminadas ni un endpoint público para promocionar administradores.

## CI y despliegue

`Verificar` construye y revisa las cinco imágenes, levanta el Compose de producción con Mailpit del override CI, prueba API/correo y escanea imágenes con Trivy y gateway con ZAP. `Escenarios` construye el entorno local y prueba los formularios y el admin con Chromium. La publicación depende de ambos jobs. Las capturas y resultados se guardan en el artefacto `qa-evidence`.

El push a `main` publica imágenes y solicita el despliegue a Coolify. Se comprueba `/version.json`; comprobar también `/api/health` después del despliegue. La regla de GitHub requiere aprobación del equipo antes de integrar un PR; no eludirla.

## Copias y recuperación

El volumen de producción es `postgres-data`. La plataforma debe incluirlo en sus backups PostgreSQL. Se probó `pg_dump -Fc` y restauración con `pg_restore` en una base local aislada, conservando migraciones y usuarios. Esto no acredita backups remotos ni recuperación del VPS. Antes de una migración destructiva, realizar y comprobar una copia real. No ejecutar `docker compose down -v` en producción.

## Límites funcionales

La portada y el panel de afiliado aún muestran productos y estadísticas de demostración. El administrador consulta datos reales de PostgreSQL. Los planes se activan manualmente, sin cobro automático. Faltan verificación de correo de registro, vinculación explícita de identidades existentes, catálogo/perfil de afiliado persistente completo y documentos legales aprobados. No interpretar clics como ventas o ganancias confirmadas.
