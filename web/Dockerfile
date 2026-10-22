# Web de inicio: una página estática servida por nginx en el puerto 80.
# Sustituir por la aplicación real (mismo servicio `web`, o ajustar el upstream del gateway),
# manteniendo /healthz para su healthcheck.
FROM nginx:1.30-alpine

# TEMPORAL (2026-10-19): nginx 1.30.6-alpine aún trae libexpat 2.8.5 (CVE-2026-77214) y libx11 1.8.13
# (CVE-2026-88806), ya corregidos en Alpine. Quitar el `apk upgrade` cuando la imagen los incluya.
RUN apk upgrade --no-cache libexpat libx11 \
 && rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY web/default.conf /etc/nginx/conf.d/web.conf
COPY web/public/ /usr/share/nginx/html/

USER 101:101
EXPOSE 80
