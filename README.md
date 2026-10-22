# Plantilla de web de cliente

Repositorio plantilla de **yitztech**. El alta de cada cliente
([infra-ionos-vps](https://github.com/yprevot/infra-ionos-vps), playbook `cliente-alta`, fase `repo`)
crea el repositorio del cliente a partir de este, y la fase `web` lo conecta con Coolify.

Se despliega en modo **imágenes**: GitHub Actions construye y publica en GHCR, y Coolify solo descarga y
arranca. El servidor nunca compila.

```
AGENTS.md, CLAUDE.md      # estándares de desarrollo (frontend y backend) para personas y agentes
compose.prod.yml          # producción en Coolify: gateway + web (+ PostgreSQL comentado)
nginx/nginx.conf          # nginx sin root y de solo lectura, común a gateway y web
gateway/                  # nginx delante de todo: IP real, cabeceras, X-Request-ID, /version.json, Umami
web/                      # página "Próximamente": sustituir por la aplicación del cliente
.github/workflows/deploy.yml   # verificar → publicar en GHCR → webhook de Coolify → comprobar el SHA servido
.github/scripts/reglas-compose.sh   # reglas de la plataforma sobre el compose (las usa `Verificar`)
```

## Reglas de la plataforma

- El dominio va **solo** al servicio `gateway`, en el puerto 80. El resto de servicios no publica puertos.
- **Todo servicio lleva `mem_limit`**: varios clientes comparten servidor. El alta se detiene si falta.
- La configuración va dentro de las imágenes; el compose no monta archivos del repositorio.
- `/version.json` devuelve el commit desplegado: el workflow espera a verlo para dar el despliegue por bueno.
- **Sin root y con el sistema de archivos de solo lectura** (`read_only: true`): cada servicio escribe solo en
  sus volúmenes y en `/tmp` (tmpfs). Lo trae el bloque `x-hardening`, junto con `cap_drop: [ALL]`,
  `no-new-privileges` y la rotación de logs.
- Cada servicio responde `/healthz` para su `healthcheck`, y el gateway espera a que estén sanos.
- El gateway pasa a cada servicio `X-Request-ID`: el mismo identificador en todos los logs de una petición.
- Lo que un agente o una persona deben cumplir al escribir el código está en [`AGENTS.md`](AGENTS.md).

Las reglas completas, y cómo se auditan, están en `docs/AUDITORIA.md` de infra-ionos-vps.

## CI: `Verificar` antes de publicar

Cada PR y cada push a `main` pasan por el job **`Verificar`**, el check que exige la regla de `main`:

1. hadolint sobre los Dockerfile;
2. [`reglas-compose.sh`](.github/scripts/reglas-compose.sh): `mem_limit`, sin `ports:` ni `build:`, sin
   `privileged` ni montajes del servidor, `read_only`, `cap_drop: [ALL]`, `no-new-privileges`, `healthcheck` y
   logs rotados en cada servicio;
3. prueba de humo: el compose de producción con las imágenes recién construidas (`/healthz`, `/version.json`,
   cabeceras de seguridad, ningún servicio como root);
4. Trivy sobre cada imagen: falla con vulnerabilidades `CRITICAL` o `HIGH` que tengan arreglo.

Solo si pasa, `main` publica en GHCR y despliega. Al añadir servicios o pruebas de la app (lint, tipos, pruebas
de extremo a extremo), van en este mismo job; las variables obligatorias nuevas del compose, con valores de
prueba, en el `env:` del workflow. Las acciones de terceros van fijadas por commit.

## Después de crear el repo

1. **Paquetes de GHCR**: el primer push a `main` publica `<repo>-gateway` y `<repo>-web`. GitHub los crea
   privados, y así pueden quedarse: el alta hace `docker login ghcr.io` en el servidor.
2. **`TRUSTED_PROXY_CIDR`**: tras el primer arranque, medir la subred de Traefik en la red de la app y ponerla en
   la ficha del cliente (infra-ionos-vps, `docs/OPERACION.md` §4.3).
3. **La aplicación**: sustituir `web/` por la aplicación real. Si escucha en otro puerto o hay más servicios
   (API, panel), ajustar los `upstream` y las `location` de `gateway/default.conf.template`. Las variables que
   pone el alta (`SMTP_*`, `MAIL_FROM`, `LISTMONK_*`, `UMAMI_*`, `SITE_URL`) se añaden al `environment` del
   servicio que las use. Los secretos (`POSTGRES_PASSWORD`, claves de la app) se declaran en la ficha con
   `cliente_web_env_secretos` y el alta los genera.

## Probar en local

```bash
docker build -f gateway/Dockerfile -t prueba-gateway .
docker build -f web/Dockerfile -t prueba-web .
docker network create prueba
docker run -d --rm --name web --network prueba --read-only --tmpfs /tmp prueba-web
docker run --rm -p 8080:80 --network prueba --read-only --tmpfs /tmp -e TRUSTED_PROXY_CIDR=127.0.0.1/32 prueba-gateway
# http://localhost:8080
```
