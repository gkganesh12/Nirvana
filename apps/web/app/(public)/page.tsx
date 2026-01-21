'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';

const features = [
  {
    title: 'Unified Alert Inbox',
    description: 'Route alerts from Sentry, Datadog, and more into one noise-free view.',
  },
  {
    title: 'Intelligent Deduplication',
    description: 'Group related alerts and focus on the underlying incident, not the spam.',
  },
  {
    title: 'Smart Routing',
    description: 'Route alerts to the right team with flexible rules and escalation paths.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  }
};

export default function HomePage() {
  return (
    <main className="bg-black text-white selection:bg-red-900/50">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 md:pt-24 lg:pt-32 border-b border-red-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-black to-black opacity-50" />
        
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <motion.div 
            className="mx-auto max-w-2xl text-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h1 
              className="text-4xl font-bold tracking-tight text-white sm:text-6xl"
              variants={itemVariants}
            >
              Silence the noise. <br />
              <span className="text-red-600 drop-shadow-[0_0_25px_rgba(220,38,38,0.6)]">
                Solve the incident.
              </span>
            </motion.h1>
            
            <motion.p 
              className="mt-6 text-lg leading-8 text-red-100/60"
              variants={itemVariants}
            >
              The AI-native incident response platform that turns thousands of noisy alerts into 
              actionable intelligence.
            </motion.p>
            
            <motion.div 
              className="mt-10 flex items-center justify-center gap-x-6"
              variants={itemVariants}
            >
              <Button asChild size="lg" className="bg-red-600 hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.4)] text-white border border-red-500 transition-all hover:scale-105">
                <Link href="/signup">Start Free Trial</Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="text-red-400 hover:text-white hover:bg-red-950/50 transition-all hover:scale-105">
                <Link href="#features">See how it works <span aria-hidden="true" className="ml-2">→</span></Link>
              </Button>
            </motion.div>
          </motion.div>
          
          {/* Dashboard Preview */}
          <div className="mt-16 flow-root sm:mt-24 perspective-1000">
            <motion.div 
              initial={{ opacity: 0, rotateX: 15, y: 40 }}
              animate={{ opacity: 1, rotateX: 0, y: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 60,
                damping: 20,
                delay: 0.4 
              }}
              className="-m-2 rounded-xl bg-red-950/10 p-2 ring-1 ring-inset ring-red-900/20 lg:-m-4 lg:rounded-2xl lg:p-4 backdrop-blur-sm"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="rounded-md shadow-2xl border border-gray-700 overflow-hidden bg-black"
              >
                 {/* Mac Window Header */}
                 <div className="flex items-center gap-4 bg-[#f3f4f6] border-b border-gray-300 px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]" />
                      <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d89e24]" />
                      <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]" />
                    </div>
                    <div className="flex-1 text-center pr-14">
                       <div className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1 shadow-sm border border-gray-200">
                          <span className="text-xs text-gray-500 font-medium tracking-wide">signalcraft.app</span>
                       </div>
                    </div>
                 </div>
                 
                 {/* Window Content */}
                 <div className="aspect-[16/9] bg-black relative p-8 flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-950/20 to-black">
                    <Card className="w-full max-w-lg shadow-2xl shadow-red-900/20 border border-red-900/30 p-6 bg-black">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-lg text-red-500 flex items-center gap-2">
                                        Server Latency Spike (99p)
                                    </h3>
                                    <p className="text-sm text-red-400/60">api-service • production</p>
                                </div>
                                <span className="px-2 py-1 bg-red-950 text-red-500 text-xs font-bold rounded border border-red-900 shadow-[0_0_10px_rgba(220,38,38,0.2)]">CRITICAL</span>
                            </div>
                            <div className="p-3 bg-red-950/30 text-red-200 text-sm rounded-lg border border-red-900/50">
                                ✨ <strong>AI Suggestion:</strong> This correlates with the recent deployment `v2.4.1`. 
                            </div>
                            <div className="h-2 bg-red-950/30 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  whileInView={{ width: "75%" }}
                                  viewport={{ once: true }}
                                  transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
                                  className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]" 
                                />
                            </div>
                            <p className="text-xs text-red-500/50 text-right">Impact: 850 users affected</p>
                        </div>
                    </Card>
                 </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32 overflow-hidden">
         {/* Background accent */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-red-900/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-2xl lg:text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-base font-semibold leading-7 text-red-600">Deploy faster</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything you need to manage incidents
            </p>
            <p className="mt-6 text-lg leading-8 text-red-100/60">
              SignalCraft sits between your monitoring tools and your team. We filter the noise so you can focus on the fix.
            </p>
          </motion.div>
        </div>
        
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <motion.dl 
            className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {features.map((feature) => (
              <motion.div 
                key={feature.title} 
                className="flex flex-col bg-zinc-950 p-6 rounded-2xl border border-red-900/10 transition-colors shadow-none group"
                variants={cardVariants}
                whileHover={{ 
                  scale: 1.02, 
                  borderColor: 'rgba(220,38,38,0.4)',
                  boxShadow: '0 0 30px rgba(220,38,38,0.15)'
                }}
              >
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-red-500 group-hover:text-red-400 transition-colors">
                  {feature.title}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-400 group-hover:text-gray-300 transition-colors">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </motion.div>
            ))}
          </motion.dl>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 lg:px-8 py-24 sm:py-32 border-t border-red-900/10">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base font-semibold leading-7 text-red-600">Pricing</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Simple, transparent pricing
          </p>
          <p className="mt-6 text-lg leading-8 text-red-100/60">
            Choose the plan that fits your team's needs. All plans include unlimited monitoring integrations.
          </p>
        </div>
        
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <motion.div 
            className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
             {/* Starter */}
             <motion.div variants={cardVariants} className="flex flex-col justify-between rounded-3xl bg-zinc-950 p-8 ring-1 ring-zinc-800 xl:p-10 hover:ring-red-900/50 transition-all">
                <div>
                   <h3 className="text-lg font-semibold leading-8 text-white">Starter</h3>
                   <p className="mt-4 text-sm leading-6 text-gray-400">Perfect for side projects and small teams.</p>
                   <p className="mt-6 flex items-baseline gap-x-1">
                      <span className="text-4xl font-bold tracking-tight text-white">$0</span>
                      <span className="text-sm font-semibold leading-6 text-gray-400">/month</span>
                   </p>
                   <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-300">
                      {['5 Users', '1,000 Alerts/mo', 'Email & Slack Integrations', '30-day Retention', 'Community Support'].map((feature) => (
                         <li key={feature} className="flex gap-x-3">
                            <span className="text-red-500">✓</span> {feature}
                         </li>
                      ))}
                   </ul>
                </div>
                <Button asChild className="mt-8 bg-zinc-800 text-white hover:bg-zinc-700 w-full">
                   <Link href="/signup">Get Started</Link>
                </Button>
             </motion.div>

             {/* Pro */}
             <motion.div variants={cardVariants} className="flex flex-col justify-between rounded-3xl bg-zinc-950 p-8 ring-1 ring-red-600 xl:p-10 relative shadow-[0_0_40px_rgba(220,38,38,0.15)]">
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                   <span className="inline-flex items-center rounded-full bg-red-600/10 px-3 py-1 text-xs font-semibold text-red-500 ring-1 ring-inset ring-red-600/20 backdrop-blur-sm">Most Popular</span>
                </div>
                <div>
                   <h3 className="text-lg font-semibold leading-8 text-white">Pro</h3>
                   <p className="mt-4 text-sm leading-6 text-gray-400">For growing teams that need power and flexibility.</p>
                   <p className="mt-6 flex items-baseline gap-x-1">
                      <span className="text-4xl font-bold tracking-tight text-white">$49</span>
                      <span className="text-sm font-semibold leading-6 text-gray-400">/month</span>
                   </p>
                   <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-300">
                      {['Unlimited Users', '100,000 Alerts/mo', 'Advanced Routing Rules', 'SSO via Google', 'Priority Support', '90-day Retention'].map((feature) => (
                         <li key={feature} className="flex gap-x-3">
                            <span className="text-red-500">✓</span> {feature}
                         </li>
                      ))}
                   </ul>
                </div>
                <Button asChild className="mt-8 bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/20 w-full">
                   <Link href="/signup">Start Free Trial</Link>
                </Button>
             </motion.div>

             {/* Enterprise */}
             <motion.div variants={cardVariants} className="flex flex-col justify-between rounded-3xl bg-zinc-950 p-8 ring-1 ring-zinc-800 xl:p-10 hover:ring-red-900/50 transition-all">
                <div>
                   <h3 className="text-lg font-semibold leading-8 text-white">Enterprise</h3>
                   <p className="mt-4 text-sm leading-6 text-gray-400">Custom solutions for large organizations.</p>
                   <p className="mt-6 flex items-baseline gap-x-1">
                      <span className="text-4xl font-bold tracking-tight text-white">Custom</span>
                   </p>
                   <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-300">
                      {['Unlimited Everything', 'Custom Retention', 'SAML SSO (Okta, etc.)', 'Dedicated Success Manager', 'SLA Guarantees', 'On-premise Deployment'].map((feature) => (
                         <li key={feature} className="flex gap-x-3">
                            <span className="text-red-500">✓</span> {feature}
                         </li>
                      ))}
                   </ul>
                </div>
                <Button asChild variant="outline" className="mt-8 border-zinc-700 text-white hover:bg-zinc-800 w-full hover:text-white">
                   <Link href="mailto:sales@signalcraft.app">Contact Sales</Link>
                </Button>
             </motion.div>

          </motion.div>
        </div>
      </section>
    </main>
  );
}
