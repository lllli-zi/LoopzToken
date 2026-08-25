# Anthropic Messages Adapter

对应实现：`services/gateway/internal/provider`（`AnthropicMessagesAdapter`）。

## 协议端点

- `POST /v1/messages`，用户携带 `x-api-key: sk-loopz-...` + `anthropic-version: 2023-06-01`

## 关键约束

- Anthropic 请求优先原生透传（TECHNICAL_SOLUTION 8.3）。
- `anthropic-beta` 使用服务器允许列表，未验证的实验特性不转发。
- 替换用户 `x-api-key` 为上游凭据。

## SSE 解析要点

- 事件：`message_start` / `content_block_delta` / `message_delta` / `message_stop`。
- Usage：`message_start` 初始 `input_tokens`（含 cache 读写）+ `message_delta` 最终 `output_tokens` 累计。
- Prompt Cache：`cache_creation_input_tokens` / `cache_read_input_tokens` 分类计费。

## 错误分类

- `overloaded_error` → server_error（可重试）；`invalid_request_error` → 协议错误（不重试）。

## 验收清单

- [ ] 非流式文本
- [ ] SSE 流式文本
- [ ] Tool Use
- [ ] Extended Thinking（Reasoning Token）
- [ ] Prompt Cache Token 分类
- [ ] anthropic-beta 允许列表
- [ ] 客户端取消传播
- [ ] Claude Code 真实客户端回归
