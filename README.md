# LoopzToken

多模型 API 商业平台 Monorepo。架构、需求与技术栈以仓库根目录三份文档为准：

- [PRD.md](./PRD.md) — 产品需求
- [TECHNICAL_SOLUTION.md](./TECHNICAL_SOLUTION.md) — 技术方案（架构、账务、数据库、部署）
- [UI_TECH_STACK.md](./UI_TECH_STACK.md) — 前端技术栈

## 目录结构

```text
LoopzToken/
├── apps/
│   ├── web/                  # React 19 + Rsbuild 官网 / 控制台 / 运营后台 SPA
│   ├── control-api/          # NestJS + Fastify 业务控制面
│   └── worker/               # Outbox 消费、补偿与对账任务（Bun 运行时）
├── services/
│   ├── gateway/              # Go 高并发数据面（多协议网关）
│   └── billing/              # Go 权威钱包、冻结与结算服务
├── packages/
│   ├── contracts/            # API 与事件 Schema（Outbox / Billing 契约）
│   ├── database/             # Prisma Schema 与迁移
│   ├── payment/              # 支付 Provider 接口（Mock / 微信 / 支付宝）
│   ├── ui/                   # 共享 UI 资产（预留）
│   └── config/               # 共享配置与环境变量 Schema
├── providers/                # 各上游协议适配规范与验收清单
├── infra/                    # docker / monitoring / load-testing / backup 等
└── docs/
```

## 快速开始

依赖：Bun ≥ 1.3、Docker（可选，用于本地 PG/Redis）、Go ≥ 1.24（仅数据面服务）。

```bash
# 1. 本地基础设施（PostgreSQL 16 + Redis 7）
docker compose -f infra/docker/docker-compose.yml up -d

# 2. 安装依赖并生成 Prisma Client
bun install
cp .env.example .env
bun run db:generate

# 3. 建表（本地开发）
bun run db:migrate

# 4. 启动各服务（分别开终端或用需要的那几个）
bun run dev:web      # http://localhost:5173
bun run dev:api      # http://localhost:3000
bun run dev:worker   # Outbox 消费循环

# Go 数据面（需要本地 Go 工具链）
cd services/gateway && go run ./cmd/gateway   # :8080
cd services/billing && go run ./cmd/billing   # :8081
```

## 服务一览

| 目录 | 技术 | 默认端口 | 职责 | 骨架状态 |
| --- | --- | --- | --- | --- |
| services/gateway | Go | 8080 | 统一模型 API、鉴权、限流、Provider 路由、SSE 转发 | 框架就绪，路由/协议处理为 TODO 占位 |
| services/billing | Go | 8081 | 钱包、预冻结、结算、幂等账本 | 框架就绪，接口为 TODO 占位 |
| apps/control-api | NestJS + Fastify | 3000 | 注册登录、API Key、模型价格、订单工单 | 框架就绪，业务模块为 TODO 占位 |
| apps/worker | Bun + TS | - | Outbox 消费、补偿、对账 | Outbox 轮询循环可用 |
| apps/web | React 19 + Rsbuild | 5173 | 官网、控制台、运营后台 | 布局/路由/i18n/Query 骨架可用 |
| packages/database | Prisma | - | 全量业务/账务/请求表模型 | Schema 已按 TECHNICAL_SOLUTION 17 建模 |

## 约定

- 金额一律 `BIGINT` 微元（1 CNY = 1,000,000 micro-CNY），业务层禁止浮点。
- TS workspace 包直接以源码引用（Bun 运行时），契约集中在 `packages/contracts`，不复制手写 DTO。
- Go 与 TS 之间后续通过版本化契约（OpenAPI / JSON Schema）协作。
- 环境变量以 `.env.example` 为准；任何密钥不得进入 Git、日志与前端构建产物。
