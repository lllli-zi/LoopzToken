import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    // 位于云 WAF / LB 之后，信任代理头以获取真实 IP
    new FastifyAdapter({ trustProxy: true, bodyLimit: 2 * 1024 * 1024 }),
  );

  // CORS 仅允许产品域名（TECHNICAL_SOLUTION 21.3）
  const origins = (process.env.CONTROL_API_CORS_ORIGINS ??
    'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({ origin: origins, credentials: true });

  const port = Number(process.env.CONTROL_API_PORT ?? 3000);
  const host = process.env.CONTROL_API_HOST ?? '0.0.0.0';
  await app.listen(port, host);
  // eslint-disable-next-line no-console
  console.log(`[control-api] listening on http://${host}:${port}`);
}

void bootstrap();
