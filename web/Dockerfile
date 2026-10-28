# Web de inicio: una página estática servida por nginx en el puerto 80.
# Sustituir por la aplicación real (mismo servicio `web`, o ajustar el upstream del gateway),
# manteniendo /healthz para su healthcheck.
FROM nginx:1.30-alpine

# TEMPORAL (2026-10-24): nginx 1.30.6-alpine trae brotli-libs 1.2.0-r1 (CVE-2026-111497), ya corregido
# en Alpine (1.2.1-r0). TEMPORAL (2026-10-26): curl y libcurl 8.22.0-r0 (CVE-2026-92392), corregidos en
# 8.23.0-r0. Quitar cada paquete del `apk upgrade` cuando la imagen lo incluya.
RUN apk upgrade --no-cache brotli-libs curl libcurl \
 && rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY web/default.conf /etc/nginx/conf.d/web.conf
COPY web/public/ /usr/share/nginx/html/

USER 101:101
EXPOSE 80
