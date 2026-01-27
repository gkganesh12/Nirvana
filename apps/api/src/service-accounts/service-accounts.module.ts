import { Module } from '@nestjs/common';
import { ServiceAccountsController } from './service-accounts.controller';
import { ServiceAccountsService } from './service-accounts.service';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [ApiKeysModule],
  controllers: [ServiceAccountsController],
  providers: [ServiceAccountsService],
  exports: [ServiceAccountsService],
})
export class ServiceAccountsModule {}
