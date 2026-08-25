# Gemini Native Adapter（近期增加）

对应实现：`services/gateway/internal/provider`（`GeminiNativeAdapter`）。

## 协议端点

- `POST /v1beta/models/{model}:generateContent` / `:streamGenerateContent`
- 用户鉴权头 `x-goog-api-key: sk-loopz-...`（Gateway 校验后替换为上游凭据）

## SSE 解析要点

- `streamGenerateContent` 为 JSON 数组流（`alt=sse` 时为 SSE）；`usageMetadata` 随块增量更新。
- Token 分类：`promptTokenCount` / `candidatesTokenCount` / `thoughtsTokenCount` / `cachedContentTokenCount`。

## 验收清单

- [ ] 非流式文本
- [ ] 流式文本
- [ ] Function Calling
- [ ] Thinking Token 分类
- [ ] Context Caching Token
- [ ] 错误格式与分类
- [ ] 客户端取消传播
- [ ] Usage 解析
