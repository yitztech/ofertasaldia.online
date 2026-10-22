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

# TEMPORAL (2026-10-19): nginx 1.30.6-alpine aún trae libexpat 2.8.5 (CVE-2026-77214) y libx11 1.8.13
# (CVE-2026-88806), ya corregidos en Alpine. Quitar el `apk upgrade` cuando la imagen los incluya.
RUN apk upgrade --no-cache libexpat libx11 \
 && rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY gateway/snippets/ /etc/nginx/snippets/
COPY gateway/default.conf.template /etc/nginx/templates/nginx/default.conf.template
COPY --chmod=755 gateway/16-analytics.sh /docker-entrypoint.d/16-analytics.sh

# Sin root: Docker deja a cualquier usuario escuchar en el 80 (ip_unprivileged_port_start=0).
# 101 es nginx en la imagen oficial; numérico para que hadolint no lo rechace (DL3066)
USER 101:101
EXPOSE 80
