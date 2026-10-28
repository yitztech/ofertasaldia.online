# Gateway de producción (Coolify). Se construye desde la raíz del repositorio:
#   docker build -f gateway/Dockerfile --build-arg RELEASE_SHA=<sha> .
# La configuración va dentro de la imagen: el VPS solo descarga y arranca, sin
# montar archivos del repositorio.
FROM nginx:1.30-alpine

ARG RELEASE_SHA=dev
ENV RELEASE_SHA=${RELEASE_SHA} \
    # El entrypoint de nginx solo sustituye estas variables en la plantilla
    NGINX_ENVSUBST_FILTER='^(TRUSTED_PROXY_CIDR|RELEASE_SHA)$' \
    # La imagen es de solo lectura: la plantilla se genera en /tmp/nginx/ (tmpfs)
    NGINX_ENVSUBST_OUTPUT_DIR=/tmp

# TEMPORAL (2026-10-24): nginx 1.30.6-alpine trae brotli-libs 1.2.0-r1 (CVE-2026-111497), ya corregido
# en Alpine (1.2.1-r0). TEMPORAL (2026-10-26): curl y libcurl 8.22.0-r0 (CVE-2026-92392), corregidos en
# 8.23.0-r0. Quitar cada paquete del `apk upgrade` cuando la imagen lo incluya.
RUN apk upgrade --no-cache brotli-libs curl libcurl \
 && rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY gateway/snippets/ /etc/nginx/snippets/
COPY gateway/default.conf.template /etc/nginx/templates/nginx/default.conf.template
COPY --chmod=755 gateway/16-analytics.sh /docker-entrypoint.d/16-analytics.sh

# Sin root: Docker deja a cualquier usuario escuchar en el 80 (ip_unprivileged_port_start=0).
# 101 es nginx en la imagen oficial; numérico para que hadolint no lo rechace (DL3066)
USER 101:101
EXPOSE 80
