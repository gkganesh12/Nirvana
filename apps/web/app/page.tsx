import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserSummary } from '@/components/user-summary';

const features = [
  {
    title: 'Unified Alert Inbox',
    description: 'Route alerts from Sentry, Datadog, and more into one noise-free view.',
  },
  {
    title: 'Intelligent Deduplication',
    description: 'Group related alerts and focus on the underlying incident, not the spam.',
  },
  {
    title: 'Smart Routing',
    description: 'Route alerts to the right team with flexible rules and escalation paths.',
  },
];

export default function HomePage() {
  return (
    <main className="px-6 py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-16">
        <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              SignalCraft
            </p>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Alerts that respect your time.
              <span className="block text-primary">Signal, routing, and action in one place.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              A lightweight operations layer that turns noisy alerts into accountable workflows. Built
              for lean teams who need real-time clarity without the SRE overhead.
            </p>
            <UserSummary />
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg">
                <Link href="/signup">Start with Clerk</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
          <Card className="border-none bg-white/70 shadow-xl">
            <CardHeader>
              <CardTitle>Today&apos;s signal summary</CardTitle>
              <CardDescription>Real-time operational clarity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-md border border-border bg-background px-4 py-3">
                <div>
                  <p className="text-sm text-muted-foreground">Open incidents</p>
                  <p className="text-2xl font-semibold">3</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Avg. response</p>
                  <p className="text-2xl font-semibold">4m</p>
                </div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-md border border-border bg-white px-4 py-3">
                  <p className="text-sm font-medium">Sentry / API latency spike</p>
                  <p className="text-sm text-muted-foreground">Escalates in 12 min</p>
                </div>
                <div className="rounded-md border border-border bg-white px-4 py-3">
                  <p className="text-sm font-medium">Datadog / DB CPU high</p>
                  <p className="text-sm text-muted-foreground">Acknowledged by Ganesh</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-white/80">
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
