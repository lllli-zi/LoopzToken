// Billing Service 内部 API 客户端（契约见 packages/contracts/src/billing.ts）。
// 内部超时 3s（TECHNICAL_SOLUTION 22.4）；生产走内网 / mTLS。
package billing

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	baseURL string
	http    *http.Client
}

func NewClient(baseURL string, timeout time.Duration) *Client {
	return &Client{
		baseURL: baseURL,
		http:    &http.Client{Timeout: timeout},
	}
}

type ReservationRequest struct {
	IdempotencyKey string `json:"idempotencyKey"`
	UserID         string `json:"userId"`
	APIKeyID       string `json:"apiKeyId"`
	RequestID      string `json:"requestId"`
	// micro-CNY 十进制字符串
	AmountMicros string `json:"amountMicros"`
}

type SettleRequest struct {
	IdempotencyKey string `json:"idempotencyKey"`
	AmountMicros   string `json:"amountMicros"`
	PriceVersionID string `json:"priceVersionId"`
	UsageSource    string `json:"usageSource"`
	ParserVersion  string `json:"parserVersion"`
	Estimated      bool   `json:"estimated"`
}

type ReleaseRequest struct {
	IdempotencyKey string `json:"idempotencyKey"`
	Reason         string `json:"reason"`
}

func (c *Client) CreateReservation(ctx context.Context, req ReservationRequest) error {
	return c.do(ctx, http.MethodPost, "/internal/v1/billing/reservations", req, nil)
}

func (c *Client) SettleReservation(ctx context.Context, reservationID string, req SettleRequest) error {
	return c.do(ctx, http.MethodPost, "/internal/v1/billing/reservations/"+reservationID+"/settle", req, nil)
}

func (c *Client) ReleaseReservation(ctx context.Context, reservationID string, req ReleaseRequest) error {
	return c.do(ctx, http.MethodPost, "/internal/v1/billing/reservations/"+reservationID+"/release", req, nil)
}

func (c *Client) GetWallet(ctx context.Context, userID string, out any) error {
	return c.do(ctx, http.MethodGet, "/internal/v1/wallets/"+userID, nil, out)
}

func (c *Client) do(ctx context.Context, method, path string, in, out any) error {
	var body io.Reader
	if in != nil {
		buf, err := json.Marshal(in)
		if err != nil {
			return fmt.Errorf("marshal request: %w", err)
		}
		body = bytes.NewReader(buf)
	}
	httpReq, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
	if err != nil {
		return err
	}
	if in != nil {
		httpReq.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(httpReq)
	if err != nil {
		return err
	}
	defer func() { _ = resp.Body.Close() }()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("billing %s %s: status=%d body=%s", method, path, resp.StatusCode, respBody)
	}
	if out != nil && len(respBody) > 0 {
		return json.Unmarshal(respBody, out)
	}
	return nil
}
