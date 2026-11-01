#!/bin/sh
set -eu
: "${APP_DATABASE_PASSWORD:?APP_DATABASE_PASSWORD es obligatoria}"
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=app_password="$APP_DATABASE_PASSWORD" <<'SQL'
CREATE ROLE ofertas_app LOGIN PASSWORD :'app_password';
ALTER SCHEMA public OWNER TO ofertas_app;
GRANT CONNECT, CREATE ON DATABASE app TO ofertas_app;
SQL
