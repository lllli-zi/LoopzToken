/**
 * Billing Service 内部 API 契约（TECHNICAL_SOLUTION 5.2）。
 *
 * Go 实现：services/billing；调用方：Gateway（Go）与 Worker（TS）。
 * 所有写接口必须携带 idempotency_key，数据库建立唯一约束。
 * 金额一律 micro-CNY 整数（BigInt / 十进制字符串承载）。
 */
import { z } from 'zod';

const micros = z.string().regex(/^\d+$/, 'micro 金额十进制字符串');

export const createReservationRequestSchema = z.object({
  idempotencyKey: z.string().min(1),
  userId: z.string(),
  apiKeyId: z.string(),
  requestId: z.string(),
  /** 预冻结金额组成见 TECHNICAL_SOLUTION 15.2 */
  amountMicros: micros,
});

export type CreateReservationRequest = z.infer<
  typeof createReservationRequestSchema
>;

export const reservationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  amountMicros: micros,
  status: z.enum(['RESERVED', 'SETTLED', 'RELEASED', 'EXPIRED']),
  createdAt: z.string(),
});

export type Reservation = z.infer<typeof reservationSchema>;

export const settleReservationRequestSchema = z.object({
  idempotencyKey: z.string().min(1),
  /** 最终费用；结算事务步骤见 TECHNICAL_SOLUTION 15.3 */
  amountMicros: micros,
  priceVersionId: z.string(),
  usageSource: z.enum([
    'provider_bill',
    'final_usage_field',
    'stream_accumulated',
    'local_estimate',
  ]),
  parserVersion: z.string(),
  estimated: z.boolean(),
});

export type SettleReservationRequest = z.infer<
  typeof settleReservationRequestSchema
>;

export const releaseReservationRequestSchema = z.object({
  idempotencyKey: z.string().min(1),
  reason: z.string(),
});

export type ReleaseReservationRequest = z.infer<
  typeof releaseReservationRequestSchema
>;

export const createRechargeRequestSchema = z.object({
  idempotencyKey: z.string().min(1),
  userId: z.string(),
  orderId: z.string(),
  channel: z.enum(['mock', 'wechat', 'alipay']),
  amountMicros: micros,
});

export type CreateRechargeRequest = z.infer<typeof createRechargeRequestSchema>;

export const createRefundRequestSchema = z.object({
  idempotencyKey: z.string().min(1),
  userId: z.string(),
  refundId: z.string(),
  amountMicros: micros,
  reason: z.string(),
});

export type CreateRefundRequest = z.infer<typeof createRefundRequestSchema>;

export const walletSchema = z.object({
  userId: z.string(),
  balanceMicros: micros,
  frozenMicros: micros,
  updatedAt: z.string(),
});

export type Wallet = z.infer<typeof walletSchema>;

/** Billing 内部 API 路径常量（与 services/billing 路由保持一致） */
export const BILLING_ROUTES = {
  reservations: '/internal/v1/billing/reservations',
  settle: (id: string) => `/internal/v1/billing/reservations/${id}/settle`,
  release: (id: string) => `/internal/v1/billing/reservations/${id}/release`,
  recharges: '/internal/v1/billing/recharges',
  refunds: '/internal/v1/billing/refunds',
  wallet: (userId: string) => `/internal/v1/wallets/${userId}`,
} as const;
