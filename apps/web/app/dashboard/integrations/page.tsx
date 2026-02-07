'use client';

import { useEffect, useState } from 'react';
import { 
  Cloud, 
  Workflow, 
  Zap, 
  Webhook, 
  CheckCircle2, 
  Settings2,
  Plus,
  Trash2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { GenericWebhookForm } from '@/components/integrations/generic-webhook-form';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WebhookRegistry {
  id: string;
  name: string;
  integrationType: string;
  webhookUrl: string;
  enabled: boolean;
  fieldMappings: any;
  severityMap: any;
  createdAt: string;
}

const AVAILABLE_INTEGRATIONS = [
  { id: 'AWS_CLOUDWATCH', name: 'AWS CloudWatch', category: 'Cloud Providers', icon: Cloud },
  { id: 'AZURE_MONITOR', name: 'Azure Monitor', category: 'Cloud Providers', icon: Cloud },
  { id: 'GCP_MONITORING', name: 'GCP Monitoring', category: 'Cloud Providers', icon: Cloud },
  { id: 'PROMETHEUS', name: 'Prometheus Alertmanager', category: 'Monitoring', icon: Zap },
  { id: 'GRAFANA', name: 'Grafana Alerts', category: 'Monitoring', icon: Zap },
  { id: 'GENERIC_WEBHOOK', name: 'Generic Webhook', category: 'Monitoring', icon: Webhook },
];

export default function IntegrationsPage() {
  const [webhooks, setWebhooks] = useState<WebhookRegistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [editingWebhook, setEditingWebhook] = useState<WebhookRegistry | null>(null);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/integrations/webhooks');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data);
      }
    } catch (error) {
      console.error('Failed to fetch webhooks', error);
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = async (type: string, name: string) => {
    try {
      setCreating(type);
      const res = await fetch('/api/integrations/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name }),
      });
      
      if (res.ok) {
        toast.success(`${name} integration created`);
        fetchWebhooks();
      } else {
        toast.error('Failed to create integration');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setCreating(null);
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;
    
    try {
      const res = await fetch(`/api/integrations/webhooks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Integration removed');
        fetchWebhooks();
      }
    } catch (error) {
      toast.error('Failed to remove integration');
    }
  };

  const updateWebhook = async (id: string, fieldMappings: any, severityMap: any) => {
    try {
      const res = await fetch(`/api/integrations/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldMappings, severityMap }),
      });
      
      if (res.ok) {
        toast.success(`Configuration updated`);
        fetchWebhooks();
        setEditingWebhook(null);
      } else {
        toast.error('Failed to update configuration');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Webhook URL copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-stone-900">Integrations</h1>
        <p className="text-stone-500">
          Connect SignalCraft to your monitoring stack and route alerts in minutes.
        </p>
      </div>

      {/* Active Integrations */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-stone-900">Active Inbound Webhooks</h2>
        </div>
        
        {webhooks.length === 0 ? (
          <Card className="border-dashed border-stone-300 bg-stone-50">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="rounded-full bg-stone-100 p-3 mb-4">
                <Webhook className="h-6 w-6 text-stone-400" />
              </div>
              <p className="text-stone-600 font-medium">No active webhooks</p>
              <p className="text-stone-400 text-sm mt-1 max-w-sm">
                Get started by connecting one of the monitoring providers below.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {webhooks.map((webhook) => (
              <Card key={webhook.id} className="bg-white border-stone-200 hover:border-red-200 transition-colors shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-red-50 p-2">
                        <Zap className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold">{webhook.name}</CardTitle>
                        <CardDescription className="text-[10px] uppercase font-mono tracking-wider">
                          {webhook.integrationType.replace('_', ' ')}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-stone-400 hover:text-red-600"
                      onClick={() => deleteWebhook(webhook.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md bg-stone-50 p-3 border border-stone-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-tighter">Webhook URL</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-[10px] flex gap-1 items-center px-1.5 hover:bg-white"
                        onClick={() => copyToClipboard(webhook.webhookUrl)}
                      >
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <div className="text-[11px] font-mono break-all text-stone-700 bg-white/50 p-2 rounded border border-stone-100/50">
                      {webhook.webhookUrl}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-stone-50">
                    <span className="text-[10px] text-stone-400">Created {new Date(webhook.createdAt).toLocaleDateString()}</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs border-stone-200"
                      onClick={() => setEditingWebhook(webhook)}
                    >
                      <Settings2 className="h-3 w-3 mr-1" /> Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Available Integrations */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">Connect a New Source</h2>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {AVAILABLE_INTEGRATIONS.map((integration) => {
            const Icon = integration.icon;
            const isCreating = creating === integration.id;
            
            return (
              <Card 
                key={integration.id} 
                className="group relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 hover:border-red-200 cursor-pointer"
                onClick={() => createWebhook(integration.id, integration.name)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-stone-50 p-3 group-hover:bg-red-50 transition-colors">
                      <Icon className="h-6 w-6 text-stone-600 group-hover:text-red-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{integration.category}</p>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-stone-500 mb-4 h-10 line-clamp-2">
                    {integration.id === 'AWS_CLOUDWATCH' && 'Integrate with AWS SNS to receive EC2, RDS, and Lambda alarms.'}
                    {integration.id === 'AZURE_MONITOR' && 'Connect Azure Action Groups to receive infrastructure alerts.'}
                    {integration.id === 'GCP_MONITORING' && 'Capture Stackdriver incidents from your GCP projects.'}
                    {integration.id === 'PROMETHEUS' && 'Directly ingest Prometheus Alertmanager webhook notifications.'}
                    {integration.id === 'GRAFANA' && 'Route Grafana dashboard alerts with visualization links.'}
                    {integration.id === 'GENERIC_WEBHOOK' && 'Custom payload mapping with JSONPath for any generic source.'}
                  </p>
                  <Button 
                    className="w-full bg-stone-900 hover:bg-red-600 text-white transition-all rounded-lg"
                    disabled={!!creating}
                  >
                    {isCreating ? <Spinner className="h-4 w-4" /> : <><Plus className="h-4 w-4 mr-2" /> Connect</>}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Communication & Incident Management */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">Outbound & Incident Sync</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {/* These would be the existing Slack/Jira/etc components */}
          <Card className="border-stone-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base">Outbound Channels</CardTitle>
              </div>
              <CardDescription>Configure where SignalCraft delivers alerts and updates.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start gap-2 h-12"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Slack</Button>
              <Button variant="outline" className="justify-start gap-2 h-12"><Plus className="h-4 w-4" /> MS Teams</Button>
              <Button variant="outline" className="justify-start gap-2 h-12"><Plus className="h-4 w-4" /> Discord</Button>
              <Button variant="outline" className="justify-start gap-2 h-12"><Plus className="h-4 w-4" /> PagerDuty</Button>
            </CardContent>
          </Card>

          <Card className="border-stone-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base">Bidirectional Sync</CardTitle>
              </div>
              <CardDescription>Keep SignalCraft incidents in sync with external tools.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start gap-2 h-12"><Plus className="h-4 w-4" /> Jira Software</Button>
              <Button variant="outline" className="justify-start gap-2 h-12"><Plus className="h-4 w-4" /> Opsgenie</Button>
              <Button variant="outline" className="justify-start gap-2 h-12"><Plus className="h-4 w-4" /> Service Now</Button>
              <Button variant="outline" className="justify-start gap-2 h-12 text-stone-400 italic">More soon...</Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Edit Webhook Dialog */}
      <Dialog open={!!editingWebhook} onOpenChange={() => setEditingWebhook(null)}>
        <DialogContent className="max-w-2xl bg-white border-stone-200">
          <DialogHeader>
            <DialogTitle>Configure {editingWebhook?.name}</DialogTitle>
            <DialogDescription>
              Configure how SignalCraft processes payloads from this source.
            </DialogDescription>
          </DialogHeader>
          {editingWebhook && (
            <div className="mt-4">
              <GenericWebhookForm 
                initialMappings={editingWebhook.fieldMappings as any}
                initialSeverityMap={editingWebhook.severityMap as any}
                onSave={(mappings, severityMap) => updateWebhook(editingWebhook.id, mappings, severityMap)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
