import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Leaf, Heart, Zap, Award } from 'lucide-react';

export const metadata = {
  title: 'About Nirvana | The Zen of DevOps',
  description:
    'Our mission is to bring peace and clarity to engineering teams by filtering the noise and surfacing what matters.',
};

export default function AboutPage() {
  return (
    <main className="bg-[#FDFCF8] text-stone-900 min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-emerald-50/50 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-96 h-96 bg-stone-100/50 rounded-full blur-3xl" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-stone-900 mb-8">
            Building the <span className="text-emerald-700">Zen</span> of DevOps
          </h1>
          <p className="text-xl md:text-2xl text-stone-600 max-w-3xl mx-auto leading-relaxed">
            We believe that monitoring shouldn&apos;t mean constant anxiety. Nirvana exists to bring
            peace, clarity, and focus back to engineering teams.
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-white border-y border-stone-100">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-sm font-bold text-stone-500 mb-4 uppercase tracking-widest">
                OUR STORY
              </h2>
              <h3 className="text-3xl md:text-4xl font-bold text-stone-900 mb-6">
                From Chaos to Clarity
              </h3>
              <div className="space-y-6 text-lg text-stone-600">
                <p>
                  It started with a 3 AM pager duty call. Another false alarm. Another sleepless
                  night. Our founders, ex-SREs at major tech companies, realized that as systems
                  grew more complex, the tools to monitor them were only adding to the noise.
                </p>
                <p>
                  We built Nirvana to be the filter we always wished we had. A tool that
                  doesn&apos;t just pass along every spike and error, but understands context,
                  groups related issues, and only wakes you up when it truly matters.
                </p>
                <p>
                  Today, Nirvana processes millions of alerts for teams around the world, turning
                  deafening noise into actionable intelligence.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-stone-100 overflow-hidden relative shadow-2xl shadow-stone-900/5 border border-stone-200">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Leaf className="w-24 h-24 text-emerald-600 mx-auto mb-4 opacity-80" />
                    <p className="text-stone-400 font-medium">Restoring Balance</p>
                  </div>
                </div>
              </div>
              {/* Decorative floaters */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-center shadow-lg animate-bounce duration-[3000ms]">
                <Heart className="w-10 h-10 text-rose-400" />
              </div>
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-center shadow-lg animate-bounce duration-[4000ms]">
                <Zap className="w-10 h-10 text-emerald-500" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-[#FDFCF8]">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-stone-900">Our Core Principles</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Leaf,
                title: 'Sustainability',
                description:
                  'Human attention is a finite resource. We design tools that respect your time and mental energy.',
              },
              {
                icon: Zap,
                title: 'Speed with Purpose',
                description:
                  'Fast responses matter, but accurate responses matter more. We optimize for high-signal velocity.',
              },
              {
                icon: Award,
                title: 'Craftsmanship',
                description:
                  'We believe developer tools should be beautiful, intuitive, and a joy to use every single day.',
              },
            ].map((value, i) => (
              <div
                key={i}
                className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center mb-6 text-stone-900">
                  <value.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-3">{value.title}</h3>
                <p className="text-stone-600 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Made By Section */}
      <section className="py-24 bg-white border-y border-stone-100">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <div className="mx-auto w-32 h-32 relative mb-6 rounded-full overflow-hidden border-4 border-stone-100 shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ganesh-profile.jpeg"
              alt="Ganesh Khetawat"
              className="object-cover w-full h-full"
            />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 mb-2">Made by Ganesh Khetawat</h2>
          <p className="text-stone-500 max-w-xl mx-auto">
            Crafted with passion to help developers find their zen.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-stone-900 mb-8">
            Join us in the pursuit of operational zen.
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-stone-900 hover:bg-stone-800 text-white shadow-xl shadow-stone-900/10 px-8 py-6 text-lg font-bold rounded-full"
            >
              <Link href="/careers">View Open Roles</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-2 border-stone-200 text-stone-700 hover:bg-stone-50 px-8 py-6 text-lg font-bold rounded-full bg-white"
            >
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
