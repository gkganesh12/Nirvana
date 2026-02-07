import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { WebhooksController } from './webhooks.controller';
import { AuthService } from './auth.service';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { ApiOrClerkAuthGuard } from './api-or-clerk-auth.guard';

@Global()
@Module({
  imports: [ApiKeysModule],
  controllers: [AuthController, WebhooksController],
  providers: [AuthService, ClerkAuthGuard, ApiOrClerkAuthGuard],
  exports: [AuthService, ClerkAuthGuard, ApiOrClerkAuthGuard],
})
export class AuthModule {}
