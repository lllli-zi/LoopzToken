import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MICROS_PER_CNY = 1_000_000n;

/**
 * micro-CNY → 人民币展示字符串。
 * 前端只做展示格式化；账务计算一律在服务端以整数完成（UI_TECH_STACK 8）。
 */
export function formatMicroCNY(micros: string | number | bigint): string {
  const microsBig = typeof micros === 'bigint' ? micros : BigInt(micros);
  const sign = microsBig < 0n ? '-' : '';
  const abs = microsBig < 0n ? -microsBig : microsBig;
  const yuan = abs / MICROS_PER_CNY;
  const cents = (abs % MICROS_PER_CNY).toString().padStart(6, '0').slice(0, 2);
  return `${sign}¥${yuan}.${cents}`;
}

export function formatTokens(count: number): string {
  return new Intl.NumberFormat('zh-CN').format(count);
}
