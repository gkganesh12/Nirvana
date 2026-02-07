import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Careers | Nirvana',
  description: 'Join us in our mission to bring peace to on-call engineers.',
};

export default function CareersPage() {
  return (
    <main className="bg-[#FDFCF8] text-stone-900 min-h-screen pt-32 pb-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center">
            <Heart className="w-10 h-10 text-rose-500" />
          </div>
        </div>
        <h1 className="text-5xl font-black text-stone-900 mb-6">
          Join the <span className="text-emerald-700">Nirvana</span> Team
        </h1>
        <p className="text-xl text-stone-600 max-w-2xl mx-auto mb-12">
          We&apos;re always looking for talented engineers, designers, and problem solvers to help
          us build the future of incident management.
        </p>

        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-stone-200 shadow-xl">
          <h3 className="text-xl font-bold mb-4">No open positions right now</h3>
          <p className="text-stone-500 mb-6">
            But we&apos;d love to hear from you! Send us your portfolio or resume and we&apos;ll
            keep it on file.
          </p>
          <Button
            asChild
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold h-12 rounded-xl"
          >
            <Link href="mailto:careers@nirvana.app">Email Us</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
