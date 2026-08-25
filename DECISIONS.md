# DECISIONS.md
<!-- vibe-memory: status=accepted; verified_at=2026-08-25; verified_commit=待确认（未建 git 仓库）; owner=decision -->

## 文档定位

本文件是决策记录，只保存已接受的 重要技术/产品取舍。总体架构级决策（多渠道路由、PostgreSQL 权威、分阶段演进等）权威在 `TECHNICAL_SOLUTION.md` 2/3 节，本文件不重复；此处记录实现层落地决策。

## 2026-08-25 TS 服务统一 Bun 运行时直跑源码

- 背景：NestJS（control-api）与 worker 需要消费 workspace 包（@loopz/database 等）；传统 tsc 构建与"包内 TS 源码直引"冲突。
- 选项：① 各包 tsc 产出 dist 再引用（需 tsup/构建编排，CI 复杂）；② Bun 运行时直跑 TS 源码（package.json exports → `./src/*.ts`）；③ Nest 换 tsx 运行器。
- 决策：选②。全部 TS 应用（control-api、worker）以 `bun src/main.ts` 运行，tsc 仅 `--noEmit` 类型检查；Docker 镜像基于 oven/bun。
- 原因：Bun 原生跨 node_modules 解析 TS；零构建编排；与前端 Bun 工具链统一。
- 影响：无 workspace 构建产物；生产镜像须带 Bun 运行时（ARCHITECTURE §1/§8）。
- 权衡与风险：运行时类型与 tsc 检查存在极小差异可能；Bun 兼容性风险由打包冒烟与运行验证兜底。
- 适用范围：apps/* 与 packages/* 全部 TS。
- 后续观察：Nest 生产负载下 Bun 稳定性；如异常再评估 tsup 方案。
- 回滚条件：Bun 运行时出现阻断性兼容问题时，改为包构建产物方案。

## 2026-08-25 Go 服务骨架零外部依赖

- 背景：Go 工具链本机未安装，数据面代码无法编译验证；pgx/go-redis/otel 是既定引入项。
- 选项：① 骨架即引入全套依赖（无法验证、锁文件风险高）；② 纯标准库骨架，依赖随阶段 1 引入。
- 决策：选②。go.mod 无 requires；接口/路由/配置先以标准库成型。
- 原因：未经验证的依赖清单比无依赖更危险；标准库代码可静态审查，装 Go 后首次 `go build ./...` 即可闭环。
- 影响：Billing 持久化、Gateway 限流缓存暂不可用（与 TASKS T-003/T-004 对齐）。
- 权衡与风险：阶段 1 需一次性引入 pgx 等（预期内）。
- 适用范围：services/gateway、services/billing。
- 后续观察：无。
- 回滚条件：无（引入依赖时更新 go.mod 与 ARCHITECTURE §8）。
