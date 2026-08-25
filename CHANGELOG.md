# CHANGELOG.md
<!-- vibe-memory: status=verified; verified_at=2026-08-25; verified_commit=待确认（未建 git 仓库）; owner=delivery -->

## 文档定位

本文件是交付记录，记录已验证完成的用户可见交付项。不记录内部实现细节（见 `PROGRESS.md`）。

## 2026-08-25 / 骨架 0.1.0（未打 tag，仓库未 git init）

- 新增：LoopzToken Monorepo 系统框架——apps/web（React 19 + Rsbuild 官网/控制台/后台骨架）、apps/control-api（NestJS+Fastify，health 可用）、apps/worker（Outbox 消费循环）、services/gateway 与 services/billing（Go 标准库骨架，协议/结算端点 501 占位）、packages/{contracts,database,payment,config,ui}、providers/ 六协议规范、infra/docker 与监控配置、10 个项目记忆根文档 + Vibe Doctor。
- 修改：PRD.md 仅追加一行记忆元数据头（内容未动）。
- 修复：无。
- 移除：无。
- 影响范围：全新仓库；无既有行为可破坏。
- 验证：bun install（584 包）；prisma validate+generate 通过；8/8 workspace typecheck 通过；web 单测 6/6、oxlint 0 错、生产构建成功；worker/control-api Bun 打包冒烟通过。Go 未编译（无工具链）、数据库迁移未执行（Docker daemon 未运行）——详见 `PROGRESS.md` 验证记录。
- 关联任务：T-001（`TASKS.md`）。
