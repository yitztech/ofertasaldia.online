FROM node:26-alpine AS build
RUN npm install --global pnpm@12.16.1
WORKDIR /app
COPY apps/admin/package.json apps/admin/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY apps/admin/ ./
RUN pnpm build
FROM nginx:1.30-alpine
RUN apk upgrade --no-cache brotli-libs curl libcurl
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY admin/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html/admin
USER 101:101
EXPOSE 8081
CMD ["nginx", "-g", "daemon off;"]
