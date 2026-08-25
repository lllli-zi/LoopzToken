# AGENTS.md

## 作用

本文档只能作为项目外置记忆路由器，只保存文档入口、冲突优先级、读取预算、触发条件、门禁和检查命令。产品、架构、数据库、设计、任务、进度、决策、经验和历史分别保存在对应文档，不得复制到这里。

项目记忆采用“树状入口、图状关联、单一权威节点”：

```text
AGENTS.md
├── PRD.md
├── ARCHITECTURE.md
├── DATABASE.md
├── DESIGN.md
├── TASKS.md
├── PROGRESS.md
├── DECISIONS.md
├── LEARNINGS.md
└── CHANGELOG.md
```

复杂功能可使用 `specs/<feature>/`；根文档只保存摘要和链接。

仓库另有两份用户-authored 详设文档，作为对应根文档的扩展阅读入口，不承载独立记忆职责：`TECHNICAL_SOLUTION.md`（总体技术方案，`ARCHITECTURE.md` / `DATABASE.md` 引用）、`UI_TECH_STACK.md`（前端技术栈，`DESIGN.md` 引用）。

## 优先级

1. 用户本次明确确认；
2. 已确认产品规格；
3. 稳定领域规范；
4. 数据库迁移、Schema 和验证证据；
5. 当前实现；
6. `PROGRESS.md` 临时状态；
7. 未确认的聊天假设。

发现冲突时必须说明是实现错误、文档过期、含义未确认还是有意偏离，不得静默选择。

每个规范事实必须标记为 `proposed`、`accepted`、`verified` 或 `deprecated`，并记录责任域和最近验证版本。只有有效性完全相同的一组事实才能继承所在章节或文档的显式状态头；混合状态必须在条目或子章节覆盖。哈希和变更指纹由 `.vibe/` 自动保存，不写入正文。

## 模式选择

每次任务先选择成本最低且安全的模式：

| 模式 | 条件 | 默认读取 |
|---|---|---|
| Fast | 局部、可逆且不改变稳定事实 | 本文件、目标代码和相关测试 |
| Governed | 可能改变产品、架构、数据库、设计或交付事实 | 只读对应领域文档 |
| Spec | 跨模块、高风险、歧义或跨会话功能 | Governed + 一个功能规格 |
| Bootstrap/Audit | 初始化、缺失、漂移、重复或显式文档审查 | 根文档、模板和严格检查 |
| Handoff/Compact | 恢复、模型切换、暂停或重置 | 本文件、`TASKS.md`、`PROGRESS.md`，再沿链接读取 |

UI 文件中的纯错别字不因为文件类型自动升级；只有改变产品含义或可复用设计规则时才读取/更新 `DESIGN.md`。

读取预算：Fast 只读本文件、目标代码和直接测试；Handoff 只读三个恢复文件及其链接分支；Governed/Spec 在读取前列出受影响领域。只有发现具体断链、冲突或缺失事实时才能扩大范围。

## 编码原则

1. 编码前思考：说明会影响结果的假设、歧义和取舍。
2. 简洁优先：不增加未要求功能、抽象、配置或假想扩展。
3. 精准修改：每一行修改都能追溯到请求，只清理本次产生的孤儿代码。
4. 目标驱动：先定义成功证据，再实现和验证，达标后停止。
5. 不覆盖、回退或清理用户已有的无关修改。

## 风险和确认

| 等级 | 示例 | 行为 |
|---|---|---|
| L1 | 错别字、局部 Bug、去重、可逆局部重构 | 直接执行并报告 |
| L2 | 跨模块行为、兼容 API、可复用 UI 规则、普通依赖 | 说明假设和影响，采用最低风险兼容解释 |
| L3 | 产品范围、角色权限、认证模型、持久化语义、破坏性迁移、价格、生产/安全设置 | 用户确认后再更新规范和代码 |

风险由含义、可逆性和影响范围决定，不由文件数量决定。
“你选一个”“直接上线”“自行判断”等泛化授权不等于确认某个 L3 具体值。必须先明确提出该值，并取得对该值的明确确认。

