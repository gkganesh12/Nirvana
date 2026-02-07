
import { GitCommit } from 'lucide-react';

export const metadata = {
  title: 'Changelog | Nirvana',
  description: "What's new in Nirvana.",
};

export default function ChangelogPage() {
  const updates = [
    {
      version: 'v2.5.0',
      date: 'January 15, 2026',
      title: 'New Natural Dashboard Theme',
      description: 'We have completely redesigned the Nirvana interface with a new "Natural" visual language to reduce eye strain and improve clarity.',
      type: 'Major'
    },
     {
      version: 'v2.4.2',
      date: 'December 28, 2025',
      title: 'Improved Slack Grouping',
      description: 'Slack notifications now intelligently thread replies to the original alert message, reducing channel noise.',
      type: 'Improvement'
    },
     {
      version: 'v2.4.1',
      date: 'December 10, 2025',
      title: 'Datadog Webhook Fixes',
      description: 'Fixed an issue where some Datadog monitor tags were not being correctly parsed.',
      type: 'Fix'
    },
  ];

  return (
    <main className="bg-[#FDFCF8] text-stone-900 min-h-screen pt-32 pb-20">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="mb-16">
           <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center">
                <GitCommit className="w-6 h-6 text-stone-600" />
             </div>
             <h1 className="text-4xl font-black text-stone-900">Changelog</h1>
           </div>
           <p className="text-stone-600 text-lg ml-16">
             Track our progress as we build the ultimate incident management platform.
           </p>
        </div>

        <div className="space-y-12 ml-6 border-l-2 border-stone-200 pl-10">
          {updates.map((update, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-[49px] top-6 w-4 h-4 bg-white border-4 border-stone-300 rounded-full" />
              
              <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                 <div className="flex items-center gap-4 mb-4">
                    <span className="font-mono text-sm font-bold bg-stone-100 px-3 py-1 rounded-full text-stone-600">{update.version}</span>
                    <span className="text-stone-400 text-sm">{update.date}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide ml-auto ${
                        update.type === 'Major' ? 'bg-emerald-100 text-emerald-700' :
                        update.type === 'Improvement' ? 'bg-blue-100 text-blue-700' :
                        'bg-stone-100 text-stone-600'
                    }`}>
                        {update.type}
                    </span>
                 </div>
                 <h2 className="text-2xl font-bold text-stone-900 mb-3">{update.title}</h2>
                 <p className="text-stone-600 leading-relaxed">
                   {update.description}
                 </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
