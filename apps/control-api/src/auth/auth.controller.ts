import {
  Body,
  Controller,
  NotImplementedException,
  Post,
} from '@nestjs/common';
import { z } from 'zod';

import type { PrismaService } from '../prisma/prisma.service';

const registerSchema = z.object({
  email: z.email().optional(),
  phone: z.string().min(5).optional(),
  password: z.string().min(8).max(128),
  // AUTH-003：注册时记录协议版本与同意时间
  consentDocVersion: z.string(),
});

const loginSchema = z.object({
  account: z.string().min(1),
  password: z.string().min(1),
});

/**
 * 账号与安全（PRD 8.1 AUTH-001 ~ 006）。
 * 框架阶段仅建立契约与服务端校验骨架；业务实现见阶段 B。
 * 安全要求：Argon2id 密码哈希、验证码、登录限流、会话 HttpOnly Cookie。
 */
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    // TODO: Argon2id 哈希、验证码校验、user_consents 落库、审计
    void registerSchema.parse(body);
    void this.prisma;
    throw new NotImplementedException('注册功能待实现（框架占位）');
  }

  @Post('login')
  async login(@Body() body: unknown) {
    // TODO: 登录限流、会话签发（HttpOnly + Secure + SameSite Cookie）
    void loginSchema.parse(body);
    throw new NotImplementedException('登录功能待实现（框架占位）');
  }
}
