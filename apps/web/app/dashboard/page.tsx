import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const cards = [
  {
    title: 'Active alerts',
    value: '12',
    note: '3 escalations pending',
  },
  {
    title: 'Dedup savings',
    value: '68%',
    note: 'Noise reduced this week',
  },
  {
    title: 'Mean time to ack',
    value: '4m 12s',
    note: 'Across all teams',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Alert Inbox</h1>
        <p className="text-muted-foreground">
          Phase 1 shell. Hook this up to real alert data in Phase 2.
        </p>
      </div>
      <section className="grid gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} className="bg-white/80">
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle className="text-2xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{card.note}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <Card className="bg-white/80">
        <CardHeader>
          <CardTitle>Recent incidents</CardTitle>
          <CardDescription>Hook into AlertGroup in Phase 2</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border border-border bg-white px-4 py-3">
            <p className="text-sm font-medium">Payments API latency regression</p>
            <p className="text-sm text-muted-foreground">Slack #oncall-alerts</p>
          </div>
          <div className="rounded-md border border-border bg-white px-4 py-3">
            <p className="text-sm font-medium">Checkout 5xx spike</p>
            <p className="text-sm text-muted-foreground">Escalation timer running</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
