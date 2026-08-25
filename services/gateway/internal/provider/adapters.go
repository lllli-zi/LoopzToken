// 首发 Adapter 骨架（TECHNICAL_SOLUTION 6.2）。
// 协议细节、错误分类与 Usage 解析随阶段 1 协议兼容测试补齐（24.1）。
package provider

import "context"

// OpenAICompatibleAdapter：/v1/chat/completions 兼容渠道。
// 鉴权注入 Authorization: Bearer <上游凭据>。
type OpenAICompatibleAdapter struct{ BaseAdapter }

func (OpenAICompatibleAdapter) Name() string { return "openai-compatible" }

// OpenAIResponsesAdapter：/v1/responses 协议。
// 非流式响应必须设定最大响应体，不得缓存完整大响应（8.2）。
type OpenAIResponsesAdapter struct{ BaseAdapter }

func (OpenAIResponsesAdapter) Name() string { return "openai-responses" }

// AnthropicMessagesAdapter：/v1/messages 原生透传。
// anthropic-beta 走服务器允许列表，未验证的实验特性不转发（8.3）。
type AnthropicMessagesAdapter struct{ BaseAdapter }

func (AnthropicMessagesAdapter) Name() string { return "anthropic-messages" }

// GeminiNativeAdapter：Gemini 原生协议（MODEL-008，近期增加）。
type GeminiNativeAdapter struct{ BaseAdapter }

func (GeminiNativeAdapter) Name() string { return "gemini-native" }

// NewAPIAdapter：可选内部 New API 集群 Provider（TECHNICAL_SOLUTION 7）。
// 只负责其内部渠道重试；LoopzToken 保持用户、钱包与账本权威。
type NewAPIAdapter struct{ BaseAdapter }

func (NewAPIAdapter) Name() string { return "new-api" }

// CustomHTTPAdapter：经配置验证的自定义 HTTP 上游。
type CustomHTTPAdapter struct{ BaseAdapter }

func (CustomHTTPAdapter) Name() string { return "custom-http" }

// Registry：按名称注册 / 查找 Adapter；配置热加载时替换版本（25.2）。
type Registry struct {
	byName map[string]ProviderAdapter
}

func NewRegistry(adapters ...ProviderAdapter) *Registry {
	r := &Registry{byName: make(map[string]ProviderAdapter, len(adapters))}
	for _, a := range adapters {
		r.byName[a.Name()] = a
	}
	return r
}

func (r *Registry) Get(name string) (ProviderAdapter, bool) {
	a, ok := r.byName[name]
	return a, ok
}

// 默认注册表：首发全部 Adapter 骨架。
func DefaultRegistry() *Registry {
	return NewRegistry(
		OpenAICompatibleAdapter{},
		OpenAIResponsesAdapter{},
		AnthropicMessagesAdapter{},
		GeminiNativeAdapter{},
		NewAPIAdapter{},
		CustomHTTPAdapter{},
	)
}

var _ = context.Background
