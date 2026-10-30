# Aplicación web (apps/web): React Router 8 con SSR sobre Node. Se construye desde la raíz del repositorio:
#   docker build -f web/Dockerfile .
# Escucha en el 3000 dentro de la red del compose; el gateway (nginx) está delante.

FROM node:26-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN npm install --global pnpm@12.16.1
WORKDIR /app

# Dependencias de producción (las que necesita el servidor)
FROM base AS prod-deps
COPY apps/web/package.json apps/web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Compilación: instala todo, construye y no deja nada de esto en la imagen final
FROM base AS build
COPY apps/web/package.json apps/web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY apps/web/ ./
RUN pnpm run build

FROM node:26-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    # ~75 % de mem_limit (compose.prod.yml), AGENTS §20
    NODE_OPTIONS=--max-old-space-size=192
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/build ./build

# npm y corepack no hacen falta para ejecutar la app y traen dependencias con CVE propias
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

# Sin root; node es el usuario 1000 de la imagen oficial
USER 1000:1000
EXPOSE 3000
# Forma de lista: node es el proceso principal y recibe SIGTERM (AGENTS §20)
CMD ["node_modules/.bin/react-router-serve", "build/server/index.js"]
