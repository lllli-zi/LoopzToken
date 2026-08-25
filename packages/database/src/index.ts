import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | undefined;

/** Prisma Client 单例（Bun 运行时） */
export function getPrismaClient(): PrismaClient {
  prisma ??= new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });
  return prisma;
}

export * from '@prisma/client';
