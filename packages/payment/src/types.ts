/**
 * 支付 Provider 抽象（TECHNICAL_SOLUTION 16.1）。
 *
 * 实现顺序：MockPaymentProvider（阶段 A）→ 微信 / 支付宝官方商户接口（阶段 B）。
 * 安全要求（16.3）：只相信异步通知或主动查单；严格验签；支付流水号唯一；
 * 入账与订单状态更新通过 Outbox 保证最终一致。
 */

/** 金额一律 micro-CNY 十进制字符串 */
export type Micros = string;

export interface PaymentOrder {
  orderNo: string;
  amountMicros: Micros;
  channel: PaymentChannel;
  subject: string;
}

export type PaymentChannel = 'mock' | 'wechat' | 'alipay';

export interface PaymentResult {
  /** 本地支付尝试 ID（payment_attempts.id） */
  attemptId: string;
  /** 支付渠道预支付 / 参数 ID */
  prepayId: string;
  /** 客户端跳转或二维码内容（渠道而定） */
  payUrl?: string;
  qrCodeContent?: string;
}

export interface PaymentNotification {
  orderNo: string;
  providerPaymentId: string;
  paidAmountMicros: Micros;
  status: 'PAID' | 'REFUNDED' | 'UNKNOWN';
}

export interface PaymentStatus {
  orderNo: string;
  status: 'PENDING' | 'PAID' | 'CLOSED';
  providerPaymentId?: string;
  paidAmountMicros?: Micros;
}

export interface RefundRequest {
  orderNo: string;
  refundNo: string;
  amountMicros: Micros;
  reason: string;
}

export interface RefundResult {
  refundNo: string;
  status: 'SUBMITTED' | 'SUCCESS' | 'FAILED';
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(order: PaymentOrder): Promise<PaymentResult>;
  /** 验签失败必须抛错，不得返回"未验证"的通知 */
  verifyNotification(
    raw: Uint8Array,
    headers: Record<string, string>,
  ): Promise<PaymentNotification>;
  queryPayment(orderNo: string): Promise<PaymentStatus>;
  refund(request: RefundRequest): Promise<RefundResult>;
}
