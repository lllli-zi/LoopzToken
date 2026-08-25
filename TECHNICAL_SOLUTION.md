# LoopzToken 技术方案

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 系统 | LoopzToken 多模型 API 商业平台 |
| 目标 | 支持多渠道、正式支付、准确计费和高并发流式调用 |
| 架构阶段 | 分阶段生产架构（首期精简、按容量演进） |
| 更新日期 | 2026-08-25 |

## 2. 关键架构结论

1. LoopzToken 自建统一数据面，用户请求只访问 Loopz Gateway。
2. 所有上游通过可插拔 Provider Adapter 接入，不绑定单一聚合平台。
3. New API 可以作为一个可选内部 Provider，用于快速管理部分长尾渠道，但不是系统必需组件。
4. LoopzToken 是用户身份、API Key、人民币钱包、价格和账本的唯一权威系统。
5. Gateway 与 Billing 使用 Go，控制台与运营系统使用 TypeScript。
6. PostgreSQL 保存权威业务与账务数据；Redis 只用于缓存、限流和临时协调。
7. 首期使用 PostgreSQL Outbox 和聚合表承载可靠事件与运营统计；达到升级阈值后再引入消息队列和 ClickHouse，分析系统始终不能修改钱包。
8. 同一请求只能选择一条 Provider 路径，禁止无意义地串联多个聚合网关。
9. 首期只保留业务闭环所需组件，目标架构通过兼容接口和 Outbox 预留扩展点，不提前承担 Kafka、ClickHouse 和 Kubernetes 的运维成本。

## 3. 设计基线

| 指标 | 首发设计基线 |
| --- | --- |
| SSE 并发连接 | 3,000 |
| 新请求峰值 | 100 RPS |
| 请求体上限 | 32 MB |
| 单次最长请求 | 600 秒 |
| 平台可用性 | 99.9% |
| Gateway 附加延迟 | P95 < 30 ms |
| 资金差错 | 负余额、重复充值、重复扣费均为 0 |

容量基线必须通过压测确认；如果业务目标提升到 5,000 或 10,000 并发，应调整实例数量而不是修改核心架构。

### 3.1 分阶段落地原则

| 能力 | 首期生产版本 | 达到阈值后演进 |
| --- | --- | --- |
| 运行平台 | 云主机或托管容器，多实例部署 | 托管 Kubernetes |
| 可靠事件 | PostgreSQL Outbox + Worker | Redpanda 或 Kafka |
| 统计分析 | PostgreSQL 汇总表和只读查询 | ClickHouse |
| 日志与指标 | 托管日志、Prometheus、Grafana | Loki、Tempo 和统一观测平台 |
| 容灾 | 单地域多可用区、数据库主备 | 第二地域和独立 Provider Egress |

升级遵循“指标触发”，不按时间表强制引入组件：

- Outbox 积压持续超过 5 分钟，或 Worker 扩容后仍无法在目标时间内消费时，引入消息队列。
- PostgreSQL 统计查询持续影响在线事务，或用量明细达到亿级并需要近实时多维分析时，引入 ClickHouse。
- 服务数量、发布频率或弹性需求使托管容器无法稳定运维时，再迁移 Kubernetes。
- 所有升级必须保持账本、支付和结算事务仍以 PostgreSQL 为唯一权威来源。

### 3.2 首期组件边界

首期必须部署：Web、Control API、Loopz Gateway、Billing Service、Worker、PostgreSQL、Redis、对象存储、KMS/Secret Manager、WAF/负载均衡和基础监控。

首期暂不强制部署：Redpanda/Kafka、ClickHouse、Kubernetes、跨地域数据库。代码需要保留 Outbox Publisher、Analytics Sink 和部署抽象，使后续扩展不改动核心账务模型。

## 4. 总体架构

下图展示可演进的完整目标架构。首期只启用 PostgreSQL、Redis 和托管运行环境；Redpanda/Kafka、ClickHouse 与 Kubernetes 属于达到指标阈值后的扩展组件，不是正式上线的前置条件。

<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0 14px 0;"><div style="padding:10px;border:2px solid #2563eb;border-radius:6px;background:#eff6ff;color:#1e3a8a;font-size:12px;"><strong>首期生产必选</strong><br>Gateway / Billing / Control API / Worker / PostgreSQL / Redis / 托管日志监控</div><div style="padding:10px;border:1px dashed #7c3aed;border-radius:6px;background:#f5f3ff;color:#4c1d95;font-size:12px;"><strong>容量触发后启用</strong><br>Redpanda 或 Kafka / ClickHouse / Kubernetes / 跨地域容灾</div></div>

