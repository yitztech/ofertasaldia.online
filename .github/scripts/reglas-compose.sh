#!/bin/sh
# Reglas de la plataforma sobre el compose de producción (infra-ionos-vps, docs/AUDITORIA.md).
# Uso: .github/scripts/reglas-compose.sh compose.prod.yml
# Las variables obligatorias (`:?`) deben estar definidas, aunque sea con valores de prueba.
set -eu
compose=${1:-compose.prod.yml}

errores=$(docker compose -f "$compose" config --format json | jq -r '
  .services | to_entries[] | .key as $s | .value as $v |
  (if ($v.mem_limit // $v.deploy.resources.limits.memory) == null then "\($s): falta mem_limit (CON-01)" else empty end),
  (if $v.ports then "\($s): no puede publicar puertos, sin ports: (DEP-02)" else empty end),
  (if $v.build then "\($s): sin build:, el servidor no compila (DEP-01)" else empty end),
  (if $v.privileged then "\($s): privileged prohibido (CON-07)" else empty end),
  (if $v.network_mode or $v.pid then "\($s): network_mode y pid prohibidos (CON-07)" else empty end),
  ($v.volumes // [] | .[] | select(.type == "bind") | "\($s): monta \(.source) del servidor (DEP-03, CON-07)"),
  (if $v.read_only != true then "\($s): falta read_only: true (CON-06)" else empty end),
  (if (($v.cap_drop // []) | index("ALL")) == null then "\($s): falta cap_drop: [ALL] (CON-03)" else empty end),
  (if (($v.security_opt // []) | index("no-new-privileges:true")) == null then "\($s): falta no-new-privileges (CON-03)" else empty end),
  (if $v.healthcheck == null then "\($s): falta healthcheck (CON-04)" else empty end),
  (if ($v.logging.options["max-size"] // null) == null then "\($s): logs sin rotar, falta max-size (CON-02)" else empty end)
')

if [ -n "$errores" ]; then
  printf '%s\n' "$errores" | sed 's/^/::error::/'
  exit 1
fi
echo "El compose cumple las reglas de la plataforma."
