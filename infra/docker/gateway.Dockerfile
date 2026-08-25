# Loopz Gateway 镜像。构建上下文必须是仓库根目录：
#   docker build -f infra/docker/gateway.Dockerfile -t loopz/gateway .
FROM golang:1.24-alpine AS build
WORKDIR /src
COPY services/gateway/go.mod ./
RUN go mod download
COPY services/gateway/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/gateway ./cmd/gateway

FROM alpine:3.21
RUN adduser -D -u 10001 gateway
USER gateway
COPY --from=build /out/gateway /usr/local/bin/gateway
# 临时文件目录独立挂载点（TECHNICAL_SOLUTION 13）
VOLUME ["/tmp/loopz"]
ENV GATEWAY_TEMP_DIR=/tmp/loopz
EXPOSE 8080
ENTRYPOINT ["gateway"]
