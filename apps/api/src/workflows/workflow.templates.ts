export const WORKFLOW_TEMPLATES = {
    RESTART_SERVICE: {
        name: 'Restart Kubernetes Service',
        description: 'Automatically restart a failed Kubernetes pod',
        trigger: {
            severity: ['CRITICAL', 'HIGH'],
            tags: { service_type: 'kubernetes' },
        },
        steps: [
            {
                id: 'step1',
                type: 'HTTP_REQUEST',
                name: 'Delete Pod',
                config: {
                    url: 'https://kubernetes.default.svc/api/v1/namespaces/{{alert.environment}}/pods/{{alert.project}}',
                    method: 'DELETE',
                    headers: {
                        Authorization: 'Bearer {{secrets.k8s_token}}',
                    },
                },
                onSuccess: ['step2'],
                onFailure: ['step3'],
            },
            {
                id: 'step2',
                type: 'WEBHOOK',
                name: 'Notify Success',
                config: {
                    url: '{{secrets.slack_webhook_url}}',
                    customPayload: {
                        text: '✅ Service {{alert.project}} restarted successfully',
                    },
                },
            },
            {
                id: 'step3',
                type: 'WEBHOOK',
                name: 'Notify Failure',
                config: {
                    url: '{{secrets.slack_webhook_url}}',
                    customPayload: {
                        text: '❌ Failed to restart service {{alert.project}}',
                    },
                },
            },
        ],
    },

    SCALE_DEPLOYMENT: {
        name: 'Scale Deployment',
        description: 'Scale up a deployment when high load is detected',
        trigger: {
            severity: ['HIGH'],
            tags: { alert_type: 'high_load' },
        },
        steps: [
            {
                id: 'step1',
                type: 'HTTP_REQUEST',
                name: 'Scale Deployment',
                config: {
                    url: 'https://kubernetes.default.svc/apis/apps/v1/namespaces/{{alert.environment}}/deployments/{{alert.project}}/scale',
                    method: 'PATCH',
                    headers: {
                        Authorization: 'Bearer {{secrets.k8s_token}}',
                        'Content-Type': 'application/strategic-merge-patch+json',
                    },
                    body: {
                        spec: {
                            replicas: 5,
                        },
                    },
                },
                onSuccess: ['step2'],
            },
            {
                id: 'step2',
                type: 'WEBHOOK',
                name: 'Notify Team',
                config: {
                    url: '{{secrets.slack_webhook_url}}',
                    customPayload: {
                        text: '📈 Scaled {{alert.project}} to 5 replicas due to high load',
                    },
                },
            },
        ],
    },

    CLEAR_CACHE: {
        name: 'Clear Application Cache',
        description: 'Clear Redis cache when cache-related errors occur',
        trigger: {
            severity: ['MEDIUM', 'HIGH'],
            tags: { error_type: 'cache' },
        },
        steps: [
            {
                id: 'step1',
                type: 'HTTP_REQUEST',
                name: 'Clear Cache',
                config: {
                    url: 'https://api.example.com/cache/clear',
                    method: 'POST',
                    headers: {
                        Authorization: 'Bearer {{secrets.api_token}}',
                    },
                    body: {
                        pattern: '{{alert.project}}:*',
                    },
                },
                onSuccess: ['step2'],
            },
            {
                id: 'step2',
                type: 'DELAY',
                name: 'Wait for Cache Clear',
                config: {
                    milliseconds: 5000,
                },
                onSuccess: ['step3'],
            },
            {
                id: 'step3',
                type: 'WEBHOOK',
                name: 'Confirm Clear',
                config: {
                    url: '{{secrets.slack_webhook_url}}',
                    customPayload: {
                        text: '🗑️ Cache cleared for {{alert.project}}',
                    },
                },
            },
        ],
    },
};
