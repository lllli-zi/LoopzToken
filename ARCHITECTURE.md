# ARCHITECTURE.md
<!-- vibe-memory: status=verified; verified_at=2026-08-25; verified_commit=待确认（未建 git 仓库）; owner=architecture -->

## 文档定位

本文件是地图层，记录当前已实现的技术栈、目录拓扑、模块边界、API/service 合同、高层数据模型、环境变量合同和工程规范。完整架构设计与演进目标见 `TECHNICAL_SOLUTION.md`（权威详设），本文件只记录"仓库当前实际是什么"以及详设入口。不记录 UI 视觉规则（见 `DESIGN.md`）、具体数据库连接与表结构（见 `DATABASE.md`）、任务进度（见 `PROGRESS.md`）。

## 1. 运行环境与技术栈

- 前端：React 19 + Rsbuild 2 + TanStack Router（文件路由）+ TanStack Query 5 + Tailwind CSS 4（apps/web）
- 数据面后端：Go 1.24，骨架期纯标准库（services/gateway、services/billing）
- 控制面后端：NestJS 11 + Fastify Adapter（apps/control-api）
- 后台任务：Bun 运行时 TypeScript（apps/worker）
- 持久化：PostgreSQL + Prisma 6（packages/database）；Redis 仅规划（限流/缓存，未接入）
- 样式：Tailwind 4 + CSS Variables + Base UI（1.0.0-rc.0，未深度接入）
- 测试：Vitest 4（web 单测）；oxlint
- 部署：首期云主机/托管容器规划见 `TECHNICAL_SOLUTION.md` 22 节与 infra/docker/*.Dockerfile（未部署）
- 包管理器：Bun 1.3 workspaces（apps/*、packages/*）
- 运行时版本：Bun 1.3.14 / Node 24；Go 工具链本机未安装（2026-08-25 观测）

## 2. 目录拓扑与模块边界

```text
apps/web            React SPA（官网/控制台/运营后台）
apps/control-api    NestJS 业务控制面（注册登录、Key、模型价格、订单工单——骨架）
apps/worker         PostgreSQL Outbox 消费（Bun 直跑 TS 源码）
services/gateway    Go 数据面（协议转发、鉴权、路由——骨架）
services/billing    Go 权威钱包/冻结/结算（骨架）
packages/contracts  Outbox 事件 + Billing API 的 Zod 契约（Go/TS 共同对齐目标）
packages/database   Prisma Schema + Client 单例
packages/payment    PaymentProvider 接口 + Mock 实现
packages/config     平台基线常量 + 环境变量 Zod Schema
packages/ui         占位（组件下沉预留）
providers/          六种上游协议适配规范与验收清单（Markdown）
infra/              docker-compose、Dockerfile、monitoring、load-testing、backup
```

| 模块 | 职责 | 不负责 |
|---|---|---|
| services/gateway | 对外模型 API、Key 校验、Provider 路由、SSE 转发、预冻结调用 | 钱包事务、用户会话 |
| services/billing | 冻结/结算/释放/充值/退款的数据库事务与账本 | 上游协议、HTTP 对外 |
| apps/control-api | 用户、Key、模型价格、订单的控制面 API | 模型长连接转发 |
| apps/worker | Outbox 消费、重试退避、事件分发 | 直接修改钱包（走 billing） |
| packages/contracts | 事件与内部 API 契约 Schema | 业务实现 |

## 3. 高层数据模型

- 金额一律 BigInt 微元（1 CNY = 1,000,000 micro-CNY），业务层禁止浮点。
- 32 个 Prisma 模型分四组：业务（users/api_keys/models/providers/deployments…）、账务（wallets/reservations/ledger/orders/refunds/settlements…）、请求（api_requests/attempts/usage_records…）、审计可靠性（audit_logs/outbox_events/idempotency_records…）。
- 请求计费状态机、结算事务步骤、Usage 证据优先级的语义见 `TECHNICAL_SOLUTION.md` 15 节；表结构明细见 `DATABASE.md`。

## 4. API / Service 合同

| 服务 | 端点 | 状态 |
|---|---|---|
| gateway | GET /healthz；GET /v1/models、POST /v1/chat/completions、/v1/responses、/v1/messages | healthz 可用；模型端点 501 占位 |
| billing | GET /healthz；POST /internal/v1/billing/{reservations,reservations/:id/settle,reservations/:id/release,recharges,refunds}；GET /internal/v1/wallets/:user_id | 全部 501 占位，路由与请求结构已定 |
| control-api | GET /healthz、/readyz；POST /v1/auth/{register,login} | health 可用；auth 501 占位（Zod 校验已定） |
| worker | 无 HTTP，轮询 outbox_events（2s 间隔，批 20，指数退避，5 次转 FAILED） | 循环可用，处理器为记录占位 |

契约权威位置：`packages/contracts/src/billing.ts`（内部计费 API）、`packages/contracts/src/events.ts`（Outbox 事件）。Go 侧 `services/billing/internal/httpapi` 请求结构与其人工对齐；后续演进为版本化契约生成（`TECHNICAL_SOLUTION.md` 23 节）。

## 5. 全局数据流与状态管理

- web → control-api：唯一 Axios 实例（withCredentials，baseURL=VITE_CONTROL_API_URL）；服务端数据全走 TanStack Query，Zustand 只存 UI 状态。
- gateway → billing：内部 HTTP，超时 3s；生产应内网/mTLS（未实现）。
- 业务事务 → outbox_events → worker 消费（FOR UPDATE SKIP LOCKED）。
- Redis 用途（限流、Key 缓存、并发计数）规划中，未接入。

## 6. 核心业务逻辑边界

| 业务能力 | 所在模块 | 输入 | 输出 | 不负责 |
|---|---|---|---|---|
| API Key 解析/HMAC | services/gateway/internal/auth | 完整 Key + pepper | public_id/secret/校验结果 | Key 元数据存储 |
| Provider 路由 | services/gateway/internal/router | 候选 Deployment 列表 | 选中的候选 | 健康评分（TODO） |
| 协议适配 | services/gateway/internal/provider | GatewayRequest | 上游 http.Request/Usage | 重试决策 |
| 钱包事务 | services/billing/internal/wallet | Reserve/Settle/Release 请求 | 账本变更 | HTTP 编解码 |
| Outbox 消费 | apps/worker/src | outbox_events 行 | DONE/FAILED 状态 | 事件产生 |

## 7. 安全、权限、错误与日志

- API Key：`sk-loopz_<public_id>_<secret>`，只存 HMAC-SHA256(secret, pepper)，恒定时间比较；pepper 经 `API_KEY_PEPPER` 注入，生产应来自 KMS/Secret Manager。
- Gateway 日志：slog JSON，字段 request_id/method/path/status/duration；不写 Prompt 与完整 Key。
- 错误返回统一 OpenAI 风格 `{error:{message,type}}`。
- 密码 Argon2id、管理员 2FA、mTLS：规划未实现（`TECHNICAL_SOLUTION.md` 21 节）。

## 8. 部署、环境变量合同与第三方依赖

数据库连接与凭据见 `DATABASE.md`。非数据库环境变量（开发默认值见 `.env.example`）：

| 项 | 用途 | 来源 | 是否敏感 |
|---|---|---|---|
| API_KEY_PEPPER | Key HMAC pepper | KMS/Secret Manager（开发 .env） | 是 |
| GATEWAY_LISTEN_ADDR / BILLING_LISTEN_ADDR | 服务监听地址 | 部署环境 | 否 |
| BILLING_BASE_URL | Gateway→Billing 内部地址 | 部署环境 | 否 |
| CONTROL_API_HOST/PORT/CORS_ORIGINS | 控制面监听与 CORS | 部署环境 | 否 |
| VITE_CONTROL_API_URL / VITE_PUBLIC_GATEWAY_URL / VITE_APP_ENV | 前端公开配置 | 构建注入 | 否 |

前端环境变量禁止携带任何密钥（`UI_TECH_STACK.md` 18 节）。

| 依赖 | 用途 | 约束 |
|---|---|---|
| Prisma 6 | ORM/迁移 | monorepo 单 schema |
| NestJS 11 + Fastify | 控制面 | 需显式装 class-transformer/validator |
| @base-ui-components/react | UI 原语 | 1.0.0-rc.0，正式版发布前锁定 |
| pgx / go-redis / otel | 数据面持久化与观测 | 阶段 1 引入（当前 Go 纯标准库） |

## 9. 工程规范与测试边界

- TS workspace 包直接以源码消费（package.json exports 指向 `./src/*.ts`），运行时为 Bun；`tsc --noEmit` 只做类型检查。禁止为 workspace 包引入独立构建产物。
- 组件只负责展示与局部交互；数据请求经 `src/lib/api.ts` 单例；复杂状态进 hooks/store。
- 手写文件超 400 行复审职责；超 600 行通常拆分（生成文件例外）。
- 验证命令：`bun run typecheck`、`bun run test`、`bun run lint`、`bun run build`；Go 侧 `go build ./...`、`go test ./...`（待工具链）。
- 架构、API 合同、技术栈、环境变量合同变化后必须同步本文件。

## 10. 架构决策引用

| 决策 | 来源 | 影响 |
|---|---|---|
| TS 服务统一 Bun 运行时直跑源码 | `DECISIONS.md` 2026-08-25 | workspace 无构建产物；控制面/worker Docker 镜像基于 oven/bun |
| Go 服务骨架零外部依赖 | `DECISIONS.md` 2026-08-25 | go.mod 无 requires；阶段 1 引入 pgx 等时更新本文件第 1 节 |
| 总体架构选型（多渠道路由、PostgreSQL 权威、分阶段演进） | `TECHNICAL_SOLUTION.md` 2/3 节 | 本文件不重复，冲突时以详设+用户确认为准 |
