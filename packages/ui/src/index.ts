/**
 * @loopz/ui 共享 UI 资产占位。
 *
 * 设计 Token 与基础组件目前集中在 apps/web（Tailwind CSS 4 + CSS Variables，
 * 见 apps/web/src/styles/index.css）。当出现第二个 Web 应用或组件库需要
 * 跨应用复用时，将 shadcn 组件与 Token 迁移/下沉到这里，避免提前抽象。
 */
export const UI_PACKAGE = '@loopz/ui' as const;
