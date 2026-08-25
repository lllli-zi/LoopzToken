// Billing 内部 API（TECHNICAL_SOLUTION 5.2）。
// 所有写接口必须携带 idempotency_key；数据库唯一约束保证幂等。
// 契约与 packages/contracts/src/billing.ts 保持一致。
package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
)

const maxRequestBody = 1 << 20 // 1 MB：内部接口不需要大请求体

type Server struct {
	logger *slog.Logger
	mux    *http.ServeMux
}

func NewServer(logger *slog.Logger) *Server {
	s := &Server{logger: logger, mux: http.NewServeMux()}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /healthz", s.handleHealth)

	s.mux.HandleFunc("POST /internal/v1/billing/reservations", s.handleCreateReservation)
	s.mux.HandleFunc("POST /internal/v1/billing/reservations/{id}/settle", s.handleSettle)
	s.mux.HandleFunc("POST /internal/v1/billing/reservations/{id}/release", s.handleRelease)
	s.mux.HandleFunc("POST /internal/v1/billing/recharges", s.handleRecharge)
	s.mux.HandleFunc("POST /internal/v1/billing/refunds", s.handleRefund)
	s.mux.HandleFunc("GET /internal/v1/wallets/{user_id}", s.handleGetWallet)
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// TODO 阶段 1（TECHNICAL_SOLUTION 15）：以下 handler 接入 wallet.Service，
// 在单个数据库事务内完成 余额/冻结/流水 更新并写入 Outbox 事件。

func (s *Server) handleCreateReservation(w http.ResponseWriter, r *http.Request) {
	var req createReservationRequest
	if err := decode(w, r, &req); err != nil {
		return
	}
	_ = req
	// wallet.Service.Reserve：检查余额 → 冻结 → 插入 reservation → 幂等键唯一约束
	writeNotImplemented(w, "reserve")
}

func (s *Server) handleSettle(w http.ResponseWriter, r *http.Request) {
	var req settleRequest
	if err := decode(w, r, &req); err != nil {
		return
	}
	_ = req
	_ = r.PathValue("id")
	// wallet.Service.Settle：结算事务八步（TECHNICAL_SOLUTION 15.3）
	writeNotImplemented(w, "settle")
}

func (s *Server) handleRelease(w http.ResponseWriter, r *http.Request) {
	var req releaseRequest
	if err := decode(w, r, &req); err != nil {
		return
	}
	_ = req
	_ = r.PathValue("id")
	// wallet.Service.Release：未调用上游 → released，返还冻结
	writeNotImplemented(w, "release")
}

func (s *Server) handleRecharge(w http.ResponseWriter, r *http.Request) {
	var req rechargeRequest
	if err := decode(w, r, &req); err != nil {
		return
	}
	_ = req
	// wallet.Service.Recharge：支付入账，幂等 + 不可变流水 + payment.credited Outbox
	writeNotImplemented(w, "recharge")
}

func (s *Server) handleRefund(w http.ResponseWriter, r *http.Request) {
	var req refundRequest
	if err := decode(w, r, &req); err != nil {
		return
	}
	_ = req
	// wallet.Service.Refund：退款扣减，校验剩余可退金额
	writeNotImplemented(w, "refund")
}

func (s *Server) handleGetWallet(w http.ResponseWriter, r *http.Request) {
	_ = r.PathValue("user_id")
	// wallet.Service.GetWallet：读权威余额（Redis 仅缓存）
	writeNotImplemented(w, "get wallet")
}

// ---- 请求结构（与 packages/contracts/src/billing.ts 对齐） ----

type createReservationRequest struct {
	IdempotencyKey string `json:"idempotencyKey"`
	UserID         string `json:"userId"`
	APIKeyID       string `json:"apiKeyId"`
	RequestID      string `json:"requestId"`
	AmountMicros   string `json:"amountMicros"`
}

type settleRequest struct {
	IdempotencyKey string `json:"idempotencyKey"`
	AmountMicros   string `json:"amountMicros"`
	PriceVersionID string `json:"priceVersionId"`
	UsageSource    string `json:"usageSource"`
	ParserVersion  string `json:"parserVersion"`
	Estimated      bool   `json:"estimated"`
}

type releaseRequest struct {
	IdempotencyKey string `json:"idempotencyKey"`
	Reason         string `json:"reason"`
}

type rechargeRequest struct {
	IdempotencyKey string `json:"idempotencyKey"`
	UserID         string `json:"userId"`
	OrderID        string `json:"orderId"`
	Channel        string `json:"channel"`
	AmountMicros   string `json:"amountMicros"`
}

type refundRequest struct {
	IdempotencyKey string `json:"idempotencyKey"`
	UserID         string `json:"userId"`
	RefundID       string `json:"refundId"`
	AmountMicros   string `json:"amountMicros"`
	Reason         string `json:"reason"`
}

// ---- helpers ----

var errBodyTooLarge = errors.New("request body too large")

func decode(w http.ResponseWriter, r *http.Request, v any) error {
	body, err := io.ReadAll(io.LimitReader(r.Body, maxRequestBody+1))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "read body failed"})
		return err
	}
	if len(body) > maxRequestBody {
		writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": errBodyTooLarge.Error()})
		return errBodyTooLarge
	}
	if err := json.Unmarshal(body, v); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return err
	}
	return nil
}

func writeNotImplemented(w http.ResponseWriter, what string) {
	writeJSON(w, http.StatusNotImplemented, map[string]string{"error": what + " not implemented yet (skeleton)"})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
