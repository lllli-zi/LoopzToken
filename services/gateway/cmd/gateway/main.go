// Loopz Gateway：统一模型 API 数据面（TECHNICAL_SOLUTION 5.1）。
//
// 骨架阶段职责边界：
//   - 已就绪：HTTP 服务、健康检查、结构化日志、配置、API Key HMAC、
//     Provider Adapter 接口、Billing 内部客户端骨架。
//   - 待实现（阶段 1）：三个首发协议解析器、限流、Provider 路由、
//     SSE 转发、大请求体分层处理（对应文档 8/11/13/14 节）。
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

	"github.com/loopztoken/gateway/internal/config"
	"github.com/loopztoken/gateway/internal/httpapi"
)

func main() {
	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	handler := httpapi.NewServer(cfg, logger)

	httpServer := &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		// SSE 长连接不设置 WriteTimeout；单请求时长由 600s 硬上限的
		// Context 控制（TECHNICAL_SOLUTION 22.4）。
		IdleTimeout: 120 * time.Second,
	}

	go func() {
		logger.Info("gateway listening", "addr", cfg.ListenAddr)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("gateway listen failed", "err", err)
			os.Exit(1)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(ctx); err != nil {
		logger.Error("gateway graceful shutdown failed", "err", err)
	}
	logger.Info("gateway stopped")
}
