# OpenAI Compatible Adapter

对应实现：`services/gateway/internal/provider`（`OpenAICompatibleAdapter`）。

## 协议端点

- `POST /v1/chat/completions`（流式 / 非流式、Tool Calling、Usage 扩展）

## 鉴权注入

- 删除用户 `Authorization` 后注入 `Authorization: Bearer <上游凭据>`（凭据来自 KMS / Secret Manager 引用）。

## SSE 解析要点

- 增量解析 `chat.completion.chunk`；最终 Usage 在最后一个 chunk 的 `usage` 字段（`stream_options.include_usage` 可请求）。
- 不缓存完整模型回复；单 Event 超过 1 MB 终止并记录。

## 错误分类

| 上游 | 分类 | 可重试 |
| --- | --- | --- |
| 401 / 403 | auth_failed（告警摘除，不重试） | 否 |
| 402 / 余额类 | quota_exceeded | 否 |
| 429 | rate_limited（按 Retry-After 与重试预算） | 视预算 |
| 5xx / 连接失败 | server_error / network | 是（预算内） |

## 验收清单（TECHNICAL_SOLUTION 24.1）

- [ ] 非流式文本
- [ ] SSE 流式文本
- [ ] Tool Calling
- [ ] Reasoning
- [ ] Prompt Cache（cache 读写 Token 分类）
- [ ] 错误格式与分类
- [ ] 客户端取消传播
- [ ] Usage 解析（流式 / 非流式）
- [ ] 大请求与大响应
- [ ] OpenAI SDK 真实客户端回归
