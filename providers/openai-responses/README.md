# OpenAI Responses Adapter

对应实现：`services/gateway/internal/provider`（`OpenAIResponsesAdapter`）。

## 协议端点

- `POST /v1/responses`（Responses 协议，事件流）

## 关键约束

- Gateway 必须增量解析 Responses 事件流，不得读取并缓存完整非流式大响应（TECHNICAL_SOLUTION 8.2）。
- 非流式响应设定最大响应体上限。

## SSE 解析要点

- 事件类型：`response.output_text.delta`、`response.completed` 等；Usage 在 `response.completed` 的 `usage`。
- 每种事件独立状态机，不与其他协议共用解析器。

## 验收清单

- [ ] 非流式文本
- [ ] SSE 事件流文本
- [ ] Tool Calling / Function Call
- [ ] Reasoning（reasoning item）
- [ ] 错误格式与分类
- [ ] 客户端取消传播
- [ ] Usage 解析
- [ ] 大响应上限生效
- [ ] Codex 等真实客户端回归
