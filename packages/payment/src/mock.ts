/**
 * MockPaymentProvider：开发与自动化测试用（阶段 A 模拟支付闭环）。
 *
 * - createPayment 立即返回可用支付参数（qrCodeContent 为 mock:// 协议）。
 * - verifyNotification 接受形如 `mock.<orderNo>.<providerPaymentId>.<amountMicros>`
 *   的原始报文，格式不符即抛错（模拟验签失败）。
 * - queryPayment / refund 走内存状态，进程内一致。
 */
import type {
  PaymentNotification,
  PaymentOrder,
  PaymentProvider,
  PaymentResult,
  PaymentStatus,
  RefundRequest,
  RefundResult,
} from './types.js';

export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  private readonly paid = new Map<string, { providerPaymentId: string; amountMicros: string }>();
  private readonly refunded = new Set<string>();
  private seq = 0;

  async createPayment(order: PaymentOrder): Promise<PaymentResult> {
    const providerPaymentId = `mock-pay-${++this.seq}`;
    return {
      attemptId: `mock-attempt-${++this.seq}`,
      prepayId: `mock-prepay-${++this.seq}`,
      qrCodeContent: `mock://${order.orderNo}/${providerPaymentId}`,
    };
  }

  async verifyNotification(
    raw: Uint8Array,
    _headers: Record<string, string>,
  ): Promise<PaymentNotification> {
    const text = new TextDecoder().decode(raw);
    const parts = text.trim().split('.');
    if (parts.length !== 4 || parts[0] !== 'mock') {
      throw new Error('mock payment notification verify failed');
    }
    const [, orderNo, providerPaymentId, amountMicros] = parts;
    this.paid.set(orderNo, { providerPaymentId, amountMicros });
    return {
      orderNo,
      providerPaymentId,
      paidAmountMicros: amountMicros,
      status: 'PAID',
    };
  }

  async queryPayment(orderNo: string): Promise<PaymentStatus> {
    const paid = this.paid.get(orderNo);
    if (!paid) return { orderNo, status: 'PENDING' };
    return {
      orderNo,
      status: 'PAID',
      providerPaymentId: paid.providerPaymentId,
      paidAmountMicros: paid.amountMicros,
    };
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    if (this.refunded.has(request.refundNo)) {
      return { refundNo: request.refundNo, status: 'SUCCESS' };
    }
    this.refunded.add(request.refundNo);
    return { refundNo: request.refundNo, status: 'SUCCESS' };
  }
}
