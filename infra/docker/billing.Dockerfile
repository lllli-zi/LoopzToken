# Billing Service 镜像。构建上下文必须是仓库根目录：
#   docker build -f infra/docker/billing.Dockerfile -t loopz/billing .
FROM golang:1.24-alpine AS build
WORKDIR /src
COPY services/billing/go.mod ./
RUN go mod download
COPY services/billing/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/billing ./cmd/billing

FROM alpine:3.21
RUN adduser -D -u 10001 billing
USER billing
COPY --from=build /out/billing /usr/local/bin/billing
EXPOSE 8081
ENTRYPOINT ["billing"]
