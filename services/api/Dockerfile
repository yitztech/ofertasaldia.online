FROM node:26-alpine AS build
RUN npm install --global pnpm@12.16.1
WORKDIR /app
COPY services/api/package.json services/api/pnpm-lock.yaml ./
COPY services/api/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY services/api/tsconfig.json ./
COPY services/api/src ./src
RUN pnpm build && pnpm prune --prod

FROM node:26-alpine
ENV NODE_ENV=production NODE_OPTIONS=--max-old-space-size=192
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
USER 1000:1000
EXPOSE 3001
CMD ["node", "dist/main.js"]
