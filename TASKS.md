# TASKS.md
<!-- vibe-memory: status=proposed; verified_at=待确认; verified_commit=待确认; owner=delivery -->

## 文档定位

本文件是任务计划文档，记录任务拆分、状态和验收标准。任务来源：`TECHNICAL_SOLUTION.md` 26 节实施顺序与 PRD 14 节发布阶段。不记录长期规范或实时会话状态（见 `PROGRESS.md`）。

## 1. 阶段目标

阶段 A（当前）：核心链路可验证——多协议 Gateway、Provider Adapter、Key/钱包/冻结/结算、两个测试 Provider、模拟支付闭环、Outbox 与计费状态机。退出条件：协议兼容测试与账务并发测试通过，Mock Payment 跑通充值与退款（PRD 14 阶段 A）。

## 2. 任务清单

| 状态 | 编号 | 任务 | 优先级 | 依赖 | 验收标准 |
|---|---|---|---|---|---|
| 已完成（证据见 §6） | T-001 | Monorepo 系统框架搭建 | P0 | 无 | 8 workspace typecheck 通过；web build+单测通过；prisma validate 通过；详设结构 23 节落位 |
| 未开始 | T-002 | 首个数据库迁移与本地实例启动 | P0 | Docker daemon 可用 | `bun run db:migrate` 生成迁移；control-api /readyz 200 |
| 未开始 | T-003 | Billing 结算事务实现（pgx） | P0 | T-002 | 15.3 八步单事务；幂等重复调用返回原结果；并发冻结无负余额（24.2 用例） |
| 未开始 | T-004 | Gateway API Key 鉴权 + Redis 元数据缓存 | P0 | T-002 | 解析→缓存→恒定时间 HMAC→状态检查链路可用；缓存失效回源 |
| 未开始 | T-005 | 三个首发协议 SSE 解析器 + Mock Provider | P0 | 无 | OpenAIChat/Responses/AnthropicMessages 状态机解析 Usage；providers/*/README 验收清单全过 |
| 未开始 | T-006 | Gateway 完整转发链路 | P0 | T-003/T-004/T-005 | 冻结→路由→头处理→转发→结算/pending_billing 全链路；客户端取消传播 |
| 未开始 | T-007 | Mock Payment 充值退款闭环 | P0 | T-003 | 充值→回调验签→幂等入账→Outbox→worker；退款同构（PRD 阶段 A 退出条件） |
| 未开始 | T-008 | Go 工具链安装与数据面编译验证 | P0 | 无（环境） | 本机或 CI `go build ./... && go test ./...` 通过 |
| 未开始 | T-009 | Control API 注册/登录/会话 | P1 | T-002 | Argon2id、会话 Cookie、限流、协议同意记录（AUTH-001~005） |
| 未开始 | T-010 | 账务并发与协议兼容自动化测试 | P0 | T-003/T-006 | 24.1/24.2 清单进 CI 脚本 |

## 3. 优先级与依赖

- P0：T-002 → T-003 → T-006 → T-007/T-010 构成阶段 A 关键路径；T-005 可并行。
- P1：T-009（控制面业务）。
- 阻塞依赖：T-002/T-004/T-009 被本地 Docker daemon 未运行阻塞（2026-08-25 观测）；T-003 起的 Go 编译验证被 Go 工具链缺失阻塞（T-008）。

## 4. 任务模板

新增任务时按此结构展开（简短任务可只入 §2 表格）：

**目标 / 范围 / 非范围 / 影响文件 / 验收标准 / 状态与验证**

## 5. 阻塞与风险

| 任务 | 阻塞/风险 | 影响 | 下一步 |
|---|---|---|---|
| T-002 等 | Docker daemon 未运行 | 无法迁移/联调 | 用户启动 Docker 后执行 T-002 |
| T-003/T-005/T-006 | Go 工具链未安装 | Go 代码从未编译 | 安装 Go ≥1.24（brew install go）后先跑 T-008 |
| 待业务确认 | PRD 15 节六项（并发验收值、模型命名、首批 Provider、商户开通、退款财税规则） | 影响价格/路由/支付实现参数 | 到达对应任务前向用户确认 |

## 6. 状态与验证

- T-001：2026-08-25 完成。验证：`bun run typecheck`（8/8 通过）、`bun run test`（6/6 通过）、`bunx prisma validate`（合法）、web `rsbuild build`（成功，routeTree 生成）、worker/control-api Bun 打包冒烟通过。Go 侧未编译（见 T-008），以静态审查为准。
