# LEARNINGS.md
<!-- vibe-memory: status=verified; verified_at=2026-08-25; verified_commit=待确认（未建 git 仓库）; owner=learning -->

## 文档定位

本文件是经验沉淀层，只记录已验证、可跨会话复用的踩坑与规约。不记录聊天流水、当前进度（见 `PROGRESS.md`）或未确认事实。

## 写入标准

错误根因、API/库版本踩坑、环境规约、编码偏好、重构复盘——仅在验证后写入，凑数禁止。

## 经验条目

### 2026-08-25 Bun workspace 内 tsc 找不到 node 类型

- 触发场景：packages/* 各自 `tsc --noEmit`，tsconfig 含 `"types": ["node"]`。
- 症状/报错：`TS2688: Cannot find type definition file for 'node'`。
- 根因：Bun 不把其他 workspace 的 @types/node 提升到本包可解析范围；`types` 字段要求该包自己声明依赖。
- 处理方式：用到 Node API 的包在自身 devDependencies 加 `@types/node`；用不到的包直接删除 `"types": ["node"]` 行。
- 复用规则：新建 workspace 包时，仅在确实引用 Node 全局（process/Buffer/TextDecoder 等）时带 node types，并同步加 devDep。
- 适用范围：Bun workspaces + tsc --noEmit。
- 相关文件：packages/{config,database,payment}/package.json、packages/contracts/tsconfig.json。
- 验证：8/8 workspace typecheck 通过。
- 失效条件：Bun 改变类型提升策略。

### 2026-08-25 NestJS 11 on Bun 的依赖解析

- 触发场景：NestJS + Fastify Adapter 以 Bun 直跑/打包。
- 症状/报错：运行/打包报 `Could not resolve: "class-transformer"`；打包继续报 `@fastify/view`、`@nestjs/microservices` 等缺失。
- 根因：@nestjs/common、@nestjs/platform-fastify 把 class-transformer/class-validator 列为运行时必需 peer（bun 不自动装）；@fastify/view、@nestjs/platform-express 等是可选 peer，仅被 bundler 静态扫描引用，运行时不加载。
- 处理方式：显式安装 class-transformer + class-validator；打包冒烟对框架包用 `--external '@nestjs/*' --external '@fastify/*'`。
- 复用规则：Nest 11 项目初始依赖必含 class-transformer/class-validator；bun build 报可选 peer 缺失时优先 external 而非安装。
- 适用范围：NestJS 11 / Bun 1.3。
- 相关文件：apps/control-api/package.json。
- 验证：bun build 冒烟通过（0.98 MB bundle）。
- 失效条件：NestJS 改为内置这些依赖。

### 2026-08-25 前端依赖版本现实（zod 4 / Base UI / Vitest 4）

- 触发场景：按文档版本基线初始化 web 依赖。
- 症状/报错：`@base-ui-components/react@^1.0.0` 解析失败（只有 rc/beta）；zod 4 `.nonneg()` 报 `Property 'nonneg' does not exist`。
- 根因：Base UI 尚未发布 1.x 正式版（最新 1.0.0-rc.0）；zod 4 将 `.nonneg()` 更名为 `.nonnegative()`。
- 处理方式：Base UI 用 `^1.0.0-rc.0`（semver 预发布范围）；zod 统一 `.nonnegative()`。
- 复用规则：新包引入前先 `bun pm view <pkg> versions` 核实；zod 4 代码统一用 `.nonnegative()`。
- 适用范围：@base-ui-components/react@1.0.0-rc.0、zod 4。
- 相关文件：apps/web/package.json、packages/contracts/src/events.ts。
- 验证：bun install 成功 + typecheck 通过。
- 失效条件：Base UI 发布正式版、zod 改回旧 API（均不太可能）。