<div style="width:1200px;box-sizing:border-box;position:relative;background:#fafbfc;padding:20px;border-radius:6px;border:1px solid #e5e7eb;"><style scoped>.arch-wrapper{display:flex;gap:12px}.arch-sidebar{width:165px;flex-shrink:0}.arch-main{flex:1;min-width:0}.arch-title{text-align:center;font-size:22px;font-weight:bold;color:#1f2937;margin-bottom:16px}.arch-layer{margin:8px 0;padding:14px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.04)}.arch-layer-title{font-size:13px;font-weight:bold;margin-bottom:10px;text-align:center}.arch-grid{display:grid;gap:8px}.arch-grid-2{grid-template-columns:repeat(2,1fr)}.arch-grid-3{grid-template-columns:repeat(3,1fr)}.arch-grid-4{grid-template-columns:repeat(4,1fr)}.arch-box{border-radius:4px;padding:8px;text-align:center;font-size:11px;font-weight:600;line-height:1.35;color:#1f2937;background:#fff;border:1px solid #e5e7eb}.arch-box.highlight{background:#f3f4f6;border:2px solid #6b7280}.arch-box.tech{font-size:10px;color:#6b7280;background:#f9fafb}.user{background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border:2px solid #3b82f6}.user .arch-layer-title{color:#1d4ed8}.application{background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%);border:2px solid #d97706}.application .arch-layer-title{color:#92400e}.ai{background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border:2px solid #16a34a}.ai .arch-layer-title{color:#15803d}.data{background:linear-gradient(135deg,#fdf2f8 0%,#fce7f3 100%);border:2px solid #db2777}.data .arch-layer-title{color:#9d174d}.infra{background:linear-gradient(135deg,#f3f4f6 0%,#e5e7eb 100%);border:2px solid #6b7280}.infra .arch-layer-title{color:#374151}.external{background:linear-gradient(135deg,#f9fafb 0%,#f3f4f6 100%);border:1px dashed #d1d5db}.external .arch-layer-title{color:#6b7280}.arch-sidebar-panel{border-radius:6px;padding:10px;background:linear-gradient(135deg,#f3f4f6 0%,#e5e7eb 100%);border:1px solid #d1d5db;margin-bottom:8px}.arch-sidebar-title{font-size:12px;font-weight:bold;text-align:center;color:#1f2937;margin-bottom:6px}.arch-sidebar-item{font-size:10px;text-align:center;color:#374151;background:#fff;padding:5px;border-radius:3px;margin:3px 0;border:1px solid #e5e7eb}.arch-sidebar-item.metric{background:#f3f4f6;border:1px solid #9ca3af;color:#1f2937;font-weight:600}</style><div class="arch-title">LoopzToken 成熟生产架构</div><div class="arch-wrapper"><div class="arch-sidebar"><div class="arch-sidebar-panel"><div class="arch-sidebar-title">可观测性</div><div class="arch-sidebar-item">OpenTelemetry</div><div class="arch-sidebar-item">Prometheus</div><div class="arch-sidebar-item">Grafana</div><div class="arch-sidebar-item">Loki / Tempo</div></div><div class="arch-sidebar-panel"><div class="arch-sidebar-title">容量目标</div><div class="arch-sidebar-item metric">3,000 SSE</div><div class="arch-sidebar-item metric">100 RPS</div><div class="arch-sidebar-item metric">32 MB Body</div><div class="arch-sidebar-item metric">600s Duration</div></div><div class="arch-sidebar-panel"><div class="arch-sidebar-title">运维</div><div class="arch-sidebar-item">CI/CD</div><div class="arch-sidebar-item">灰度发布</div><div class="arch-sidebar-item">自动扩缩容</div><div class="arch-sidebar-item">备份恢复</div></div></div><div class="arch-main"><div class="arch-layer user"><div class="arch-layer-title">接入层</div><div class="arch-grid arch-grid-4"><div class="arch-box">Claude Code<br><small>Anthropic</small></div><div class="arch-box">Codex / Cursor<br><small>OpenAI</small></div><div class="arch-box">用户控制台<br><small>React / Rsbuild</small></div><div class="arch-box">运营后台<br><small>React / Rsbuild</small></div></div></div><div class="arch-layer application"><div class="arch-layer-title">LoopzToken 数据面与控制面</div><div class="arch-grid arch-grid-3"><div class="arch-box highlight">Loopz Gateway<br><small>Go / SSE / Routing</small></div><div class="arch-box highlight">Billing Service<br><small>Go / Ledger</small></div><div class="arch-box">Control API<br><small>NestJS / Fastify</small></div></div><div class="arch-grid arch-grid-3" style="margin-top:8px"><div class="arch-box">Identity & API Key</div><div class="arch-box">Payment & Refund</div><div class="arch-box">Worker & Reconcile</div></div></div><div class="arch-layer ai"><div class="arch-layer-title">Provider 路由与协议层</div><div class="arch-grid arch-grid-4"><div class="arch-box highlight">Provider Router<br><small>Policy / Circuit Breaker</small></div><div class="arch-box">OpenAI Adapter</div><div class="arch-box">Anthropic Adapter</div><div class="arch-box">Gemini / Custom Adapter</div></div></div><div class="arch-layer data"><div class="arch-layer-title">数据与事件</div><div class="arch-grid arch-grid-4"><div class="arch-box tech">PostgreSQL HA<br><small>权威账本</small></div><div class="arch-box tech">Redis HA<br><small>限流与缓存</small></div><div class="arch-box tech">Redpanda / Kafka<br><small>用量事件</small></div><div class="arch-box tech">ClickHouse<br><small>统计分析</small></div></div></div><div class="arch-layer infra"><div class="arch-layer-title">基础设施</div><div class="arch-grid arch-grid-4"><div class="arch-box tech">云 WAF / LB</div><div class="arch-box tech">托管 Kubernetes</div><div class="arch-box tech">KMS / Secret Manager</div><div class="arch-box tech">对象存储 / 备份</div></div></div><div class="arch-layer external"><div class="arch-layer-title">任意合法授权上游</div><div class="arch-grid arch-grid-4"><div class="arch-box tech">官方模型 API</div><div class="arch-box tech">授权分销渠道</div><div class="arch-box tech">OpenAI-Compatible</div><div class="arch-box tech">可选 New API 集群</div></div></div></div><div class="arch-sidebar"><div class="arch-sidebar-panel"><div class="arch-sidebar-title">安全</div><div class="arch-sidebar-item">API Key HMAC</div><div class="arch-sidebar-item">KMS 密钥管理</div><div class="arch-sidebar-item">WAF / DDoS</div><div class="arch-sidebar-item">管理员 2FA</div></div><div class="arch-sidebar-panel"><div class="arch-sidebar-title">账务原则</div><div class="arch-sidebar-item">整数金额</div><div class="arch-sidebar-item">不可变流水</div><div class="arch-sidebar-item">预冻结 / 结算</div><div class="arch-sidebar-item">幂等 / 对账</div></div><div class="arch-sidebar-panel"><div class="arch-sidebar-title">治理</div><div class="arch-sidebar-item">模型不偷换</div><div class="arch-sidebar-item">协议原生透传</div><div class="arch-sidebar-item">内容默认不落盘</div><div class="arch-sidebar-item">全链路审计</div></div></div></div></div>

## 5. 服务划分

### 5.1 Loopz Gateway

技术栈：Go、标准库 `net/http` 或轻量路由器、`pgx`、`go-redis`、OpenTelemetry。

职责：

- 对外提供统一模型 API。
- 验证 LoopzToken API Key。
- 检查用户、模型和 Key 权限。
- 执行用户、Key、模型和 Provider 多级限流。
- 调用 Billing Service 预冻结余额。
- 选择 Provider Deployment。
- 替换用户鉴权头并注入上游凭据。
- 原生转发请求与 SSE 响应。
- 增量解析用量事件，不缓存完整模型回复。
- 捕获上游 Request ID、状态和错误。
- 完成结算或提交待结算任务。
- 输出结构化日志、指标和 Trace。

Gateway 必须是无状态服务，可水平扩展。状态存放在 PostgreSQL、Redis 或事件系统中。

### 5.2 Billing Service

技术栈：Go、`pgx`、PostgreSQL、OpenTelemetry。

职责：

- 钱包查询。
- 余额预冻结。
- 最终结算。
- 冻结释放。
- 充值入账。
- 退款扣减。
- 人工调整。
- 幂等检查。
- 不可变账本流水。
- 价格版本计算。

接口示例：

```text
POST /internal/v1/billing/reservations
POST /internal/v1/billing/reservations/{id}/settle
POST /internal/v1/billing/reservations/{id}/release
POST /internal/v1/billing/recharges
POST /internal/v1/billing/refunds
GET  /internal/v1/wallets/{user_id}
```

所有写接口必须携带 `idempotency_key`，数据库建立唯一约束。

### 5.3 Control API

技术栈：TypeScript、NestJS、Fastify Adapter、Prisma。

职责：

- 注册、登录、验证码和会话。
- 用户资料与协议同意记录。
- API Key 管理。
- 模型、价格和 Provider 配置。
- 订单、支付、退款和工单。
- 用户控制台与运营后台 API。
- 管理员 RBAC 和审计。

Control API 不处理模型长连接。

### 5.4 Worker

技术栈：TypeScript 或 Go、PostgreSQL Outbox、定时调度；规模化后增加消息队列客户端。

职责：

- 支付通知补偿和主动查单。
- 上游账单查询。
- 请求待结算补偿。
- 日终支付、钱包和上游成本对账。
- 邮件、短信和告警通知。
- 模型健康检查。
- 汇率和价格辅助更新。
- 首期 PostgreSQL 汇总表写入；规模化后增加 ClickHouse 数据写入。

### 5.5 Web

技术栈：Bun、React 19、TypeScript、Rsbuild 2、TanStack Router、TanStack Query、Tailwind CSS 4、Base UI、shadcn、Zustand。

一个 React SPA 同时承载：

- 官网。
- 文档。
- 用户控制台。
- 运营后台。

根据路由和角色隔离页面，不在首发阶段拆成多个前端仓库。

## 6. Provider Adapter 架构

### 6.1 核心接口

```go
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
```

### 6.2 首发 Adapter

- `OpenAICompatibleAdapter`
- `AnthropicMessagesAdapter`
- `OpenAIResponsesAdapter`
- `CustomHTTPAdapter`

近期增加：

- `GeminiNativeAdapter`
- `NewAPIAdapter`
- 官方供应商专用 Adapter

### 6.3 Provider 与 Deployment

Provider 表示供应商或聚合平台；Deployment 表示某个模型在某个 Provider 上的具体部署。

```text
公开模型
└─ Deployment A：Provider A / 上游模型 X
└─ Deployment B：Provider B / 上游模型 X
└─ Deployment C：Provider C / 上游模型 X
```

只有经过模型身份、能力、上下文、工具调用和价格验证的部署，才能加入同一个公开模型的候选集合。

## 7. New API 的边界

New API 作为可选组件时：

```text
Loopz Gateway
→ NewAPIAdapter
→ 内部 New API 集群
→ New API 管理的多个上游渠道
```

适合：

- 快速接入大量 OpenAI 兼容长尾渠道。
- 使用其渠道后台、模型映射、权重和健康检查。
- 在非核心模型上降低重复适配成本。

不负责：

- LoopzToken 用户登录。
- 用户 API Key 权威鉴权。
- 人民币钱包。
- 支付订单。
- 用户销售价格。
- 权威 Token 账本。

是否启用 New API 由真实渠道数量和适配成本决定。首发代码必须在不部署 New API 时也能运行。

## 8. 对外协议

### 8.1 OpenAI Chat Completions

```text
POST /v1/chat/completions
Authorization: Bearer sk-loopz-...
```

支持流式与非流式、Tool Calling、Reasoning 和 Usage 扩展；具体能力由公开模型配置声明。

### 8.2 OpenAI Responses

```text
POST /v1/responses
Authorization: Bearer sk-loopz-...
```

Gateway 必须增量解析 Responses 事件，不得读取并缓存完整非流式大响应。非流式响应需要设定明确的最大响应体。

### 8.3 Anthropic Messages

```text
POST /v1/messages
x-api-key: sk-loopz-...
anthropic-version: 2023-06-01
```

Anthropic 请求优先原生透传。`anthropic-beta` 使用服务器允许列表，未验证的实验特性不转发。

### 8.4 Models

```text
GET /v1/models
```

只返回当前用户和 API Key 有权使用、当前存在健康 Deployment 的公开模型。

## 9. 请求头与网络安全

### 9.1 用户鉴权头

Gateway 验证后必须删除用户提交的：

```text
Authorization
x-api-key
x-goog-api-key
Proxy-Authorization
```

然后由 Provider Adapter 注入对应上游凭据。

### 9.2 禁止透传

```text
Cookie
Host
Connection
Forwarded
X-Forwarded-*
Proxy-Connection
Transfer-Encoding
```

### 9.3 允许列表

根据协议允许：

```text
Content-Type
Accept
User-Agent
anthropic-version
经过验证的 anthropic-beta
经过验证的业务扩展头
```

用户不能指定任意 `base_url`，避免 SSRF。

## 10. API Key 设计

格式：

```text
sk-loopz_<public_id>_<secret>
```

存储：

```text
public_id
key_prefix
HMAC-SHA256(secret, server_pepper)
status
expires_at
model_permissions
rate_limit_profile
```

完整 Key 只展示一次。`server_pepper` 存入 KMS 或 Secret Manager，不进入数据库、Git 和日志。

鉴权流程：

1. 从 Key 解析 `public_id`。
2. 查询 Redis Key 元数据缓存。
3. 使用恒定时间比较验证 HMAC。
4. 检查用户和 Key 状态。
5. 检查模型、IP 和预算限制。

## 11. 路由算法

### 11.1 候选过滤

按顺序排除：

1. Provider 或 Deployment 已禁用。
2. 不支持请求协议。
3. 公开模型映射不匹配。
4. 处于熔断状态。
5. 达到并发、RPM 或 TPM 上限。
6. 上游余额低于安全阈值。
7. 用户组无权使用。
8. 价格或毛利规则不满足。

### 11.2 评分

候选评分可组合：

```text
静态优先级
+ 成功率得分
+ 首 Token 延迟得分
+ 可用容量得分
+ 成本得分
+ 地域偏好
```

首发应采用可解释的加权规则，不引入不可解释的机器学习路由。

### 11.3 熔断

- 连续错误或滑动窗口错误率超过阈值时打开熔断器。
- 熔断期间不选择该 Deployment。
- 冷却后进入半开状态，允许少量探测请求。
- 探测恢复后关闭熔断。
- 认证失败、余额不足等配置类错误直接告警并摘除，不自动高频重试。

## 12. 重试与故障切换

### 12.1 单一重试责任

必须避免多层重试相乘。

```text
Loopz Gateway：负责跨 Provider 切换
New API：如被选中，只负责其内部渠道重试
官方直连 Adapter：由 Loopz Gateway 管理有限重试
```

### 12.2 可切换条件

只有同时满足以下条件才允许跨 Provider 切换：

- 未向用户发送响应头或首个 SSE 数据。
- 错误被分类为可重试。
- 请求语义允许重试。
- 上一 Provider 是否产生费用可以核对。
- 没有超过整个请求的重试预算。

开始输出后禁止切换，避免拼接两个上游响应。

### 12.3 重试预算

建议首发：

```text
跨 Provider 最大切换：1 次
整个请求最大尝试：2 次
认证、参数、余额、内容安全错误：0 次
429 / 5xx / 连接失败：根据 Retry-After 和剩余预算判断
```

## 13. 大请求体处理

禁止直接对所有请求执行完整 `ReadAll`。

建议策略：

```text
≤ 2 MB：使用受控内存池
2 MB ～ 32 MB：写入受限临时文件并增量解析必要字段
> 32 MB：返回 413
```

要求：

- 临时文件目录独立挂载并设置容量上限。
- 请求结束、取消或超时后立即删除。
- 不进入普通日志和备份。
- 容器磁盘空间超过阈值时拒绝大请求。
- 对压缩请求按解压后大小限制，防止压缩炸弹。

如果后续确认所有目标客户端将 `model` 和输出限制放在请求前部，可进一步实现边读边解析和转发，但不能依赖未经验证的字段顺序。

## 14. SSE 流式处理

数据路径：

```text
上游响应
├─ 原始字节 → 下游客户端
└─ 有界副本 → 协议解析器 → Usage / Request ID / Error
```

要求：

- 不累积完整响应。
- 按客户端消费速度执行背压。
- 慢客户端超过阈值时主动断开。
- 感知客户端取消，并取消上游请求 Context。
- 每种协议使用独立状态机解析器。
- 限制单个 SSE Event 大小，超过上限时终止并记录。
- 每个响应 Flush，反向代理关闭响应缓冲。

解析器：

```text
OpenAIChatStreamParser
OpenAIResponsesStreamParser
AnthropicMessagesStreamParser
GeminiStreamParser
```

## 15. 钱包、冻结与结算

### 15.1 金额单位

```text
1 CNY = 1,000,000 micro-CNY
1 USD = 1,000,000 micro-USD
```

数据库使用 `BIGINT`，业务层禁止浮点运算。价格计算使用整数或任意精度十进制，并定义统一舍入规则。

### 15.2 预冻结

冻结金额由以下内容组成：

```text
已知输入估算
+ 最大输出费用
+ 缓存写入安全余量
+ 服务等级附加费用
```

如果用户未提交输出上限，Gateway 注入平台默认上限或拒绝无法安全估算的请求。

### 15.3 结算事务

同一数据库事务内：

1. 锁定 reservation。
2. 检查结算幂等键。
3. 计算最终费用。
4. 从冻结余额扣除实际费用。
5. 释放剩余冻结金额。
6. 插入不可变钱包流水。
7. 更新 reservation 和 request 状态。
8. 写入 Outbox 事件。

### 15.4 待结算

以下情况进入 `pending_billing`：

- 用户中途断开。
- 流式响应缺失最终 Usage。
- 上游返回成功但本地解析失败。
- 上游成本查询存在延迟。

Worker 根据 Provider Request ID 查询真实账单。超过处理期限仍无法确认时进入人工队列，不能永久冻结用户全部余额。

### 15.5 请求计费状态机

```text
created
  → reserved
  → upstream_started
  → streaming
  → settled

任意可恢复异常 → pending_billing → settled / released / manual_review
未调用上游      → released
```

约束：

- `request_id`、`reservation_id`、`attempt_id` 和 `price_version_id` 在请求开始后不可变。
- 每次上游尝试单独记录费用证据，跨 Provider 重试不能覆盖前一次尝试。
- `settled` 和 `released` 是终态；相同幂等键重复调用必须返回原结果。
- 结算不能只依赖客户端是否收到完整响应，必须结合本地解析结果、Provider Request ID 和上游账单。
- `pending_billing` 默认 5 分钟内自动处理，超过 24 小时进入人工复核并触发告警。
- 无法确认费用时按合同和用户规则处理，不允许通过无限期冻结把不确定性转嫁给用户。

### 15.6 Usage 证据优先级

```text
上游签名账单或官方账单 API
> 上游最终 Usage 字段
> 协议流中的累计 Usage
> 本地 tokenizer 估算
```

本地估算只能用于预冻结、实时展示或合同明确允许的兜底结算。每条结算记录必须保存 `usage_source`、解析器版本和估算标记，便于复核。

## 16. 支付架构

### 16.1 支付 Provider

```ts
interface PaymentProvider {
  createPayment(order: Order): Promise<PaymentResult>;
  verifyNotification(raw: Buffer, headers: Record<string, string>): Promise<PaymentNotification>;
  queryPayment(orderNo: string): Promise<PaymentStatus>;
  refund(request: RefundRequest): Promise<RefundResult>;
}
```

实现：

- `MockPaymentProvider`：开发和自动化测试。
- `WeChatPaymentProvider`：微信官方商户接口。
- `AlipayPaymentProvider`：支付宝官方商户接口。

### 16.2 支付状态机

```text
pending → paying → paid → credited
                  ├→ refunding → refunded
                  └→ compensation_required
pending / paying → closed
```

### 16.3 支付安全

- 只相信异步通知或主动查单。
- 严格验签并校验商户、应用、订单号、币种和金额。
- 支付流水号建立唯一索引。
- 回调原始数据加密或脱敏保存。
- 入账和订单状态更新通过 Outbox 保证最终一致。
- 定时查询“已支付未入账”和“退款处理中”订单。

## 17. 数据库设计

### 17.1 业务表

```text
users
user_sessions
user_consents
admin_roles
api_keys
api_key_permissions
models
model_aliases
model_price_versions
providers
provider_credentials
model_deployments
routing_policies
```

### 17.2 账务表

```text
wallets
wallet_reservations
wallet_ledger
orders
payment_attempts
payment_notifications
refunds
settlements
reconciliations
```

### 17.3 请求表

```text
api_requests
request_attempts
usage_records
provider_billing_records
```

核心关联：

```text
api_request
├─ wallet_reservation
├─ price_version
├─ request_attempt 1
├─ request_attempt 2
├─ usage_record
├─ settlement
└─ provider_billing_record
```

### 17.4 审计与可靠性

```text
audit_logs
outbox_events
idempotency_records
risk_events
support_tickets
```

### 17.5 分区与保留

- `api_requests`、`usage_records`、`request_attempts` 按月分区。
- 权威账务流水长期保留，具体期限按财税和合规要求确认。
- 请求元数据根据运营和合规需求设定生命周期。
- Prompt 和模型输出默认不存储。

## 18. Redis 设计

Redis 用途：

- API Key 元数据缓存。
- 用户、Key、模型、Provider 多级限流。
- 并发连接计数。
- Provider 健康状态短缓存。
- 短期幂等和防重放辅助。
- Session 和验证码。

Redis 不作为：

- 钱包权威余额。
- 支付权威状态。
- 唯一账本。
- 永久请求记录。

Redis 故障时：

- 已鉴权模型请求可以按策略降级到数据库鉴权或拒绝新增请求。
- 不允许绕过余额检查。
- 控制面非关键查询可以短时降级。

## 19. 事件与分析

### 19.1 Outbox

业务事务将事件写入 PostgreSQL `outbox_events`，避免数据库已提交但业务事件丢失。

首期由 Worker 使用 `FOR UPDATE SKIP LOCKED` 分批领取事件，写入通知、聚合表或外部系统，并记录重试次数和下一次执行时间。达到第 3.1 节升级阈值后，Outbox Publisher 再将事件投递到 Redpanda/Kafka。引入队列不改变事件 Schema 和账务事务边界。

事件示例：

```text
request.completed
request.failed
billing.settled
payment.credited
refund.completed
provider.health_changed
```

### 19.2 ClickHouse

ClickHouse 是规模化阶段的分析存储，首期不强制部署。首期每日/月度用量、毛利和 Provider 质量统计使用 PostgreSQL 增量汇总表，用户明细查询必须按时间和用户分区并限制查询范围。

用于：

- 请求趋势。
- Token 分类统计。
- 模型、用户和 Key 分析。
- 首 Token、总耗时和错误率。
- Provider 成功率与成本。
- 实时毛利。

ClickHouse 故障不影响模型调用和资金结算。

## 20. 可观测性

### 20.1 Trace

统一字段：

```text
loopz_request_id
trace_id
user_id
api_key_id
public_model
protocol
provider_id
deployment_id
provider_request_id
attempt_no
```

不写入 Prompt、完整响应、完整 Key 和支付密钥。

### 20.2 Metrics

```text
gateway_active_streams
gateway_requests_total
gateway_request_body_bytes
gateway_stream_bytes_total
gateway_ttft_seconds
gateway_duration_seconds
gateway_disconnects_total
provider_requests_total
provider_circuit_state
billing_reservations_total
billing_pending_total
payment_uncredited_total
wallet_negative_total
reconciliation_difference_amount
```

### 20.3 告警

- 请求成功率连续 5 分钟低于阈值。
- Provider 错误率、429 或延迟异常。
- 负余额数量大于 0。
- 支付成功超过 1 分钟未到账。
- 待结算超过处理时限。
- 毛利低于模型阈值。
- 上游余额不足。
- 数据库、Redis、队列或备份异常。
- Gateway 内存持续增长或连接数接近容量。

## 21. 安全设计

### 21.1 身份与权限

- 用户密码使用 Argon2id。
- 管理员强制 2FA。
- 管理接口 RBAC 和最小权限。
- 高风险资金操作二次确认并审计。
- 内部服务使用 mTLS 或云内网身份认证。

### 21.2 密钥

- 上游凭据使用 KMS 或 Secret Manager。
- 数据库只保存密钥引用或加密密文。
- 密钥支持轮换、禁用和使用审计。
- 前端构建产物不得包含任何服务端凭据。

### 21.3 API 安全

- 云 WAF 与 DDoS 防护。
- 请求体和 Header 大小限制。
- 防止 SSRF、请求走私和 Host Header 攻击。
- 参数 Schema 校验。
- CORS 仅允许产品域名。
- 管理端限制来源和登录频率。

### 21.4 数据安全

- 全链路 TLS。
- 数据库加密和备份加密。
- 日志脱敏。
- 内容日志默认关闭。
- 调试内容设置短期 TTL 和用户主动授权。

## 22. 部署拓扑

### 22.1 首期生产环境

优先使用国内云厂商托管容器服务或固定规格云主机，减少首期集群运维。所有服务保持容器化和无状态，后续可迁移到 Kubernetes：

```text
云 WAF / 负载均衡
├─ Gateway × 3 起
├─ Billing × 2 起
├─ Control API × 2 起
└─ Worker × 2 起

托管服务
├─ PostgreSQL 主备
├─ Redis 高可用
├─ 对象存储
├─ KMS / Secret Manager
├─ 日志、指标和告警
└─ CDN / 静态 Web
```

Worker 首期直接消费 PostgreSQL Outbox。Redpanda/Kafka 和 ClickHouse 不在首期依赖链中。

如果上游只能从特定地域稳定访问，可以在相应地域部署独立 Gateway Provider Egress 节点；用户、钱包和支付数据的部署区域及跨境路径需要单独进行合规设计。

### 22.2 规模化拓扑

达到升级阈值后，切换为托管 Kubernetes，并增加：

```text
Redpanda / Kafka：事件扇出和削峰
ClickHouse：高基数用量与毛利分析
独立 Analytics Consumer：消费分析事件
第二地域 Provider Egress：改善特定上游链路
```

迁移期间 PostgreSQL 仍是钱包、订单、支付和结算的唯一权威数据源。

### 22.3 初始实例估算

```text
Gateway：3 × 4C8G
Billing：2 × 2C4G
Control API：2 × 2C4G
Worker：2 × 2C4G
Web：对象存储 + CDN，不运行常驻应用实例
```

这是压测起点而不是最终承诺。Gateway 单实例连接数、内存占用和吞吐必须用真实协议负载校准。

### 22.4 超时

建议起始值：

```text
总请求上限：600 秒
连接超时：10 秒
首 Token 超时：120 秒
流空闲超时：180 秒
控制面请求超时：15 秒
Billing 内部请求超时：3 秒
```

不同模型可以覆盖默认值，但必须有平台硬上限。

## 23. 代码仓库结构

```text
LoopzToken/
├── apps/
│   ├── web/                       # React + Rsbuild 官网、控制台和后台
│   ├── control-api/               # NestJS 业务控制面
│   └── worker/                    # 支付、对账和通知任务
├── services/
│   ├── gateway/                   # Go 高并发数据面
│   └── billing/                   # Go 权威钱包与结算
├── packages/
│   ├── contracts/                 # API 与事件 Schema
│   ├── database/                  # Prisma Schema 与迁移
│   ├── payment/                   # 微信、支付宝 Adapter
│   ├── ui/                        # 共享组件
│   └── config/                    # 共享配置定义
├── providers/
│   ├── openai-compatible/
│   ├── openai-responses/
│   ├── anthropic-messages/
│   ├── gemini-native/
│   ├── new-api/
│   └── custom-http/
├── infra/
│   ├── docker/
│   ├── kubernetes/
│   ├── monitoring/
│   ├── load-testing/
│   └── backup/
├── docs/
├── PRD.md
├── UI_TECH_STACK.md
└── TECHNICAL_SOLUTION.md
```

Go 与 TypeScript 之间通过版本化 OpenAPI、JSON Schema 或 Protobuf 契约协作，不复制手写 DTO。

## 24. 测试方案

### 24.1 协议兼容测试

每个 Adapter 必须验证：

- 非流式文本。
- SSE 流式文本。
- Tool Calling。
- Reasoning / Thinking。
- Prompt Cache。
- 错误格式。
- 客户端取消。
- Usage 解析。
- 大请求和大响应。

真实客户端：

- OpenAI SDK。
- Anthropic SDK。
- Codex。
- Claude Code。
- Cursor 或同类工具。

### 24.2 账务测试

- 并发冻结同一钱包。
- 重复结算。
- 重复释放。
- 支付回调重复。
- 支付到账中断后补偿。
- 用户中途断开。
- 上游有费用但无 Usage。
- 价格切换期间的在途请求。
- 汇率和舍入边界。

### 24.3 容量测试

使用可控 Mock Provider，不对真实付费上游直接做大规模压测。

场景：

```text
3,000 条持续 SSE
100 RPS 新建请求
32 MB 请求体
慢客户端
600 秒长任务
上游首 Token 延迟
上游随机 429 / 500 / 断流
单节点滚动退出
数据库延迟和 Redis 故障
```

验收关注：

- RSS 是否达到稳定平台。
- Goroutine 和连接是否泄漏。
- P95/P99 Gateway 附加延迟。
- SSE 串流是否隔离。
- 取消是否传播到上游。
- 账务是否一致。
- 故障是否引起重试风暴。

### 24.4 安全测试

- Key 暴力尝试。
- 越权访问。
- SSRF。
- 请求走私。
- 超大 Header 和压缩炸弹。
- 日志敏感信息扫描。
- 支付回调伪造和重放。
- 管理员权限审计。

## 25. 发布与回滚

### 25.1 灰度

- 新 Adapter 先在测试环境验证。
- 生产仅对内部 Key 开放。
- 再按用户组或小流量灰度。
- 指标稳定后扩大权重。

### 25.2 配置发布

- 模型、价格、Provider 和路由配置必须版本化。
- 配置变更保留操作人、原因和前后差异。
- Gateway 通过版本号热加载，失败时保留上一版本。

### 25.3 回滚

- 应用镜像保留稳定版本。
- 数据库迁移采用向前兼容和分阶段切换。
- Provider 配置可以立即降权或摘除。
- 价格版本只能结束生效，不能修改历史记录。

## 26. 实施顺序

### 阶段 1：核心数据面与账务

- 建立 Go Gateway。
- 实现三个首发协议解析器。
- 建立 Provider Adapter 框架。
- 实现 Billing Service、钱包、冻结和结算。
- 实现请求计费状态机、Usage 证据链、待结算补偿和 PostgreSQL Outbox。
- 建立 Mock Provider 与自动化账务测试。

### 阶段 2：控制面与渠道

- 用户、API Key、模型和价格管理。
- 接入首批合法上游 Provider。
- 建立路由、熔断、限流和密钥轮换。
- 实现用量页面和运营后台。

### 阶段 3：支付与对账

- 先使用 Mock Payment 跑通闭环。
- 接入微信和支付宝官方商户接口。
- 完成退款、补偿、日终对账和毛利监控。

### 阶段 4：首期生产化

- 使用托管容器或云主机部署多实例和托管数据服务。
- 完成 3,000 并发基线压测。
- 完成数据库、Redis、Provider 和节点故障演练。
- 进行小流量灰度后正式开放。

### 阶段 5：指标驱动扩展

- Outbox 消费和事件扇出达到阈值后引入 Redpanda/Kafka。
- 分析查询影响在线事务后引入 ClickHouse。
- 发布、服务数量和弹性需求达到阈值后迁移托管 Kubernetes。
- 根据真实业务与合规需求增加第二地域或 Provider Egress。

## 27. 上线前决策门

只有以下项目全部通过才开放公众充值：

- 首批上游书面授权和可转售范围已确认。
- 微信、支付宝商户能力已开通并完成生产验签。
- 至少一个主 Provider 和一个可用备用路径完成验证。
- 账务幂等、并发冻结和日终对账测试通过。
- 目标容量和故障压测通过。
- 数据库恢复演练通过。
- 上游密钥和支付密钥不出现在日志、镜像和前端。
- 用户协议、隐私政策、退款规则和投诉入口上线。
- 境内经营及跨境数据路径完成专业合规确认。

## 28. 已知风险

| 风险 | 影响 | 缓解措施 |
| --- | --- | --- |
| 单一上游故障 | 模型不可用 | 每个核心模型准备备用 Deployment |
| 多层重复重试 | 重复消费和故障放大 | 明确单一重试责任和全局预算 |
| Usage 缺失 | 无法实时结算 | 预冻结、待结算和上游账单核对 |
| 大请求内存膨胀 | Gateway OOM | 内存阈值、临时文件、Body 上限 |
| 慢客户端 | 连接和内存占用 | 背压、写超时和单用户并发限制 |
| 上游动态涨价 | 毛利转负 | 价格版本、成本告警和自动摘除 |
| 支付重复通知 | 重复充值 | 验签、唯一索引和幂等入账 |
| 一人运维 | 故障响应不足 | 托管服务、自动化告警和清晰 Runbook |

## 29. 最终推荐

LoopzToken 的成熟生产架构应当是：

```text
用户
→ 云 WAF / 负载均衡
→ Go Loopz Gateway 集群
→ Provider Router
   ├─ 官方模型 Adapter
   ├─ 授权分销 Adapter
   ├─ OpenAI-Compatible Adapter
   ├─ 可选 New API Adapter
   └─ 其他自定义 Adapter
```

用户身份、API Key、人民币钱包、价格和账本始终由 LoopzToken 控制。任何聚合系统都只能是可替换的内部 Provider，不能成为平台商业数据的唯一来源。

首期生产部署采用 PostgreSQL Outbox 和汇总表，优先完成可验证的收费闭环与 3,000 条并发 SSE 验收；Redpanda/Kafka、ClickHouse 和 Kubernetes 只在监控指标证明有必要时引入。这样保持目标架构的成熟度，同时降低首期故障面和运维成本。
