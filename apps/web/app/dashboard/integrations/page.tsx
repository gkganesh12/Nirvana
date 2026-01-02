import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function IntegrationsPage() {
  return (
    <Card className="bg-white/80">
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
        <CardDescription>Connect Sentry + Slack during Phase 2.</CardDescription>
      </CardHeader>
    </Card>
  );
}
