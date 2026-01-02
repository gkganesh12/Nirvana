import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { WebhooksController } from './webhooks.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController, WebhooksController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
