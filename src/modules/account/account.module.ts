import { Module } from '@nestjs/common';
import { AccountService } from './account.service.js';
import { AccountController } from './account.controller.js';
import { UserRepository } from './repositories/user.repository.js';

@Module({
  providers: [AccountService, UserRepository],
  controllers: [AccountController],
  exports: [UserRepository],
})
export class AccountModule {}
