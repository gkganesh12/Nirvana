import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowController } from './workflow.controller';
import { HttpActionExecutor } from './executors/http-action.executor';
import { WebhookActionExecutor } from './executors/webhook-action.executor';
import { WorkflowTriggerService } from './workflow-trigger.service';

@Module({
    controllers: [WorkflowController],
    providers: [WorkflowService, HttpActionExecutor, WebhookActionExecutor, WorkflowTriggerService],
    exports: [WorkflowService, WorkflowTriggerService],
})
export class WorkflowModule { }
