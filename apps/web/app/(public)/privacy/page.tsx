
import { Shield } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | Nirvana',
  description: 'How we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <main className="bg-[#FDFCF8] text-stone-900 min-h-screen pt-32 pb-20">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="mb-12">
            <Shield className="w-12 h-12 text-emerald-600 mb-6" />
            <h1 className="text-4xl font-black text-stone-900 mb-4">Privacy Policy</h1>
            <p className="text-stone-500">Last updated: January 1, 2026</p>
        </div>
        
        <div className="prose prose-stone prose-lg max-w-none">
            <p>
                At Nirvana, we take your privacy seriously. This privacy policy describes how we collect, use, and share your personal information.
            </p>
            <h3>1. Information We Collect</h3>
            <p>
                We collect information you provide directly to us, such as when you create an account, subscribe to our newsletter, or contact us for support.
            </p>
            <h3>2. How We Use Information</h3>
            <p>
                We use the information we collect to operate, maintain, and improve our services, to communicate with you, and to protect our users.
            </p>
            <h3>3. Data Security</h3>
            <p>
                We use reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
            </p>
            <div className="bg-stone-100 p-6 rounded-2xl mt-8">
                <p className="font-bold mb-2">Note for Demo Purposes:</p>
                <p className="text-sm m-0">
                    This is a dummy privacy policy page created for the Nirvana landing page demonstration. 
                    In a real application, this would contain the full legal text.
                </p>
            </div>
        </div>
      </div>
    </main>
  );
}
