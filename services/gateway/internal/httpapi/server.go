// Gateway HTTP 入口：路由、中间件与对外协议端点。
// 对外协议见 TECHNICAL_SOLUTION 8：OpenAI Chat / Responses、Anthropic Messages、Models。
package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/loopztoken/gateway/internal/billing"
	"github.com/loopztoken/gateway/internal/config"
	"github.com/loopztoken/gateway/internal/provider"
)

type ctxKey int

const ctxKeyRequestID ctxKey = iota

type Server struct {
	cfg      config.Config
	logger   *slog.Logger
	billing  *billing.Client
	adapters *provider.Registry
	mux      *http.ServeMux
}

func NewServer(cfg config.Config, logger *slog.Logger) *Server {
	s := &Server{
		cfg:      cfg,
		logger:   logger,
		billing:  billing.NewClient(cfg.BillingBaseURL, cfg.BillingTimeout),
		adapters: provider.DefaultRegistry(),
		mux:      http.NewServeMux(),
	}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /healthz", s.handleHealth)
	// 对外模型 API（TODO 阶段 1 实现完整数据面链路）
	s.mux.HandleFunc("GET /v1/models", s.handleModels)
	s.mux.HandleFunc("POST /v1/chat/completions", s.handleProxy(provider.ProtocolOpenAIChat))
	s.mux.HandleFunc("POST /v1/responses", s.handleProxy(provider.ProtocolOpenAIResponses))
	s.mux.HandleFunc("POST /v1/messages", s.handleProxy(provider.ProtocolAnthropicMessages))
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.middleware(s.mux).ServeHTTP(w, r)
}

// middleware：请求 ID、结构化日志、平台硬上限 600s。
// Trace 字段基线见 TECHNICAL_SOLUTION 20.1；不写 Prompt 与完整 Key。
func (s *Server) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqID := newRequestID()
		ctx := context.WithValue(r.Context(), ctxKeyRequestID, reqID)
		ctx, cancel := context.WithTimeout(ctx, s.cfg.RequestTimeout)
		defer cancel()

		w.Header().Set("X-Loopz-Request-Id", reqID)
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		start := time.Now()
		next.ServeHTTP(sw, r.WithContext(ctx))
		s.logger.Info("http_request",
			"request_id", reqID,
			"method", r.Method,
			"path", r.URL.Path,
			"status", sw.status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// handleModels：只返回当前用户和 Key 有权使用、存在健康 Deployment 的公开模型（8.4）。
// TODO 阶段 2：API Key 鉴权 → 模型权限过滤 → Deployment 健康过滤。
func (s *Server) handleModels(w http.ResponseWriter, _ *http.Request) {
	writeAPIError(w, http.StatusNotImplemented, "models listing not implemented yet")
}

// handleProxy 是三类模型协议端点的统一入口。
//
// TODO 阶段 1 实现完整数据面（TECHNICAL_SOLUTION 5.1 / 9 / 11 / 12 / 13 / 14 / 15）：
//  1. API Key 校验：解析 → Redis 元数据缓存 → 恒定时间 HMAC → 用户/Key 状态
//     → 模型、IP、预算限制（10）。
//  2. 请求体处理：≤2MB 内存池，2~32MB 临时文件，>32MB 返回 413（13）。
//  3. 头处理：删除用户鉴权头（Authorization / x-api-key / x-goog-api-key /
//     Proxy-Authorization）与禁止透传头，按协议允许列表转发（9）。
//  4. Billing 预冻结（15.2），余额不足直接 402。
//  5. Provider Router 选择 Deployment（11），单一重试责任与预算（12）。
//  6. Adapter 构建上游请求：注入上游凭据、替换模型映射。
//  7. 流式转发 + 增量解析 Usage（14）；客户端取消传播到上游。
//  8. 结算 / 释放 / pending_billing（15.4 / 15.5），Outbox 事件。
func (s *Server) handleProxy(protocol provider.Protocol) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqID, _ := r.Context().Value(ctxKeyRequestID).(string)
		s.logger.Info("proxy_not_implemented",
			"request_id", reqID,
			"protocol", string(protocol),
			"path", r.URL.Path,
		)
		writeAPIError(w, http.StatusNotImplemented, "model API forwarding not implemented yet")
	}
}

func newRequestID() string {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return "unknown"
	}
	return hex.EncodeToString(buf)
}

type apiErrorBody struct {
	Error apiErrorDetail `json:"error"`
}

type apiErrorDetail struct {
	Message string `json:"message"`
	Type    string `json:"type"`
}

func writeAPIError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, apiErrorBody{Error: apiErrorDetail{Message: message, Type: "not_implemented"}})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// statusWriter 记录状态码；Flush 透传保证 SSE 每响应刷新（14）。
type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (w *statusWriter) Flush() {
	if f, ok := w.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}
