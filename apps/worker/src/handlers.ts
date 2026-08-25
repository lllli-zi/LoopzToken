/**
 * Outbox 事件处理器注册表。
 *
 * 骨架阶段所有处理器只做记录；后续按阶段补齐：
 * - request.completed / billing.settled → PostgreSQL 增量汇总表（USAGE-004）
 * - payment.credited / refund.completed → 通知与补偿核对
 * - provider.health_changed → 渠道状态通知
 * 达到升级阈值后由 Outbox Publisher 投递消息队列，本注册表保持不变。
 */
import type { Prisma } from '@loopz/database';

type EventPayload = Prisma.JsonValue;

export type EventHandler = (payload: EventPayload) => Promise<void>;

async function notImplemented(eventType: string): Promise<void> {
  // TODO: 真实处理器；当前仅确认消费成功，避免骨架阶段事件积压为 FAILED
  console.info(`[worker] event consumed (handler TODO): ${eventType}`);
}

const handlers: Record<string, EventHandler> = {
  'request.completed': async () => notImplemented('request.completed'),
  'request.failed': async () => notImplemented('request.failed'),
  'billing.settled': async () => notImplemented('billing.settled'),
  'payment.credited': async () => notImplemented('payment.credited'),
  'refund.completed': async () => notImplemented('refund.completed'),
  'provider.health_changed': async () =>
    notImplemented('provider.health_changed'),
};

export async function handleEvent(
  eventType: string,
  payload: EventPayload,
): Promise<void> {
  const handler = handlers[eventType];
  if (!handler) {
    throw new Error(`unknown outbox event type: ${eventType}`);
  }
  await handler(payload);
}
