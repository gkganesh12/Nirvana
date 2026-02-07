import { Blocks, Mail, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Integrations | Nirvana',
  description: 'Connect Nirvana with your favorite tools.',
};

export default function IntegrationsPage() {
  const categories = [
    {
      name: 'Monitoring',
      tools: [
        { name: 'Sentry', logo: 'https://cdn.simpleicons.org/sentry/362D59' },
        { name: 'Datadog', logo: 'https://cdn.simpleicons.org/datadog/632CA6' },
        { name: 'New Relic', logo: 'https://cdn.simpleicons.org/newrelic/008C99' },
        { name: 'Prometheus', logo: 'https://cdn.simpleicons.org/prometheus/E6522C' },
        { name: 'Grafana', logo: 'https://cdn.simpleicons.org/grafana/F46800' },
        { name: 'Splunk', logo: 'https://cdn.simpleicons.org/splunk/000000' },
      ],
    },
    {
      name: 'Communication',
      tools: [
        { name: 'Slack', logo: 'https://cdn.simpleicons.org/slack/4A154B' },
        { name: 'Microsoft Teams', logo: 'https://cdn.simpleicons.org/microsoftteams/6264A7' },
        { name: 'Discord', logo: 'https://cdn.simpleicons.org/discord/5865F2' },
        { name: 'Email', icon: Mail },
        { name: 'SMS', icon: MessageSquare },
      ],
    },
    {
      name: 'Incident Management',
      tools: [
        { name: 'PagerDuty', logo: 'https://cdn.simpleicons.org/pagerduty/06AC38' },
        { name: 'OpsGenie', logo: 'https://cdn.simpleicons.org/opsgenie/172B4D' },
        { name: 'ServiceNow', logo: 'https://cdn.simpleicons.org/servicenow/81B5A1' },
        { name: 'Jira', logo: 'https://cdn.simpleicons.org/jira/0052CC' },
      ],
    },
  ];

  return (
    <main className="bg-[#FDFCF8] text-stone-900 min-h-screen pt-32 pb-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-16">
          <Blocks className="w-16 h-16 text-emerald-600 mx-auto mb-6" />
          <h1 className="text-5xl font-black text-stone-900 mb-6">Integrations Directory</h1>
          <p className="text-xl text-stone-600 max-w-2xl mx-auto">
            Nirvana connects with 20+ tools to centralize your alerts and streamline your workflow.
          </p>
        </div>

        <div className="space-y-16">
          {categories.map((category) => (
            <div key={category.name}>
              <h2 className="text-2xl font-bold text-stone-900 mb-8 border-b border-stone-200 pb-4">
                {category.name}
              </h2>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                {category.tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <div
                      key={tool.name}
                      className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
                    >
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-bold text-stone-500 shrink-0 p-2 border border-stone-100">
                        {tool.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={tool.logo}
                            alt={tool.name}
                            className="w-full h-full object-contain"
                          />
                        ) : Icon ? (
                          <Icon className="w-6 h-6 text-stone-600" />
                        ) : (
                          <span className="text-xl">{tool.name[0]}</span>
                        )}
                      </div>
                      <span className="font-bold text-stone-900 text-lg">{tool.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center bg-stone-900 text-white rounded-3xl p-12">
          <h2 className="text-3xl font-bold mb-4">Don&apos;t see your tool?</h2>
          <p className="text-stone-400 mb-8 max-w-2xl mx-auto">
            We&apos;re constantly adding new integrations. You can also monitor anything using our
            custom webhooks API.
          </p>
          <Button
            asChild
            className="bg-white text-stone-900 hover:bg-stone-100 font-bold h-12 px-8 rounded-full"
          >
            <Link href="/contact">Request Integration</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
