import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/audit.service';

@Module({
  imports: [AuditModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, AuditService],
})
export class WorkspacesModule {}
