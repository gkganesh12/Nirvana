import { Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Blog | Nirvana',
  description: 'Thoughts on DevOps, Alerting, and Engineering Culture.',
};

export default function BlogPage() {
  return (
    <main className="bg-[#FDFCF8] text-stone-900 min-h-screen pt-32 pb-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-emerald-600" />
          </div>
        </div>
        <h1 className="text-5xl font-black text-stone-900 mb-6">
          Our Blog is <span className="text-emerald-700">Coming Soon</span>
        </h1>
        <p className="text-xl text-stone-600 max-w-2xl mx-auto">
          We&apos;re writing up our best thoughts on how to find zen in the chaos of production
          engineering. Stay tuned!
        </p>
      </div>
    </main>
  );
}
