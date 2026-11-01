FROM postgres:18.6-alpine
# su-exec conserva el cambio de usuario del entrypoint sin el runtime Go vulnerable de gosu.
RUN apk upgrade --no-cache brotli-libs libcurl \
 && apk add --no-cache su-exec=0.3-r0 \
 && sed -i 's/exec gosu postgres/exec su-exec postgres/' /usr/local/bin/docker-entrypoint.sh \
 && rm /usr/local/bin/gosu
COPY --chmod=755 postgres/10-app.sh /docker-entrypoint-initdb.d/10-app.sh
