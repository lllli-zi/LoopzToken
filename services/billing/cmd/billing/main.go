// Billing Service：权威钱包、预冻结、结算与幂等账本（TECHNICAL_SOLUTION 5.2 / 15）。
//
// 骨架阶段：HTTP 服务与内部 API 路由就绪，业务逻辑待实现（阶段 1）。
// 生产部署仅绑定内网，服务间 mTLS 或云内网身份认证（21.1）。
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/loopztoken/billing/internal/httpapi"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	addr := os.Getenv("BILLING_LISTEN_ADDR")
	if addr == "" {
		addr = ":8081"
	}

	httpServer := &http.Server{
		Addr:              addr,
		Handler:           httpapi.NewServer(logger),
		ReadHeaderTimeout: 10 * time.Second,
		// 结算事务较短；请求级超时由内部客户端 3s 控制
		WriteTimeout:   15 * time.Second,
		IdleTimeout:    120 * time.Second,
		MaxHeaderBytes: 1 << 16,
	}

	go func() {
		logger.Info("billing listening", "addr", addr)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("billing listen failed", "err", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		logger.Error("billing graceful shutdown failed", "err", err)
	}
	logger.Info("billing stopped")
}
