import { Module } from '@nestjs/common';
import { AccountService } from './account.service.js';
import { AccountController } from './account.controller.js';
import { UserRepository } from './repositories/user.repository.js';

@Module({
  providers: [AccountService, UserRepository],
  controllers: [AccountController],
  exports: [AccountService, UserRepository],
})
export class AccountModule {}
