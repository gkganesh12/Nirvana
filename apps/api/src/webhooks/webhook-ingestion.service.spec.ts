import { Test, TestingModule } from '@nestjs/testing';
import { WebhookIngestionService } from './webhook-ingestion.service';
import { SecretsService } from '../common/secrets/secrets.service';
import { AwsCloudWatchStrategy } from './strategies/aws-cloudwatch.strategy';
import { PrometheusAlertmanagerStrategy } from './strategies/prometheus.strategy';
import { GenericWebhookStrategy } from './strategies/generic-webhook.strategy';
import { AzureMonitorStrategy } from './strategies/azure-monitor.strategy';
import { GcpMonitoringStrategy } from './strategies/gcp-monitoring.strategy';
import { GrafanaAlertStrategy } from './strategies/grafana.strategy';
import { AlertProcessorService } from '../alerts/alert-processor.service';
import {
    ConfigurationException,
    AuthenticationException,
} from '../common/exceptions/base.exception';

describe('WebhookIngestionService', () => {
    let service: WebhookIngestionService;
    let alertProcessor: jest.Mocked<AlertProcessorService>;
    let secretsService: jest.Mocked<SecretsService>;

    const mockAlertResult = {
        alertEventId: 'ae_123',
        alertGroupId: 'ag_456',
        duplicate: false,
        notificationsQueued: 1,
    };

    beforeEach(async () => {
        alertProcessor = {
            processNormalizedAlert: jest.fn().mockResolvedValue(mockAlertResult),
        } as unknown as jest.Mocked<AlertProcessorService>;

        secretsService = {
            getSecret: jest.fn().mockRejectedValue(new Error('Not found')),
            getSecretJson: jest.fn().mockRejectedValue(new Error('Not found')),
        } as unknown as jest.Mocked<SecretsService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WebhookIngestionService,
                {
                    provide: SecretsService,
                    useValue: secretsService,
                },
                {
                    provide: AlertProcessorService,
                    useValue: alertProcessor,
                },
                {
                    provide: AwsCloudWatchStrategy,
                    useValue: {
                        canHandle: (s: string) => s === 'aws-cloudwatch' || s === 'AWS_CLOUDWATCH',
                        ingest: jest.fn().mockResolvedValue([mockAlertResult]),
                    },
                },
                {
                    provide: PrometheusAlertmanagerStrategy,
                    useValue: {
                        canHandle: (s: string) => s === 'prometheus' || s === 'PROMETHEUS',
                        ingest: jest.fn().mockResolvedValue([mockAlertResult]),
                    },
                },
                {
                    provide: GenericWebhookStrategy,
                    useFactory: () => {
                        const strategy = new GenericWebhookStrategy(alertProcessor);
                        return strategy;
                    },
                },
                {
                    provide: AzureMonitorStrategy,
                    useValue: {
                        canHandle: (s: string) => s === 'azure-monitor' || s === 'AZURE_MONITOR',
                        ingest: jest.fn().mockResolvedValue([mockAlertResult]),
                    },
                },
                {
                    provide: GcpMonitoringStrategy,
                    useValue: {
                        canHandle: (s: string) => s === 'gcp-monitoring' || s === 'GCP_MONITORING',
                        ingest: jest.fn().mockResolvedValue([mockAlertResult]),
                    },
                },
                {
                    provide: GrafanaAlertStrategy,
                    useValue: {
                        canHandle: (s: string) => s === 'grafana' || s === 'GRAFANA',
                        ingest: jest.fn().mockResolvedValue([mockAlertResult]),
                    },
                },
            ],
        }).compile();

        service = module.get<WebhookIngestionService>(WebhookIngestionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('ingest', () => {
        it('should process AWS CloudWatch webhook successfully', async () => {
            const result = await service.ingest({
                workspaceId: 'ws_123',
                source: 'aws-cloudwatch',
                payload: {
                    Message: JSON.stringify({
                        AlarmName: 'HighCPU',
                        NewStateValue: 'ALARM',
                    }),
                },
            });

            expect(result).toEqual({
                status: 'ok',
                source: 'aws-cloudwatch',
                total: 1,
                duplicates: 0,
                processed: 1,
                notificationsQueued: 1,
            });
        });

        it('should process Prometheus webhook successfully', async () => {
            const result = await service.ingest({
                workspaceId: 'ws_123',
                source: 'prometheus',
                payload: {
                    alerts: [
                        {
                            status: 'firing',
                            labels: { alertname: 'HighMemory', severity: 'critical' },
                            annotations: { description: 'Memory usage high' },
                        },
                    ],
                },
            });

            expect(result.status).toBe('ok');
            expect(result.source).toBe('prometheus');
        });

        it('should process generic webhook with minimal payload', async () => {
            const result = await service.ingest({
                workspaceId: 'ws_123',
                source: 'generic',
                payload: {
                    title: 'Test Alert',
                    severity: 'HIGH',
                    message: 'This is a test alert',
                },
            });

            expect(result.status).toBe('ok');
            expect(alertProcessor.processNormalizedAlert).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspaceId: 'ws_123',
                    normalized: expect.objectContaining({
                        title: 'Test Alert',
                        severity: 'HIGH',
                        source: 'GENERIC_WEBHOOK',
                    }),
                }),
            );
        });

        it('should throw ConfigurationException for unsupported source', async () => {
            await expect(
                service.ingest({
                    workspaceId: 'ws_123',
                    source: 'unknown-source',
                    payload: {},
                }),
            ).rejects.toThrow(ConfigurationException);
        });

        it('should throw AuthenticationException for invalid token when configured', async () => {
            // Configure a secret for generic webhook
            secretsService.getSecret.mockResolvedValueOnce('valid-token');

            await expect(
                service.ingest({
                    workspaceId: 'ws_123',
                    source: 'generic',
                    payload: { title: 'Test' },
                    token: 'wrong-token',
                }),
            ).rejects.toThrow(AuthenticationException);
        });

        it('should allow request when token matches configured secret', async () => {
            secretsService.getSecret.mockResolvedValueOnce('valid-token');

            const result = await service.ingest({
                workspaceId: 'ws_123',
                source: 'generic',
                payload: { title: 'Test Alert' },
                token: 'valid-token',
            });

            expect(result.status).toBe('ok');
        });

        it('should handle duplicate alerts correctly', async () => {
            alertProcessor.processNormalizedAlert.mockResolvedValueOnce({
                ...mockAlertResult,
                duplicate: true,
                notificationsQueued: 0,
            });

            const result = await service.ingest({
                workspaceId: 'ws_123',
                source: 'generic',
                payload: { title: 'Duplicate Alert' },
            });

            expect(result.duplicates).toBe(1);
            expect(result.processed).toBe(0);
            expect(result.notificationsQueued).toBe(0);
        });
    });

    describe('Azure Monitor webhook', () => {
        it('should process Azure Monitor alert successfully', async () => {
            const result = await service.ingest({
                workspaceId: 'ws_123',
                source: 'azure-monitor',
                payload: {
                    schemaId: 'azureMonitorCommonAlertSchema',
                    data: {
                        essentials: {
                            alertId: 'alert_123',
                            alertRule: 'High CPU',
                            severity: 'Sev1',
                        },
                    },
                },
            });

            expect(result.status).toBe('ok');
            expect(result.source).toBe('azure-monitor');
        });
    });

    describe('GCP Monitoring webhook', () => {
        it('should process GCP Monitoring alert successfully', async () => {
            const result = await service.ingest({
                workspaceId: 'ws_123',
                source: 'gcp-monitoring',
                payload: {
                    incident: {
                        incident_id: 'inc_123',
                        condition_name: 'High Latency',
                        state: 'open',
                    },
                },
            });

            expect(result.status).toBe('ok');
            expect(result.source).toBe('gcp-monitoring');
        });
    });

    describe('Grafana webhook', () => {
        it('should process Grafana alert successfully', async () => {
            const result = await service.ingest({
                workspaceId: 'ws_123',
                source: 'grafana',
                payload: {
                    title: 'Panel Alert',
                    state: 'alerting',
                    ruleUrl: 'https://grafana.example.com/rule/123',
                },
            });

            expect(result.status).toBe('ok');
            expect(result.source).toBe('grafana');
        });
    });
});
