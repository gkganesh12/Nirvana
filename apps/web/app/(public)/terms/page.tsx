import { FileText } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | Nirvana',
  description: 'The rules and regulations for using Nirvana.',
};

export default function TermsPage() {
  return (
    <main className="bg-[#FDFCF8] text-stone-900 min-h-screen pt-32 pb-20">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="mb-12">
          <FileText className="w-12 h-12 text-emerald-600 mb-6" />
          <h1 className="text-4xl font-black text-stone-900 mb-4">Terms of Service</h1>
          <p className="text-stone-500">Last updated: January 1, 2026</p>
        </div>

        <div className="prose prose-stone prose-lg max-w-none">
          <p>
            Welcome to Nirvana. By accessing or using our website, you agree to be bound by these
            Terms of Service.
          </p>
          <h3>1. Acceptance of Terms</h3>
          <p>
            By accessing or using our services, you agree to be bound by these Terms. If you
            disagree with any part of the terms then you may not access the service.
          </p>
          <h3>2. Use License</h3>
          <p>
            Permission is granted to temporarily download one copy of the materials (information or
            software) on Nirvana&apos;s website for personal, non-commercial transitory viewing
            only.
          </p>
          <div className="bg-stone-100 p-6 rounded-2xl mt-8">
            <p className="font-bold mb-2">Note for Demo Purposes:</p>
            <p className="text-sm m-0">
              This is a dummy Terms of Service page created for the Nirvana landing page
              demonstration. In a real application, this would contain the full legal agreements.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
