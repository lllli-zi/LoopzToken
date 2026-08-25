# Custom HTTP Adapter

对应实现：`services/gateway/internal/provider`（`CustomHTTPAdapter`）。

## 用途

经配置验证的自定义 HTTP 上游：非标准 OpenAI 兼容接口、经授权的分销渠道专用协议等。

## 安全约束（TECHNICAL_SOLUTION 9）

- 上游 base_url 只能由运营在 Provider 配置中设定；用户不能指定任意 `base_url`（防 SSRF）。
- 请求头严格允许列表：`Content-Type` / `Accept` / `User-Agent` / 协议版本头 / 验证过的业务扩展头。
- 禁止透传：`Cookie` / `Host` / `Connection` / `Forwarded` / `X-Forwarded-*` / `Proxy-Connection` / `Transfer-Encoding`。

## 接入要求

1. 上游书面授权与可转售范围确认（上线前决策门）。
2. 协议兼容测试（24.1）全项通过后才可加入候选集合。
3. 配置版本化，可立即降权或摘除（25.3）。

## 验收清单

- [ ] 请求头允许列表生效
- [ ] 禁止透传头全部剥离
- [ ] SSRF 防护（base_url 白名单）
- [ ] 错误分类
- [ ] Usage 解析或账单查询路径
