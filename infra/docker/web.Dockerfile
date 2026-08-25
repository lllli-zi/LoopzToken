# Web 静态资源镜像（Rsbuild 构建 + nginx 托管）。
# 生产优先对象存储 + CDN（TECHNICAL_SOLUTION 22.1）；本镜像用于无 CDN 环境。
# 构建上下文必须是仓库根目录：
#   docker build -f infra/docker/web.Dockerfile -t loopz/web .
FROM oven/bun:1.3-alpine AS build
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
COPY ./
RUN bun run --filter @loopz/web build

FROM nginx:1.27-alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
