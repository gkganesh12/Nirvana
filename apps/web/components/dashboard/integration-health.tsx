'use client';

interface IntegrationHealth {
  id: string;
  type: string;
  name: string;
  connected: boolean;
  healthy: boolean;
  lastActivity: string | null;
  status: 'healthy' | 'warning' | 'error' | 'disconnected';
}

interface IntegrationHealthListProps {
  integrations: IntegrationHealth[];
}

const statusColors = {
  healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  disconnected: 'bg-stone-100 text-stone-500 border-stone-200',
};

const statusLabels = {
  healthy: 'Healthy',
  warning: 'Warning',
  error: 'Error',
  disconnected: 'Not Connected',
};

export function IntegrationHealthList({ integrations }: IntegrationHealthListProps) {
  const formatLastActivity = (lastActivity: string | null) => {
    if (!lastActivity) return 'No activity';
    const date = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-lg shadow-stone-900/5">
      <h3 className="mb-4 text-sm font-medium text-stone-500">Integration Health</h3>
      <div className="space-y-3">
        {integrations.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-500">No integrations configured</p>
        ) : (
          integrations.map((integration) => (
            <div
              key={integration.id}
              className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 transition-colors hover:border-stone-300 hover:bg-stone-50/60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-lg">
                  {integration.type === 'SLACK'
                    ? '💬'
                    : integration.type === 'AWS_CLOUDWATCH'
                      ? '☁️'
                      : integration.type === 'AZURE_MONITOR'
                        ? '🔷'
                        : integration.type === 'GCP_MONITORING'
                          ? '🟩'
                          : integration.type === 'GRAFANA'
                            ? '📊'
                            : integration.type === 'PROMETHEUS'
                              ? '📈'
                              : integration.type === 'GENERIC_WEBHOOK'
                                ? '🔗'
                                : integration.type === 'TEAMS'
                                  ? '🟦'
                                  : integration.type === 'DISCORD'
                                    ? '🟪'
                                    : integration.type === 'PAGERDUTY'
                                      ? '🚨'
                                      : integration.type === 'OPSGENIE'
                                        ? '🧭'
                                        : '🐛'}
                </div>
                <div>
                  <p className="font-medium text-stone-800">{integration.name}</p>
                  <p className="text-xs text-stone-500">
                    {formatLastActivity(integration.lastActivity)}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[integration.status]}`}
              >
                {statusLabels[integration.status]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
