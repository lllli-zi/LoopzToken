# DESIGN.md
<!-- vibe-memory: status=verified; verified_at=2026-08-25; verified_commit=待确认（未建 git 仓库）; owner=design -->

## 文档定位

本文件是 UI 蓝图层，记录本仓库已实现的设计 Token、页面结构、组件约定、交互状态与前端实现规则。完整前端技术栈规范见 `UI_TECH_STACK.md`（权威详设），本文件只记录"当前实际实现"与可复用规则。不记录 API 合同、数据模型（见 `ARCHITECTURE.md`）或页面开发进度（见 `PROGRESS.md`）。

## 1. 系统级基础规范（Global & System Level）

### 设计目标

- 产品气质：开发者工具，中性、清晰、信息密度适中（Neutral 基础色）
- 可访问性目标：语义化 HTML、可见焦点、状态不只靠颜色（详设 `UI_TECH_STACK.md` 14 节）
- 响应式断点：Tailwind 默认（当前骨架用到 `md:` 侧边栏切换）

### 视觉 Token

- 权威位置：`apps/web/src/styles/index.css`（`:root` / `.dark` + `@theme inline` 映射）
- 语义变量：`--background/--foreground/--card/--primary/--secondary/--muted/--border/--input/--ring/--success/--warning/--destructive/--chart-1..6`、圆角 `--radius: 0.5rem`
- **硬规则：业务代码使用语义变量（如 `bg-card`、`text-muted-foreground`），禁止散落品牌色十六进制值**
- 暗色模式：`.dark` class 切换，由 next-themes（ThemeProvider attribute="class"）驱动

### UI 技术约束

- UI 框架：React 19；样式：Tailwind CSS 4
- 组件库：Base UI（1.0.0-rc.0，暂未深度接入）+ shadcn 源码组件（`components.json` style=base-nova，图标库字段 hugeicons）
- 图标：当前 lucide-react 过渡；目标主图标 Hugeicons（未安装）；不用 Emoji 充当正式图标；装饰图标 `aria-hidden`
- 动效方案：无独立动效库（按需引入）

## 2. 页面级规范（Page Level）

| 路由 | 目标 | 主要区域 | 状态 |
|---|---|---|---|
| `/` | 官网首页：价值主张 + 控制台入口 | SiteHeader、hero、footer | 已实现（占位内容） |
| `/console`（布局） | 认证区骨架 | AppLayout：顶栏 + 侧边导航 + 内容 | 已实现；登录守卫 TODO（服务端仍须鉴权） |
| `/console/`、`/console/keys`、`/console/usage`、`/console/wallet` | 概览 / API Key / 用量 / 钱包 | PagePlaceholder | 占位页 |
| `/admin`（布局+首页） | 运营后台骨架 | AppLayout + 占位 | 占位页；角色守卫 TODO |

完整页面规划（官网/控制台/后台全页签）见 `UI_TECH_STACK.md` 4 节，新增页面时先对照该清单。

## 3. 区域与模块标准（Section & Module Level）

| 模块 | 职责 | 布局规则 | 状态 | 不负责 |
|---|---|---|---|---|
| AppLayout（components/layout） | 控制台/后台共用壳 | 顶栏 sticky + 侧边 56 宽 + 内容 max-w-5xl；侧边开关存 Zustand | 已实现 | 路由守卫逻辑 |
| SiteHeader | 官网导航 + 主题切换 | sticky 顶栏、max-w-6xl | 已实现 | 登录态 |
| PagePlaceholder | 建设中占位页 | 标题 + badge + 虚线卡片 | 已实现 | — |

## 4. 基础组件规范（Component Level）

- Button（`components/ui/button.tsx`）：cva 变体 default/secondary/outline/ghost/destructive × 尺寸 default/sm/lg/icon；禁用态 opacity-50。**待接入 Base UI Slot（asChild）**
- shadcn 生成组件按 `components.json` 别名落位 `src/components/ui`；业务组件放对应 `features/<feature>/`
- Toast：sonner（richColors、top-center），已在根布局挂载
- 表格/表单/图表：未实现；表格将用 TanStack Table 服务端分页（详设 `UI_TECH_STACK.md` 9 节）

## 5. 交互与动态行为规范（Interaction & Dynamic Behavior）

- 主题切换：ThemeToggle 明暗互切（resolvedTheme 判定，aria-label 本地化）
- 空态：统一 PagePlaceholder "功能建设中" badge；不裸露空白页
- 危险操作必须明确二次确认（规划，随功能实现）
- 金额/数字展示走 `src/lib/utils.ts` 格式化函数（见第 6 节），不内联拼接

## 6. 技术实现与工程规范（Technical & Code Level）

- 类名合并：`cn()`（clsx + tailwind-merge）；变体用 cva
- **金额展示：`formatMicroCNY(micros: string|number|bigint)` 整数微元 → `¥x.xx` 字符串；前端禁止浮点参与金额计算与展示**（单测覆盖：`src/lib/__tests__/utils.test.ts`）
- **文案：所有用户可见文字经 i18next `t()` 输出**（zh-CN 资源 `src/i18n/locales/zh-CN.ts`；品牌/技术名词可保留英文）
- 路由：TanStack Router 文件路由；`src/routeTree.gen.ts` 由构建生成并提交，不手改
- 路径别名 `@/` → `src/`
- 状态：服务端数据只进 TanStack Query；Zustand 仅 UI 状态（侧边栏等）
- 禁止事项：localStorage 存 Session/Key；散落 hex 色；未清洗 HTML 渲染

## 同步规则

- 更改视觉 Token、页面结构、组件变体、交互状态或响应式规则前必须读取本文件，实现后同步更新。
- UI 技术栈或依赖变化时同时更新 `ARCHITECTURE.md` 第 1 节。
- 无需更新时说明原因；非轻量任务把原因写入 `PROGRESS.md`。
