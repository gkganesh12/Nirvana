
import { Lock } from 'lucide-react';

export const metadata = {
  title: 'Security | Nirvana',
  description: 'Our commitment to keeping your data safe.',
};

export default function SecurityPage() {
  return (
    <main className="bg-[#FDFCF8] text-stone-900 min-h-screen pt-32 pb-20">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="mb-12">
            <Lock className="w-12 h-12 text-emerald-600 mb-6" />
            <h1 className="text-4xl font-black text-stone-900 mb-4">Security at Nirvana</h1>
        </div>
        
        <div className="prose prose-stone prose-lg max-w-none">
            <p className="text-xl text-stone-600 mb-8">
                Security is our top priority. We use enterprise-grade security to protect your data.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 not-prose mb-12">
                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-2">Encryption</h3>
                    <p className="text-stone-600">All data is encrypted in transit (TLS 1.2+) and at rest (AES-256).</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-2">SOC 2 Compliance</h3>
                    <p className="text-stone-600">We undergo regular third-party audits to ensure we meet rigorous security standards.</p>
                </div>
                 <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-2">Single Sign-On (SSO)</h3>
                    <p className="text-stone-600">Enterprise plans include SAML SSO support for secure team access.</p>
                </div>
                 <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                    <h3 className="font-bold text-lg mb-2">Infrastructure</h3>
                    <p className="text-stone-600">Hosted on AWS with multi-zone availability and automated backups.</p>
                </div>
            </div>

             <div className="bg-stone-100 p-6 rounded-2xl mt-8">
                <p className="font-bold mb-2">Note for Demo Purposes:</p>
                <p className="text-sm m-0">
                    This is a dummy Security page created to showcase the types of security information typically provided by SaaS platforms.
                </p>
            </div>
        </div>
      </div>
    </main>
  );
}
