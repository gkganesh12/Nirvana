import { StatusSubscribe } from '@/components/status/status-subscribe';

interface StatusPageData {
  slug: string;
  title: string;
  description?: string | null;
  incidents: Array<{
    id: string;
    title: string;
    status: string;
    impact: string;
    message: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function statusColor(status: string) {
  switch (status) {
    case 'RESOLVED':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'MONITORING':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'IDENTIFIED':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    default:
      return 'bg-red-100 text-red-700 border-red-200';
  }
}

export default async function StatusPage({ params }: { params: { slug: string } }) {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/status-pages/public/${params.slug}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    return (
      <main className="min-h-screen bg-stone-50 p-10">
        <div className="mx-auto max-w-3xl text-center text-stone-600">Status page not found.</div>
      </main>
    );
  }
  const page = (await res.json()) as StatusPageData;

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-stone-900">{page.title}</h1>
              <p className="mt-2 text-stone-500">{page.description}</p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Operational
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10 grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-stone-900">Incidents</h2>
          {page.incidents.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
              No active incidents.
            </div>
          ) : (
            page.incidents.map((incident) => (
              <div key={incident.id} className="rounded-2xl border border-stone-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-stone-900">{incident.title}</h3>
                    <p className="mt-1 text-sm text-stone-500">{formatDate(incident.updatedAt)}</p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusColor(incident.status)}`}
                  >
                    {incident.status}
                  </span>
                </div>
                {incident.message && (
                  <p className="mt-3 text-sm text-stone-600">{incident.message}</p>
                )}
              </div>
            ))
          )}
        </div>

        <StatusSubscribe slug={page.slug} />
      </div>
    </main>
  );
}
