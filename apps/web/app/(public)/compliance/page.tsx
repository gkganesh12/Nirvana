
import { CheckCircle } from 'lucide-react';

export const metadata = {
  title: 'Compliance | Nirvana',
  description: 'Our compliance certifications and standards.',
};

export default function CompliancePage() {
  return (
    <main className="bg-[#FDFCF8] text-stone-900 min-h-screen pt-32 pb-20">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="mb-12">
            <CheckCircle className="w-12 h-12 text-emerald-600 mb-6" />
            <h1 className="text-4xl font-black text-stone-900 mb-4">Compliance Center</h1>
        </div>
        
        <div className="prose prose-stone prose-lg max-w-none">
            <p className="text-xl text-stone-600 mb-8">
                We are committed to meeting the highest standards of regulatory compliance.
            </p>
            
            <div className="grid gap-6 not-prose">
                <div className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-stone-200 shadow-sm">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                        <span className="font-bold text-emerald-700">GDPR</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-1">GDPR Compliant</h3>
                        <p className="text-stone-600">We are fully compliant with the General Data Protection Regulation for EU customers.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-stone-200 shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                        <span className="font-bold text-blue-700">SOC2</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-1">SOC 2 Type II</h3>
                        <p className="text-stone-600">We have achieved SOC 2 Type II certification for security, availability, and confidentiality.</p>
                    </div>
                </div>
                 <div className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-stone-200 shadow-sm">
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                        <span className="font-bold text-purple-700">HIPAA</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg mb-1">HIPAA Ready</h3>
                        <p className="text-stone-600">Our platform supports HIPAA compliant implementation for healthcare customers.</p>
                    </div>
                </div>
            </div>

             <div className="bg-stone-100 p-6 rounded-2xl mt-8">
                <p className="font-bold mb-2">Note for Demo Purposes:</p>
                <p className="text-sm m-0">
                    This is a dummy Compliance page. In a real scenario, this would host downloadable reports and detailed legal frameworks.
                </p>
            </div>
        </div>
      </div>
    </main>
  );
}
