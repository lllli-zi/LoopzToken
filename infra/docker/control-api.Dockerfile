# Control API 镜像（Bun 运行时）。构建上下文必须是仓库根目录：
#   docker build -f infra/docker/control-api.Dockerfile -t loopz/control-api .
FROM oven/bun:1.3-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/control-api/package.json apps/control-api/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/contracts/package.json packages/contracts/
COPY packages/database/package.json packages/database/
COPY packages/payment/package.json packages/payment/
COPY packages/ui/package.json packages/ui/
RUN bun install --frozen-lockfile

FROM deps AS build
COPY ./
RUN bun run db:generate

FROM oven/bun:1.3-alpine
WORKDIR /app
COPY --from=build /app ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "apps/control-api/src/main.ts"]
