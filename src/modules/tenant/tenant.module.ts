import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma/prisma.module.js';
import { TenantService } from './tenant.service.js';
import { TenantController } from './tenant.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [TenantController],
  providers: [TenantService],
})
export class TenantModule {}
