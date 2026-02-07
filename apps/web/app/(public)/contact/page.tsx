import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Mail, MapPin, Twitter, Linkedin, Github, Send } from 'lucide-react';

export const metadata = {
  title: 'Contact Nirvana | Get in Touch',
  description: 'Questions? Support? Enterprise needs? Reach out to the Nirvana team.',
};

export default function ContactPage() {
  return (
    <main className="bg-[#FDFCF8] text-stone-900 min-h-screen pt-32 pb-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-stone-900 mb-6">
            Let&apos;s Start a <span className="text-emerald-700">Conversation.</span>
          </h1>
          <p className="text-xl text-stone-600 leading-relaxed max-w-2xl">
            Whether you have questions about our product, need technical support, or want to discuss
            enterprise options, we&apos;re here to help.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Contact Information (Left Column) */}
          <div>
            <div className="bg-white rounded-3xl p-8 border border-stone-200 shadow-xl shadow-stone-900/5 mb-8">
              <h3 className="text-lg font-bold text-stone-900 mb-6 uppercase tracking-wide">
                Contact Details
              </h3>

              <div className="space-y-6">
                <a
                  href="mailto:hello@nirvana.app"
                  className="flex items-start gap-4 p-4 rounded-xl hover:bg-stone-50 transition-colors group"
                >
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                    <Mail className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <span className="block font-bold text-stone-900">Email Us</span>
                    <span className="text-stone-500">hello@nirvana.app</span>
                  </div>
                </a>

                <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-stone-50 transition-colors group">
                  <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <span className="block font-bold text-stone-900">Headquarters</span>
                    <span className="text-stone-500">
                      123 Zen Garden Way
                      <br />
                      San Francisco, CA 94103
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-stone-900 rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -translate-y-8 translate-x-8 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl" />
              <h3 className="text-lg font-bold mb-6 relative z-10">Follow Our Journey</h3>
              <div className="flex gap-4 relative z-10">
                <Link
                  href="https://twitter.com/nirvana"
                  className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </Link>
                <Link
                  href="https://linkedin.com/company/nirvana"
                  className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </Link>
                <Link
                  href="https://github.com/nirvana"
                  className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm transition-colors"
                >
                  <Github className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Contact Form (Right Column) */}
          <div className="bg-white rounded-[2rem] p-8 md:p-10 border border-stone-200 shadow-sm relative">
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">First Name</label>
                  <Input
                    className="bg-stone-50 border-stone-200 focus-visible:ring-emerald-500 h-12"
                    placeholder="Jane"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-stone-700">Last Name</label>
                  <Input
                    className="bg-stone-50 border-stone-200 focus-visible:ring-emerald-500 h-12"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">Email Address</label>
                <Input
                  className="bg-stone-50 border-stone-200 focus-visible:ring-emerald-500 h-12"
                  placeholder="jane@company.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">Subject</label>
                <select className="flex h-12 w-full items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm ring-offset-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
                  <option>I have a product question</option>
                  <option>I need technical support</option>
                  <option>I&apos;m interested in enterprise plans</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">Message</label>
                <Textarea
                  className="bg-stone-50 border-stone-200 focus-visible:ring-emerald-500 min-h-[150px] resize-none"
                  placeholder="How can we help you find your nirvana?"
                />
              </div>

              <Button
                size="lg"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-14 rounded-xl text-lg shadow-lg shadow-emerald-600/20"
              >
                Send Message
                <Send className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
