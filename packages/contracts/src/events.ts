/**
 * Outbox 事件契约（TECHNICAL_SOLUTION 19.1）。
 *
 * 事件由业务事务写入 PostgreSQL `outbox_events`，Worker 消费。
 * 达到升级阈值后由 Outbox Publisher 投递消息队列，事件 Schema 保持兼容。
 *
 * 注意：金额以十进制字符串承载 micro 单位，避免 JS 浮点与序列化精度问题。
 */
import { z } from 'zod';

export const OUTBOX_EVENT_TYPES = [
  'request.completed',
  'request.failed',
  'billing.settled',
  'payment.credited',
  'refund.completed',
  'provider.health_changed',
] as const;

export type OutboxEventType = (typeof OUTBOX_EVENT_TYPES)[number];

/** Usage 证据来源优先级见 TECHNICAL_SOLUTION 15.6 */
export const usageSourceSchema = z.enum([
  'provider_bill',
  'final_usage_field',
  'stream_accumulated',
  'local_estimate',
]);

export type UsageSource = z.infer<typeof usageSourceSchema>;

/** Token 分类（PRD BILL-004） */
export const usageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  reasoningTokens: z.number().int().nonnegative(),
  usageSource: usageSourceSchema,
  parserVersion: z.string(),
  estimated: z.boolean(),
});

export type Usage = z.infer<typeof usageSchema>;

export const requestCompletedEventSchema = z.object({
  requestId: z.string(),
  userId: z.string(),
  apiKeyId: z.string(),
  publicModel: z.string(),
  protocol: z.string(),
  providerId: z.string(),
  deploymentId: z.string(),
  usage: usageSchema,
  /** micro-CNY 十进制字符串 */
  amountMicros: z.string().regex(/^\d+$/),
});

export type RequestCompletedEvent = z.infer<typeof requestCompletedEventSchema>;

export const billingSettledEventSchema = z.object({
  requestId: z.string(),
  reservationId: z.string(),
  settlementId: z.string(),
  userId: z.string(),
  amountMicros: z.string().regex(/^\d+$/),
  usage: usageSchema,
});

export type BillingSettledEvent = z.infer<typeof billingSettledEventSchema>;

export const paymentCreditedEventSchema = z.object({
  orderId: z.string(),
  orderNo: z.string(),
  userId: z.string(),
  channel: z.enum(['mock', 'wechat', 'alipay']),
  amountMicros: z.string().regex(/^\d+$/),
});

export type PaymentCreditedEvent = z.infer<typeof paymentCreditedEventSchema>;

export const refundCompletedEventSchema = z.object({
  refundId: z.string(),
  refundNo: z.string(),
  orderId: z.string(),
  userId: z.string(),
  amountMicros: z.string().regex(/^\d+$/),
});

export type RefundCompletedEvent = z.infer<typeof refundCompletedEventSchema>;

export const providerHealthChangedEventSchema = z.object({
  providerId: z.string(),
  deploymentId: z.string().optional(),
  fromState: z.string(),
  toState: z.string(),
  reason: z.string(),
});

export type ProviderHealthChangedEvent = z.infer<
  typeof providerHealthChangedEventSchema
>;

/** 事件类型 → Schema 注册表，Worker 侧按类型校验 payload */
export const outboxEventSchemas = {
  'request.completed': requestCompletedEventSchema,
  'billing.settled': billingSettledEventSchema,
  'payment.credited': paymentCreditedEventSchema,
  'refund.completed': refundCompletedEventSchema,
  'provider.health_changed': providerHealthChangedEventSchema,
} as const;
