export interface WorkflowStep {
    id: string;
    type: 'HTTP_REQUEST' | 'SCRIPT' | 'WEBHOOK' | 'SLACK_MESSAGE' | 'DELAY';
    name: string;
    config: Record<string, any>;
    onSuccess?: string[]; // IDs of next steps on success
    onFailure?: string[]; // IDs of next steps on failure
}

export interface WorkflowTrigger {
    severity?: string[];
    environment?: string[];
    tags?: Record<string, string>;
    project?: string[];
}

export interface WorkflowExecutionResult {
    success: boolean;
    output?: any;
    error?: string;
    executedSteps: {
        stepId: string;
        status: 'success' | 'failed' | 'skipped';
        output?: any;
        error?: string;
        startedAt: Date;
        completedAt: Date;
    }[];
}