## 领域门禁

Governed/Spec 模式按实际行为判断：

| 影响 | 编码前读取 | 验证后同步 |
|---|---|---|
| 产品行为、角色、验收 | `PRD.md` | 产品规范和任务状态 |
| 技术栈、API、认证、服务、部署 | `ARCHITECTURE.md` | 架构；重大取舍写决策 |
| 数据库连接、结构、迁移、备份 | `DATABASE.md` | 数据库；边界变化才更新架构 |
| 可复用 UI、组件、交互规则 | `DESIGN.md` | 设计和实时进度 |
| 任务、阻塞、证据、下一步 | `TASKS.md`、`PROGRESS.md` | 计划状态和当前游标 |
| 可复用调试经验 | `LEARNINGS.md` | 查重后更新一条经验 |
| 已验证用户可见交付 | `CHANGELOG.md` | 交付记录 |

写入前先查等价事实；已有则原地更新。一个事实只保留一个权威位置，其他文件使用链接或稳定 ID。

## 状态与完成

```text
RECEIVED
-> CONTEXT_LOADED
-> IMPACT_CLASSIFIED
-> [SPEC_ALIGNED]
-> IMPLEMENTING
-> VERIFYING
-> DOC_SYNCED
-> DONE | BLOCKED
```

- `SPEC_ALIGNED` 只在 Fast 模式可跳过。
- 从低成本检查开始，证据充分后停止。
- 验证失败或未运行时不得标记完成。
- 同一未变化假设连续失败两次，必须停止重复修改并重新诊断。
- `BLOCKED` 必须写明证据、阻塞和下一步。
- Fast 模式不创建功能规格、稳定 ID、学习或交付记录。
- 未验证根因不能写入 `LEARNINGS.md`；未接受提案不能写入 `DECISIONS.md`。

## Claude Code 与可执行检查

根 `CLAUDE.md` 第一条非空行必须是 `@AGENTS.md`，并保留其原有 Claude 专用内容。该导入不会自动加载 Codex Skill，因此必须使用项目本地 Harness：

```bash
python3 .vibe/vibe_doctor.py check .
```

`.claude/settings.json` 应合并 Vibe Doctor 的轻量编辑追踪和 `Stop` Hook，不得覆盖已有设置。Claude Code 中使用 `/memory` 检查规则加载，使用 `/hooks` 检查 Hook。

确定性错误由程序阻止完成：`AGENTS.md` 混入领域章节、桥接错误、重复 ID、断链、孤立功能规格、完成任务缺少证据、严重超出记忆预算、疑似密钥、受影响领域未完成同步。项目情况改变后，更新责任文档；如果稳定事实没有变化，运行：

```bash
python3 .vibe/vibe_doctor.py acknowledge . --domain design --reason "仅修正拼写，未改变可复用设计规则"
```

确认绑定当前变更指纹，后续代码再次变化会自动失效。检查成功后 `.vibe/last-check.json` 保存最新文档哈希和变更清单。

## 生命周期

不按固定对话轮数写经验。仅在重复失败、确认可复用根因、复杂任务结束、模型切换、暂停或压缩上下文时整理记忆：

- 当前状态、阻塞、下一步写 `PROGRESS.md`；
- 已确认重要取舍写 `DECISIONS.md`；
- 可复用根因和规约写 `LEARNINGS.md`；
- 没有持久价值则不写。
- 文档超过预算、存在重复、断链、孤立规格或过期进度时，执行垃圾回收：合并、压缩、归档或删除失效内容，保留验证证据和已接受决策。

## 收尾

Fast 模式报告修改、验证、风险，并说明：

`Doc sync: Fast mode; no stable product, architecture, database, design, task, delivery, decision, or learning fact changed.`

其他模式报告：模式/风险、读取路径、修改文件、验证证据、文档更新、未更新理由、待确认项和未完成时的下一步。

不得在验证失败、Vibe Doctor 存在确定性错误或当前工作无法从 `PROGRESS.md` 恢复时宣称完成。
