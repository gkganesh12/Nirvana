import { Module } from '@nestjs/common';
import { ExternalMappingsService } from './external-mappings.service';
import { SyncManagerService } from './sync-manager.service';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  providers: [ExternalMappingsService, SyncManagerService],
  exports: [ExternalMappingsService, SyncManagerService],
})
export class SyncModule {}
