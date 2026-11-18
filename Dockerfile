FROM node:22-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@10.17.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile
COPY apps ./apps
RUN pnpm --filter web build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATABASE_URL=/data/app.db WEB_DIST=/app/apps/web/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/apps/web/dist ./apps/web/dist
WORKDIR /app/apps/api
VOLUME /data
EXPOSE 3000
CMD ["sh", "-c", "node --import tsx src/db/migrate.ts && node --import tsx src/index.ts"]
