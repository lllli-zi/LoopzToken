import { Controller, Get } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('healthz')
  healthz() {
    return { status: 'ok' };
  }

  @Get('readyz')
  async readyz() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ready' };
  }
}
