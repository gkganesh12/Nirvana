import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';

interface WorkflowTriggerMatcher {
    severity?: string[];
    environment?: string[];
    project?: string[];
    tags?: Record<string, string>;
}

@Injectable()
export class WorkflowTriggerService {
    private readonly logger = new Logger(WorkflowTriggerService.name);

    async findMatchingWorkflows(workspaceId: string, alert: any): Promise<string[]> {
        const workflows = await prisma.remediationWorkflow.findMany({
            where: {
                workspaceId,
                enabled: true,
            },
        });

        const matchingWorkflowIds: string[] = [];

        for (const workflow of workflows) {
            const trigger = workflow.trigger as WorkflowTriggerMatcher;

            if (this.matchesTrigger(alert, trigger)) {
                matchingWorkflowIds.push(workflow.id);
                this.logger.log(`Workflow "${workflow.name}" matched for alert ${alert.id}`);
            }
        }

        return matchingWorkflowIds;
    }

    private matchesTrigger(alert: any, trigger: WorkflowTriggerMatcher): boolean {
        // Check severity match
        if (trigger.severity && trigger.severity.length > 0) {
            if (!trigger.severity.includes(alert.severity)) {
                return false;
            }
        }

        // Check environment match
        if (trigger.environment && trigger.environment.length > 0) {
            if (!trigger.environment.includes(alert.environment)) {
                return false;
            }
        }

        // Check project match
        if (trigger.project && trigger.project.length > 0) {
            if (!trigger.project.includes(alert.project)) {
                return false;
            }
        }

        // Check tags match
        if (trigger.tags) {
            for (const [key, value] of Object.entries(trigger.tags)) {
                if (alert.tags?.[key] !== value) {
                    return false;
                }
            }
        }

        return true;
    }
}
