/**
 * PostgreSQL Outbox 消费 Worker（TECHNICAL_SOLUTION 19.1 / 5.4）。
 *
 * 首期直接消费 PostgreSQL Outbox：FOR UPDATE SKIP LOCKED 分批领取，
 * 记录重试次数与下一次执行时间；达到升级阈值后再引入消息队列。
 *
 * 幂等与失败策略：处理器必须可重入；失败按 30s * 2^attempts 退避，
 * 超过最大重试次数进入 FAILED 并等待人工处理（告警接入后触发通知）。
 */
import { getPrismaClient, OutboxStatus, type OutboxEvent } from '@loopz/database';

import { handleEvent } from './handlers';

const prisma = getPrismaClient();

const BATCH_SIZE = 20;
const POLL_INTERVAL_MS = 2_000;
const MAX_ATTEMPTS = 5;
const MAX_BACKOFF_MS = 15 * 60 * 1000;

let running = true;

async function claimBatch(): Promise<OutboxEvent[]> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM outbox_events
      WHERE status = 'PENDING' AND next_run_at <= now()
      ORDER BY created_at
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    `;
    if (rows.length === 0) {
      return [];
    }
    const ids = rows.map((row) => row.id);
    await tx.outboxEvent.updateMany({
      where: { id: { in: ids } },
      data: { status: OutboxStatus.PROCESSING },
    });
    return tx.outboxEvent.findMany({ where: { id: { in: ids } } });
  });
}

async function markDone(id: string): Promise<void> {
  await prisma.outboxEvent.update({
    where: { id },
    data: { status: OutboxStatus.DONE, doneAt: new Date() },
  });
}

async function markFailed(event: OutboxEvent, error: unknown): Promise<void> {
  const attempts = event.attempts + 1;
  const message = error instanceof Error ? error.message : String(error);
  if (attempts >= MAX_ATTEMPTS) {
    await prisma.outboxEvent.update({
      where: { id: event.id },
      data: { status: OutboxStatus.FAILED, attempts, lastError: message },
    });
    // TODO: 告警通知（OPS-006）
    return;
  }
  const backoffMs = Math.min(30_000 * 2 ** attempts, MAX_BACKOFF_MS);
  await prisma.outboxEvent.update({
    where: { id: event.id },
    data: {
      status: OutboxStatus.PENDING,
      attempts,
      lastError: message,
      nextRunAt: new Date(Date.now() + backoffMs),
    },
  });
}

async function processBatch(): Promise<number> {
  const events = await claimBatch();
  for (const event of events) {
    try {
      await handleEvent(event.eventType, event.payload);
      await markDone(event.id);
    } catch (error) {
      await markFailed(event, error);
    }
  }
  return events.length;
}

async function tick(): Promise<void> {
  try {
    const processed = await processBatch();
    if (processed > 0) {
      console.info(`[worker] processed ${processed} outbox events`);
    }
  } catch (error) {
    // 数据库不可用等基础设施错误：本轮回退（claimBatch 事务保证不丢事件）
    console.error('[worker] outbox poll failed:', error);
  }
}

async function main(): Promise<void> {
  console.info('[worker] outbox consumer started');
  const timer = setInterval(() => {
    void tick();
  }, POLL_INTERVAL_MS);

  const shutdown = async () => {
    if (!running) return;
    running = false;
    clearInterval(timer);
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

void main();
