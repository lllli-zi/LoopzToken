# DATABASE.md
<!-- vibe-memory: status=verified; verified_at=2026-08-25; verified_commit=待确认（未建 git 仓库）; owner=database -->

## 文档定位

本文件是数据库运行层，记录引擎/实例、本地安装状态、连接方式、凭据来源、schema 清单、迁移、备份和工具命令。不记录产品需求、UI 规则、任务进度或任何明文密码/token/secret。表结构语义详设见 `TECHNICAL_SOLUTION.md` 17 节（权威详设），字段级真源是 Prisma Schema 文件本身。

## 1. 数据库概览

- 数据库类型/版本：PostgreSQL 16（设计基线；Redis 7 为配套缓存，非权威数据源）
- 部署形态：local Docker Compose（规划）；生产为托管主备（`TECHNICAL_SOLUTION.md` 22.1）
- 本地是否安装：Compose 文件就绪（`infra/docker/docker-compose.yml`）；2026-08-25 观测 Docker daemon 未运行，实例未启动
- 默认端口：5432（PG）/ 6379（Redis）
- 数据库名称：loopztoken（用户 loopz）
- 主要用途：权威业务与账务数据（钱包、账本、订单、请求、Outbox）
- 最近更新时间：2026-08-25

## 2. 连接方式与凭据来源

禁止记录明文密码、token 或真实生产连接串；只记录变量名与凭据来源。

| 环境 | 连接方式 | Host/Port/DB | 凭据来源 | 是否可本地访问 | 验证命令 |
|---|---|---|---|---|---|
| local dev | `DATABASE_URL`（.env，模板见 `.env.example`） | localhost:5432/loopztoken | 开发用本地口令（.env，不入 Git） | 待确认（daemon 未运行） | `docker compose -f infra/docker/docker-compose.yml ps` |
| 生产 | `DATABASE_URL` | 待确认 | KMS / Secret Manager | 否 | 待确认 |

Redis 连接：`REDIS_URL`（默认 redis://localhost:6379，当前未使用）。

## 3. 本地安装、启动与停止

| 方式 | 命令/入口 | 当前状态 | 备注 |
|---|---|---|---|
| Docker Compose | `docker compose -f infra/docker/docker-compose.yml up -d` / `down` | 未启动（daemon 未运行） | 含 PG16+Redis7 健康检查 |
| Native service | 无 | 未安装 | 无计划 |

## 4. Schema 与表结构清单

字段级权威：`packages/database/prisma/schema.prisma`（`prisma validate` 已通过，2026-08-25）。模型 `@@map` 为蛇形表名（如 `wallet_ledger`）。

| 表组 | 模型数 | 代表表 | 说明 |
|---|---|---|---|
| 业务 | 13 | users、api_keys、models、model_price_versions、providers、model_deployments、routing_policies | 用户/Key/模型/渠道配置 |
| 账务 | 9 | wallets、wallet_reservations、wallet_ledger、orders、payment_attempts、refunds、settlements、reconciliations | 金额全部 BigInt 微元；流水不可变；幂等键唯一约束 |
| 请求 | 4 | api_requests、request_attempts、usage_records、provider_billing_records | 计划按月分区（Prisma 不支持声明式分区，见下） |
| 审计可靠性 | 5 | audit_logs、outbox_events、idempotency_records、risk_events、support_tickets | Outbox 为 Worker 消费队列 |

关键不变量（Schema 注释已声明）：`wallet_ledger` 只插入不更新；幂等键在 `wallet_reservations.idempotency_key`、`wallet_ledger.idempotency_key` 上唯一；`provider_billing_records` 以 (providerId, providerRequestId) 唯一。余额 ≥ 0 约束由服务层事务保证（无数据库 CHECK，待确认是否补充）。

## 5. 迁移状态

| 迁移文件/版本 | 状态 | 影响表/集合 | 验证方式 | 备注 |
|---|---|---|---|---|
| （无） | 待确认 | 全部 | `bun run db:migrate` 生成首个迁移 | 阻塞：Docker daemon 未运行 |

分区策略：api_requests / request_attempts / usage_records 需按月分区，必须在手写 SQL 迁移中实现并保持与 Schema 字段一致（Schema 文件头注释已声明）。

## 6. 种子数据与测试数据

| 数据集 | 用途 | 加载命令 | 可重置 | 注意事项 |
|---|---|---|---|---|
| （无） | 待确认 | 待确认 | 待确认 | 首个迁移后规划 Mock Provider 测试数据 |

## 7. 备份、恢复与重置

| 操作 | 命令/流程 | 适用环境 | 风险 | 最近验证 |
|---|---|---|---|---|
| backup/restore | 规划见 `infra/backup/README.md`；生产为托管自动备份+PITR | 生产 | 待确认 | 未验证 |
| reset | `docker compose down -v` 后重建+迁移 | 本地开发 | 丢失本地数据 | 未验证 |

## 8. 工具命令与连通性检查

- ORM/迁移：`bun run db:generate` / `db:migrate` / `db:push` / `db:studio`（根目录执行）
- Schema 校验（无需实例）：`cd packages/database && DATABASE_URL=postgresql://x:x@localhost:5432/x bunx prisma validate`
- 客户端单例：`packages/database/src/index.ts` → `getPrismaClient()`
- 常见故障：`prisma validate` 报 `Environment variable not found: DATABASE_URL` 属正常（缺 env，非 Schema 错误），带任意合法 URL 重试即可。

## 9. 同步规则

- 引擎、实例、连接方式、DB 环境变量、表结构、迁移、种子、备份或工具变化后，先更新本文件。
- 数据库变化影响服务边界、依赖或高层数据模型时，同时更新 `ARCHITECTURE.md`。
- 当前阻塞与下一步写 `PROGRESS.md`；已确认取舍写 `DECISIONS.md`；踩坑写 `LEARNINGS.md`。
- 本文件不得写真实密码、token、secret 或完整生产连接串。
