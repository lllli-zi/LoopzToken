// Provider Adapter 核心接口（TECHNICAL_SOLUTION 6.1）。
// 所有上游（官方、分销、OpenAI 兼容、New API、自定义）通过该接口接入，
// 不绑定单一聚合平台。
package provider

import (
	"context"
	"fmt"
	"net/http"
)

type Protocol string

const (
	ProtocolOpenAIChat          Protocol = "openai_chat"
	ProtocolOpenAIResponses     Protocol = "openai_responses"
	ProtocolAnthropicMessages   Protocol = "anthropic_messages"
	ProtocolGeminiNative        Protocol = "gemini_native"
	ProtocolCustomHTTP          Protocol = "custom_http"
)

// Usage：Token 分类计费（PRD BILL-004）。
type Usage struct {
	InputTokens       int64
	OutputTokens      int64
	CacheWriteTokens  int64
	CacheReadTokens   int64
	ReasoningTokens   int64
}

type GatewayRequest struct {
	ID           string
	UserID       string
	APIKeyID     string
	PublicModel  string
	Protocol     Protocol
	// 骨架阶段 []byte 承载；大请求体分层策略见 TECHNICAL_SOLUTION 13。
	Body []byte
	Header http.Header
}

// ProviderError：错误分类驱动重试 / 熔断决策（11.3 / 12）。
// 认证失败、余额不足等配置类错误 Retryable=false，直接告警摘除。
type ProviderError struct {
	Status    int
	Class     string // auth_failed / quota_exceeded / rate_limited / server_error / network / content_policy / protocol
	Message   string
	Retryable bool
}

func (e *ProviderError) Error() string {
	return fmt.Sprintf("provider error: status=%d class=%s: %s", e.Status, e.Class, e.Message)
}

type ProviderBilling struct {
	RequestID   string
	CostMicros  int64
	Currency    string
}

type ProviderBalance struct {
	BalanceMicros int64
	Currency      string
}

// StreamUsageParser：增量解析 SSE 中的 Usage，不缓存完整模型回复（14）。
type StreamUsageParser interface {
	// Feed 注入一段原始字节；解析出的增量可由实现内部累计。
	Feed(chunk []byte) error
	Usage() Usage
	Err() error
}

type ProviderAdapter interface {
	Name() string
	Supports(model string, protocol Protocol) bool
	BuildUpstreamRequest(ctx context.Context, req *GatewayRequest) (*http.Request, error)
	ParseNonStreamUsage(body []byte) (Usage, error)
	NewStreamParser() StreamUsageParser
	ClassifyError(resp *http.Response, body []byte) ProviderError
	ExtractRequestID(resp *http.Response) string
	QueryBilling(ctx context.Context, providerRequestID string) (*ProviderBilling, error)
	QueryBalance(ctx context.Context) (*ProviderBalance, error)
}
