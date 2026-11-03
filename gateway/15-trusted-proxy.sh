#!/bin/sh
# Validación de seguridad de TRUSTED_PROXY_CIDR.
# En producción, Traefik (o el proxy de borde) termina TLS y reenvía a este gateway.
# Nginx solo debe confiar en X-Forwarded-For si proviene estrictamente de la red del proxy.
# TRUSTED_PROXY_CIDR nunca debe ser 0.0.0.0/0 ni ::/0 (desactiva la protección contra IP spoofing).
set -eu

cidr="${TRUSTED_PROXY_CIDR:-}"

if [ -z "$cidr" ]; then
  echo "15-trusted-proxy.sh: ERROR: TRUSTED_PROXY_CIDR no está definida o está vacía." >&2
  echo "15-trusted-proxy.sh: Define la subred exacta de Traefik (p. ej. 172.16.0.0/12 o 127.0.0.1/32 en local)." >&2
  exit 1
fi

case "$cidr" in
  0.0.0.0/0|::/0)
    echo "15-trusted-proxy.sh: ERROR DE SEGURIDAD: TRUSTED_PROXY_CIDR no puede ser $cidr (comodín inseguro)." >&2
    echo "15-trusted-proxy.sh: Un comodín permite a cualquier cliente falsificar su dirección IP vía X-Forwarded-For." >&2
    exit 1
    ;;
esac

# Validar formato CIDR básico (IPv4: a.b.c.d/m o IPv6)
case "$cidr" in
  [0-9]*.[0-9]*.[0-9]*.[0-9]*/[0-9]*)
    ;;
  *:*/[0-9]*)
    ;;
  *)
    echo "15-trusted-proxy.sh: ERROR: TRUSTED_PROXY_CIDR '$cidr' no tiene un formato CIDR válido (ej: 172.18.0.0/16 o 127.0.0.1/32)." >&2
    exit 1
    ;;
esac

echo "15-trusted-proxy.sh: TRUSTED_PROXY_CIDR=$cidr validada correctamente."
