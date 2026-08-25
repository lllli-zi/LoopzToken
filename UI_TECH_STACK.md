# LoopzToken UI 技术栈方案

## 1. 目标

LoopzToken UI 与 New API 当前前端技术栈保持一致，便于复用其开发经验、组件模式和前端人才能力，避免同时维护 Next.js 与 React SPA 两套前端范式。

本方案以 2026-08-25 New API `main` 分支的 `web/package.json` 和前端开发规范为参考。具体版本在项目初始化时锁定，后续升级必须经过类型检查、测试和生产构建验证。

参考：

- [New API web/package.json](https://github.com/QuantumNous/new-api/blob/main/web/package.json)
- [New API 前端开发规范](https://github.com/QuantumNous/new-api/blob/main/web/AGENTS.md)
- [New API Rsbuild 配置](https://github.com/QuantumNous/new-api/blob/main/web/rsbuild.config.ts)

## 2. 最终选型

| 类别 | 技术 | 用途 |
| --- | --- | --- |
| 包管理 | Bun | 安装依赖、脚本和锁文件 |
| UI 框架 | React 19 | 官网、控制台和运营后台 |
| 开发语言 | TypeScript | 类型安全和前后端契约 |
| 构建工具 | Rsbuild 2 | 开发服务器、构建和代码分割 |
| 路由 | TanStack Router | 文件路由、类型安全导航和权限守卫 |
| 服务端数据 | TanStack Query | 查询、缓存、变更和失效刷新 |
| 本地状态 | Zustand | 登录态、主题和轻量跨组件状态 |
| HTTP | Axios | 统一 API 实例、Cookie 和错误拦截 |
| 样式 | Tailwind CSS 4 | 设计 Token、响应式和暗色模式 |
| 基础组件 | Base UI + shadcn | 可访问的无样式原语和项目内组件代码 |
| 样式组合 | CVA + clsx + tailwind-merge | Variant 和类名合并 |
| 图标 | Hugeicons + Lucide React | 主图标与补充图标 |
| 表单 | React Hook Form + Zod | 表单状态和共享校验 Schema |
| 表格 | TanStack Table | 用户、订单、请求和渠道列表 |
| 虚拟滚动 | TanStack Virtual | 大量调用日志和账单行 |
| 图表 | VChart / React VChart | 用量、成本、毛利和延迟趋势 |
| 国际化 | i18next + react-i18next | 简体中文与后续多语言 |
| 日期 | Day.js | 日期、时区和范围格式化 |
| 通知 | Sonner | 成功、错误和警告提示 |
| 主题 | next-themes | 明暗主题；该库可用于普通 React SPA |
| 二维码 | qrcode.react | 微信、支付宝充值二维码 |
| 测试 | Vitest + React Testing Library | 单元和组件行为测试 |
| 代码质量 | oxlint + oxfmt + TypeScript 类型检查 | Lint、格式和类型校验 |

## 3. 版本基线

初始化时参考 New API 当前主版本：

```text
React 19
TypeScript
Rsbuild 2
TanStack Router 1
TanStack Query 5
TanStack Table 8
TanStack Virtual 3
Tailwind CSS 4
Zod 4
Zustand 5
Vitest 4
```

版本策略：

- 初始化时生成并提交 `bun.lock`。
- 生产依赖不直接使用未锁定的 `latest`。
- 每月集中评估依赖更新，不在业务功能提交中顺手升级。
- React、Router、Query、Tailwind 和 Rsbuild 的大版本升级单独处理。
- 安全修复可以优先升级，但仍需运行针对性验证。

## 4. UI 应用形态

LoopzToken 使用一个 React SPA 承载：

```text
官网
模型与价格
API 文档入口
注册和登录
用户控制台
运营后台
状态和法律页面
```

使用路由布局隔离：

```text
公开布局
├─ /
├─ /models
├─ /pricing
├─ /docs
├─ /status
└─ /legal/*

认证布局
├─ /console
├─ /console/keys
├─ /console/usage
├─ /console/wallet
├─ /console/orders
├─ /console/setup
└─ /console/account

管理员布局
├─ /admin/users
├─ /admin/models
├─ /admin/providers
├─ /admin/routes
├─ /admin/orders
├─ /admin/refunds
├─ /admin/billing
├─ /admin/risk
└─ /admin/audit
```

TanStack Router 的 `beforeLoad` 负责登录与角色守卫，服务端仍必须再次验证权限，不能信任前端路由保护。

## 5. 目录结构

```text
apps/web/
├── public/
├── scripts/
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn / Base UI 基础组件
│   │   ├── layout/             # 页面布局、侧边栏和导航
│   │   └── charts/             # 通用图表组件
│   ├── features/
│   │   ├── auth/
│   │   ├── api-keys/
│   │   ├── models/
│   │   ├── usage/
│   │   ├── wallet/
│   │   ├── payments/
│   │   ├── providers/
│   │   ├── routing/
│   │   ├── risk/
│   │   └── audit/
│   ├── hooks/
│   ├── i18n/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── errors.ts
│   │   ├── query-client.ts
│   │   └── utils.ts
│   ├── routes/                 # TanStack Router 文件路由
│   ├── stores/                 # Zustand Stores
│   ├── styles/
│   │   └── index.css
│   ├── types/
│   └── main.tsx
├── components.json
├── index.html
├── package.json
├── bun.lock
├── rsbuild.config.ts
├── tsconfig.json
├── vitest.config.ts
├── .oxlintrc.json
└── .oxfmtrc.json
```

功能模块采用：

```text
features/<feature>/
├── components/
├── hooks/
├── lib/
├── __tests__/
├── api.ts
├── constants.ts
└── types.ts
```

## 6. 组件系统

### 6.1 基础组件

- Base UI 提供 Dialog、Popover、Select、Menu 等可访问原语。
- shadcn 以源码方式生成项目内组件，不作为黑盒运行时依赖。
- `components.json` 使用 `base-nova` 风格、Neutral 基础色、CSS Variables 和 Hugeicons。
- 公共组件放入 `src/components/ui`，业务组件放到对应 Feature。

### 6.2 设计 Token

使用 Tailwind CSS 4 和 CSS Variables 维护：

```text
颜色
字号
字重
间距
圆角
阴影
状态色
图表色
```

示例语义变量：

```css
--background
--foreground
--card
--primary
--secondary
--muted
--border
--success
--warning
--destructive
--chart-1
--chart-2
```

业务代码使用语义变量，不直接散落品牌色十六进制值。

### 6.3 图标

- 主图标统一使用 Hugeicons。
- 仅在 Hugeicons 缺少合适图标时使用 Lucide React。
- 不使用 Emoji 代替正式产品图标。
- 装饰图标添加 `aria-hidden="true"`。

## 7. 数据请求与状态

### 7.1 TanStack Query

服务端数据全部通过 TanStack Query 管理：

```text
用户资料
API Key
模型和价格
余额和流水
订单和退款
请求明细
Provider 状态
运营统计
```

Query Key 采用层级数组：

```ts
['api-keys', userId]
['usage', userId, filters]
['admin', 'providers', filters]
['admin', 'orders', filters]
```

变更成功后精确失效相关 Query，不全量清空缓存。

### 7.2 Zustand

只保存客户端状态：

```text
当前用户的轻量快照
侧边栏状态
主题
语言
临时筛选偏好
```

余额、订单、模型和 Provider 状态不放入长期 Zustand Store，以 TanStack Query 数据为准。

### 7.3 Axios

建立唯一 `api` 实例：

```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_CONTROL_API_URL,
  withCredentials: true,
});
```

拦截器负责：

- 附加 CSRF Token（采用 Cookie Session 时）。
- 统一识别未登录和权限不足。
- 转换服务端错误结构。
- 写入前端 Trace ID。
- 禁止输出敏感请求头。

## 8. 表单与校验

所有复杂表单使用 React Hook Form + Zod：

```text
注册和登录
API Key 创建
充值订单
模型价格
Provider 配置
路由策略
退款处理
余额人工调整
```

校验 Schema 放在 Feature 的 `lib/` 中。前端校验仅改善用户体验，Control API 必须使用独立服务端 Schema 再次验证。

金额输入：

- 前端使用字符串承载用户输入。
- 提交前转换为服务端要求的整数分或微元格式。
- 禁止 JavaScript 浮点数参与最终账务计算。

## 9. 表格与大列表

TanStack Table 用于：

- 请求明细。
- 钱包流水。
- 订单和退款。
- 用户列表。
- Provider 和 Deployment。
- 审计日志。

大量数据要求：

- 服务端分页、筛选和排序。
- 不在浏览器一次加载全部数据。
- 超过可视范围使用 TanStack Virtual。
- 筛选条件同步到 Router Search Params，刷新后保持。

## 10. 图表

VChart 作为主图表库：

- Token 用量趋势。
- 用户消费趋势。
- Provider 成功率。
- 首 Token 延迟。
- 收入、成本与毛利。
- 缓存读写比例。

Recharts 仅在迁移已有 New API 组件或 VChart 缺少对应能力时使用，避免同一页面混用两个图表体系。

## 11. 国际化

首发默认简体中文，同时从第一天使用 i18next：

```text
zh-CN
en-US（后续开放）
```

要求：

- 所有用户可见文案通过 `t()` 输出。
- 状态枚举保存 `labelKey`，不保存最终显示字符串。
- 日期、金额和 Token 数量按 Locale 格式化。
- 品牌、API、模型和技术名词可以保留英文。

## 12. Markdown、代码与流式展示

如果控制台提供 API 操练场或接入示例，采用：

```text
marked / stream-markdown-parser
DOMPurify
Shiki
CodeMirror
KaTeX
sse.js
```

要求：

- Markdown 输出必须经过 DOMPurify。
- 禁止直接渲染未经清洗的 HTML。
- 流式内容使用增量解析，不反复解析完整历史文本。
- 大段代码按需高亮，避免阻塞主线程。

首发若不提供聊天操练场，可以暂不安装这一组依赖。

## 13. 前端安全

- 登录优先使用 `HttpOnly + Secure + SameSite` Cookie。
- 不把 Session、上游 Key 或完整用户 API Key 写入 localStorage。
- 用户创建 API Key 后只展示一次，并提醒立即保存。
- 所有管理操作由服务端再次鉴权。
- 危险操作使用明确的二次确认，不采用模糊确认按钮。
- 支付结果以 Control API 查询结果为准，不信任页面跳转参数。
- 禁止在错误上报中发送 Authorization、Cookie、API Key 和完整支付数据。
- CSP、CORS、CSRF 和安全 Header 由 Control API 与反向代理共同配置。

## 14. 可访问性

- 使用语义化 HTML。
- 表单字段关联 Label、说明和错误信息。
- 所有功能支持键盘操作和可见焦点。
- Dialog、Menu、Select 优先使用 Base UI 的可访问能力。
- 正文对比度满足 WCAG 2.1 AA。
- 图表提供文字摘要或表格替代。
- 状态不能只依赖颜色表达。

## 15. 性能

- 路由级代码分割和 `React.lazy`。
- 表格服务端分页，大列表虚拟滚动。
- React Query 设置符合数据变化频率的 `staleTime`。
- 图表和编辑器按需加载。
- 避免订阅完整 Zustand Store。
- 生产构建拆分 React、UI Primitives 和 TanStack Vendor Chunk。
- 生产环境移除普通 `console.log`，保留必要错误上报。
- 监控首屏资源、路由 Chunk、交互延迟和异常率。

## 16. 测试

### 16.1 单元测试

Vitest 覆盖：

- 金额展示和转换。
- Token 与价格格式化。
- 权限判断。
- Filter 和 Search Params。
- Zod Schema。

### 16.2 组件测试

React Testing Library 覆盖：

- 登录和验证码。
- API Key 创建后一次性展示。
- 充值二维码和订单状态。
- 余额不足和调用错误。
- Provider、模型和价格表单。
- 管理操作二次确认。
- 键盘和可访问状态。

### 16.3 端到端测试

核心流程使用 Playwright 或同类工具：

```text
注册 → 登录 → 模拟充值 → 创建 Key
查看用量 → 查询订单 → 申请退款
管理员创建模型 → 配置 Provider → 发布价格
```

## 17. 代码质量命令

```bash
bun run typecheck
bun run lint
bun run format:check
bun run test
bun run build
```

最低要求：

- 修改 TypeScript/TSX 后运行类型检查。
- 运行直接相关测试。
- 修复变更文件的所有 Lint Error。
- 发布前执行生产构建。
- 核心功能目标覆盖率 80% 以上，优先保护真实行为而非追求数字。

## 18. 构建与部署

Rsbuild 输出静态资源：

```text
apps/web/dist/
```

生产部署：

```text
用户
→ CDN / WAF
→ 静态 UI
→ Control API
```

环境变量使用 `VITE_` 前缀，仅允许公开配置：

```text
VITE_CONTROL_API_URL
VITE_PUBLIC_GATEWAY_URL
VITE_APP_ENV
VITE_SENTRY_DSN（如允许公开）
```

不得放入前端环境变量：

```text
数据库密码
支付私钥
上游 API Key
KMS 凭据
Cookie 签名密钥
管理员密钥
```

## 19. 与 New API 保持一致的边界

保持一致：

- React + TypeScript。
- Bun。
- Rsbuild。
- TanStack Router、Query、Table、Virtual。
- Tailwind CSS、Base UI 和 shadcn。
- Zustand、React Hook Form、Zod。
- i18next、Day.js、VChart。
- oxlint、oxfmt、Vitest。
- Feature-first 目录结构和前端规范。

不直接复制：

- New API 商标和品牌资源。
- 与 LoopzToken 需求无关的页面。
- 未确认许可证的专有素材。
- New API 的用户、钱包和管理业务逻辑。
- 上游项目中的密钥、配置和部署数据。

技术栈一致不代表直接复制 UI。LoopzToken 应保留独立品牌、产品信息架构和账务流程。

## 20. 分阶段交付范围

### 20.1 首期生产版本

- 官网、注册登录、协议确认。
- 模型价格与接入文档。
- 余额、充值、订单和退款进度。
- API Key 创建、权限和限额。
- 逐请求用量、计费状态和费用证据展示。
- 模型、Provider、价格、用户、订单和审计后台。
- 服务状态、错误提示和支付补偿状态。

首期统计全部通过 Control API 获取，UI 不直接依赖 ClickHouse、Kafka 或任何基础设施实现。后端切换分析存储时，前端查询契约保持兼容。

### 20.2 规模化版本

- 高级毛利和 Provider 质量分析。
- 大数据量虚拟滚动与异步导出。
- 企业组织、合同价格和更细粒度 RBAC。
- 多地域服务状态和容量视图。

## 21. 最终结论

LoopzToken UI 采用：

```text
Bun
+ React 19
+ TypeScript
+ Rsbuild 2
+ TanStack Router / Query / Table / Virtual
+ Tailwind CSS 4
+ Base UI / shadcn
+ Zustand
+ React Hook Form / Zod
+ VChart
+ i18next
+ Vitest / Testing Library
+ oxlint / oxfmt
```

这套 UI 技术栈与 New API 当前前端保持一致，同时继续通过独立 Control API 对接 LoopzToken 自研的用户、支付、钱包、模型和渠道系统。
