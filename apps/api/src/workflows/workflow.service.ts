import { Injectable, Logger } from '@nestjs/common';
import { prisma, WorkflowExecutionStatus } from '@signalcraft/database';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto';
import { WORKFLOW_TEMPLATES } from './workflow.templates';
import { WorkflowStep, WorkflowExecutionResult } from './workflow.types';
import { WorkflowTriggerService } from './workflow-trigger.service';
import { HttpActionExecutor } from './executors/http-action.executor';
import { WebhookActionExecutor } from './executors/webhook-action.executor';

@Injectable()
export class WorkflowService {
    private readonly logger = new Logger(WorkflowService.name);

    constructor(
        private readonly httpExecutor: HttpActionExecutor,
        private readonly webhookExecutor: WebhookActionExecutor,
    ) { }

    async getTemplates() {
        return Object.values(WORKFLOW_TEMPLATES);
    }

    async createWorkflow(workspaceId: string, userId: string, dto: CreateWorkflowDto) {
        return prisma.remediationWorkflow.create({
            data: {
                workspaceId,
                createdBy: userId,
                name: dto.name,
                description: dto.description,
                enabled: dto.enabled ?? true,
                trigger: dto.trigger as any,
                steps: dto.steps as any,
            },
        });
    }

    async listWorkflows(workspaceId: string) {
        return prisma.remediationWorkflow.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
            include: {
                creator: {
                    select: {
                        id: true,
                        email: true,
                        displayName: true,
                    },
                },
            },
        });
    }

    async getWorkflow(id: string, workspaceId: string) {
        return prisma.remediationWorkflow.findFirst({
            where: { id, workspaceId },
            include: {
                creator: {
                    select: {
                        id: true,
                        email: true,
                        displayName: true,
                    },
                },
                executions: {
                    take: 10,
                    orderBy: { startedAt: 'desc' },
                    include: {
                        alert: {
                            select: {
                                id: true,
                                title: true,
                                severity: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async updateWorkflow(id: string, workspaceId: string, dto: UpdateWorkflowDto) {
        return prisma.remediationWorkflow.update({
            where: { id, workspaceId },
            data: {
                name: dto.name,
                description: dto.description,
                enabled: dto.enabled,
                trigger: dto.trigger as any,
                steps: dto.steps as any,
            },
        });
    }

    async deleteWorkflow(id: string, workspaceId: string) {
        return prisma.remediationWorkflow.delete({
            where: { id, workspaceId },
        });
    }

    async executeWorkflow(workflowId: string, alertId: string): Promise<string> {
        const workflow = await prisma.remediationWorkflow.findUnique({
            where: { id: workflowId },
        });

        if (!workflow || !workflow.enabled) {
            throw new Error('Workflow not found or disabled');
        }

        // Create execution record
        const execution = await prisma.workflowExecution.create({
            data: {
                workflowId,
                alertId,
                status: WorkflowExecutionStatus.RUNNING,
            },
        });

        // Execute workflow asynchronously
        this.executeWorkflowSteps(execution.id, workflow.steps as any, alertId).catch((error) => {
            this.logger.error(`Workflow execution failed: ${error.message}`, error.stack);
        });

        return execution.id;
    }

    private async executeWorkflowSteps(
        executionId: string,
        steps: WorkflowStep[],
        alertId: string,
    ): Promise<void> {
        const alert = await prisma.alertGroup.findUnique({ where: { id: alertId } });
        if (!alert) {
            throw new Error('Alert not found');
        }

        const executedSteps: WorkflowExecutionResult['executedSteps'] = [];
        let currentStepIds = [steps[0]?.id];

        try {
            while (currentStepIds.length > 0) {
                const stepId = currentStepIds.shift()!;
                const step = steps.find((s) => s.id === stepId);

                if (!step) continue;

                const startedAt = new Date();
                try {
                    const result = await this.executeStep(step, alert);
                    const completedAt = new Date();

                    executedSteps.push({
                        stepId: step.id,
                        status: 'success',
                        output: result.output,
                        startedAt,
                        completedAt,
                    });

                    // Add next steps based on success
                    if (step.onSuccess) {
                        currentStepIds.push(...step.onSuccess);
                    }
                } catch (error: any) {
                    const completedAt = new Date();
                    executedSteps.push({
                        stepId: step.id,
                        status: 'failed',
                        error: error.message,
                        startedAt,
                        completedAt,
                    });

                    // Add next steps based on failure
                    if (step.onFailure) {
                        currentStepIds.push(...step.onFailure);
                    } else {
                        throw error; // Stop execution if no failure path
                    }
                }
            }

            // Mark execution as successful
            await prisma.workflowExecution.update({
                where: { id: executionId },
                data: {
                    status: WorkflowExecutionStatus.SUCCESS,
                    completedAt: new Date(),
                    logs: { executedSteps } as any,
                },
            });
        } catch (error: any) {
            // Mark execution as failed
            await prisma.workflowExecution.update({
                where: { id: executionId },
                data: {
                    status: WorkflowExecutionStatus.FAILED,
                    completedAt: new Date(),
                    error: error.message,
                    logs: { executedSteps } as any,
                },
            });
        }
    }

    private async executeStep(step: WorkflowStep, alert: any): Promise<{ success: boolean; output?: any }> {
        switch (step.type) {
            case 'HTTP_REQUEST':
                return this.httpExecutor.execute(step.config, alert);
            case 'WEBHOOK':
                return this.webhookExecutor.execute(step.config, alert);
            case 'DELAY':
                await new Promise((resolve) => setTimeout(resolve, step.config.milliseconds || 1000));
                return { success: true };
            default:
                throw new Error(`Unknown step type: ${step.type}`);
        }
    }

    async getExecutionHistory(workflowId: string, workspaceId: string) {
        const workflow = await prisma.remediationWorkflow.findFirst({
            where: { id: workflowId, workspaceId },
        });

        if (!workflow) {
            throw new Error('Workflow not found');
        }

        return prisma.workflowExecution.findMany({
            where: { workflowId },
            orderBy: { startedAt: 'desc' },
            take: 50,
            include: {
                alert: {
                    select: {
                        id: true,
                        title: true,
                        severity: true,
                        environment: true,
                    },
                },
            },
        });
    }
}
