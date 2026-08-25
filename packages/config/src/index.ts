/**
 * 共享配置与环境变量 Schema。
 *
 * 平台基线常量来源：TECHNICAL_SOLUTION.md 第 3、22.4 节。
 */
import { z } from 'zod';

/** 首发设计基线（容量类，见 TECHNICAL_SOLUTION 3） */
export const PLATFORM_LIMITS = {
  /** SSE 并发连接设计基线 */
  SSE_DESIGN_CONCURRENCY: 3_000,
  /** 新请求峰值 RPS */
  NEW_REQUEST_PEAK_RPS: 100,
  /** 请求体上限（> 32 MB 返回 413） */
  MAX_REQUEST_BODY_BYTES: 32 * 1024 * 1024,
  /** 单次请求最长持续时间 */
  MAX_REQUEST_DURATION_SECONDS: 600,
  /** Gateway 附加延迟目标 */
  GATEWAY_P95_ADDED_LATENCY_MS: 30,
} as const;

/** 超时基线（见 TECHNICAL_SOLUTION 22.4） */
export const TIMEOUTS = {
  CONNECT_TIMEOUT_SECONDS: 10,
  FIRST_TOKEN_TIMEOUT_SECONDS: 120,
  STREAM_IDLE_TIMEOUT_SECONDS: 180,
  CONTROL_PLANE_TIMEOUT_SECONDS: 15,
  BILLING_INTERNAL_TIMEOUT_MS: 3_000,
} as const;

/** 金额单位：1 CNY = 1,000,000 micro-CNY（TECHNICAL_SOLUTION 15.1） */
export const MONEY = {
  MICROS_PER_UNIT: 1_000_000,
} as const;

/** 基础环境变量（数据面与控制面共用） */
export const envSchema = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.url().default('redis://localhost:6379'),
});

export type Env = z.infer<typeof envSchema>;

/** Gateway 专用：API Key HMAC pepper，生产来自 KMS / Secret Manager */
export const apiKeyPepperSchema = z.object({
  API_KEY_PEPPER: z.string().min(16, 'API_KEY_PEPPER 至少 16 字符'),
});

export type ApiKeyPepperEnv = z.infer<typeof apiKeyPepperSchema>;

export function loadEnv(processEnv: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(processEnv);
  if (!parsed.success) {
    throw new Error(`环境变量校验失败: ${parsed.error.message}`);
  }
  return parsed.data;
}
