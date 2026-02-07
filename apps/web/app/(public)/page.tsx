'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion, useSpring, useInView, useMotionValue, useTransform } from 'framer-motion';
import { useRef, useEffect, type ComponentType } from 'react';
import {
  Bell,
  Zap,
  CheckCircle,
  TrendingUp,
  Filter,
  Users,
  ArrowRight,
  Check,
  Star,
  Quote,
  Sparkles,
} from 'lucide-react';

const features = [
  {
    icon: Bell,
    title: 'Unified Alert Inbox',
    description:
      'Centralize alerts from Sentry, Datadog, and 20+ monitoring tools into one intelligent dashboard.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Filter,
    title: 'Intelligent Deduplication',
    description:
      'AI-powered grouping reduces alert noise by 60-90%, showing you incidents instead of spam.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Users,
    title: 'Smart Routing',
    description:
      'Route the right alerts to the right teams automatically with flexible rules and escalation paths.',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: Zap,
    title: 'Instant Notifications',
    description:
      'Send actionable alerts to Slack, email, or SMS with interactive buttons for quick resolution.',
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    icon: TrendingUp,
    title: 'Analytics & Insights',
    description:
      'Track MTTA, alert volume, and team performance to continuously improve incident response.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: CheckCircle,
    title: 'Delivery Guarantee',
    description:
      'Never miss a critical alert with delivery health monitoring and automatic failover.',
    gradient: 'from-indigo-500 to-blue-500',
  },
];

const howItWorksSteps = [
  {
    number: '01',
    title: 'Connect',
    description: 'Link your monitoring tools (Sentry, Datadog, etc.) with one-click integrations',
    icon: '🔗',
    gradient: 'from-blue-600 to-cyan-600',
  },
  {
    number: '02',
    title: 'Filter',
    description: 'AI automatically groups similar alerts and surfaces what matters most',
    icon: '🎯',
    gradient: 'from-purple-600 to-pink-600',
  },
  {
    number: '03',
    title: 'Act',
    description: 'Get alerts in Slack with context and resolve incidents faster',
    icon: '⚡',
    gradient: 'from-orange-600 to-red-600',
  },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '$0',
    period: '/month',
    description: 'Perfect for side projects and small teams',
    features: [
      '5 team members',
      '1,000 alerts/month',
      'Email & Slack integrations',
      '30-day data retention',
      'Community support',
    ],
    cta: 'Get Started Free',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For growing teams that ship fast',
    features: [
      'Unlimited team members',
      '100,000 alerts/month',
      'All integrations',
      '90-day data retention',
      'Priority support',
      'Advanced routing rules',
      'SSO (Google)',
    ],
    cta: 'Start Free Trial',
    href: '/signup',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For organizations requiring scale',
    features: [
      'Unlimited everything',
      'Custom data retention',
      'SAML SSO (Okta, etc.)',
      'Dedicated success manager',
      'SLA guarantees',
      'On-premise deployment',
    ],
    cta: 'Contact Sales',
    href: 'mailto:sales@nirvana.app',
    highlighted: false,
  },
];

const testimonials = [
  {
    quote:
      'Nirvana reduced our alert noise by 85%. We went from drowning in notifications to actually sleeping at night.',
    author: 'Sarah Chen',
    role: 'Engineering Manager',
    company: 'TechCorp',
    rating: 5,
    avatar: 'SC',
  },
  {
    quote: 'The AI-powered grouping is incredible. We catch critical issues 3x faster than before.',
    author: 'Marcus Rodriguez',
    role: 'DevOps Lead',
    company: 'DataFlow Inc',
    rating: 5,
    avatar: 'MR',
  },
  {
    quote:
      'Setup took 5 minutes. Within a day, we saw measurable improvements in our incident response time.',
    author: 'Emily Watson',
    role: 'SRE Director',
    company: 'CloudScale',
    rating: 5,
    avatar: 'EW',
  },
];

const stats = [
  { value: '90%', label: 'Noise Reduction', icon: Filter },
  { value: '3x', label: 'Faster Response', icon: Zap },
  { value: '500+', label: 'Teams Trust Us', icon: Users },
  { value: '99.9%', label: 'Uptime SLA', icon: CheckCircle },
];

// Real integration logos using CDN URLs
const integrations = [
  { name: 'Sentry', logo: 'https://cdn.simpleicons.org/sentry/362D59' },
  { name: 'Datadog', logo: 'https://cdn.simpleicons.org/datadog/632CA6' },
  { name: 'PagerDuty', logo: 'https://cdn.simpleicons.org/pagerduty/06AC38' },
  { name: 'Slack', logo: 'https://cdn.simpleicons.org/slack/4A154B' },
  { name: 'New Relic', logo: 'https://cdn.simpleicons.org/newrelic/008C99' },
  { name: 'Grafana', logo: 'https://cdn.simpleicons.org/grafana/F46800' },
  { name: 'Prometheus', logo: 'https://cdn.simpleicons.org/prometheus/E6522C' },
  { name: 'Splunk', logo: 'https://cdn.simpleicons.org/splunk/000000' },
];

const faqs = [
  {
    question: 'How long does setup take?',
    answer:
      'Most teams are up and running in under 5 minutes. Just connect your monitoring tools and configure your first routing rule.',
  },
  {
    question: 'Do you support on-premise deployment?',
    answer:
      'Yes! Enterprise plans include on-premise deployment options with full support and customization.',
  },
  {
    question: 'Can I try before committing?',
    answer:
      'Absolutely. We offer a 14-day free trial with no credit card required. Cancel anytime.',
  },
  {
    question: 'What integrations do you support?',
    answer:
      'We support 20+ monitoring tools including Sentry, Datadog, New Relic, Grafana, and more. Custom integrations available on Enterprise plans.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

// Reusable Animated Number Component
function AnimatedNumber({ value, className }: { value: string; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  const isNumeric = /[0-9]/.test(value);

  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 50, damping: 20, restDelta: 0.001 });

  // Extract parts: Prefix + Number + Suffix
  let prefix = '';
  let numericValue = 0;
  let suffix = '';
  let isFloat = false;

  if (isNumeric) {
    const match = value.match(/^([^0-9.]*)([0-9.]+)([^0-9.]*)$/);
    if (match) {
      prefix = match[1];
      numericValue = parseFloat(match[2]);
      suffix = match[3];
      isFloat = match[2].includes('.');
    }
  }

  useEffect(() => {
    if (isInView && isNumeric) {
      motionValue.set(numericValue);
    }
  }, [isInView, numericValue, motionValue, isNumeric]);

  const displayValue = useTransform(springValue, (latest) => {
    if (!isNumeric) return value;

    let formattedNumber;
    if (isFloat) {
      formattedNumber = latest.toFixed(1);
    } else {
      formattedNumber = Math.round(latest).toString();
    }

    return `${prefix}${formattedNumber}${suffix}`;
  });

  if (!isNumeric) {
    return <span className={className}>{value}</span>;
  }

  return (
    <motion.span ref={ref} className={className}>
      {displayValue}
    </motion.span>
  );
}

// Animated Stat Component
type StatIcon = ComponentType<{ className?: string }>;

function AnimatedStat({
  value,
  label,
  icon: Icon,
  delay,
}: {
  value: string;
  label: string;
  icon: StatIcon;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: delay, duration: 0.5 }}
      className="text-center group"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white mb-4 shadow-md border border-stone-100 group-hover:scale-110 transition-transform">
        <Icon className="w-8 h-8 text-emerald-600" />
      </div>
      <div className="text-5xl font-black text-stone-900 mb-3 block">
        <AnimatedNumber value={value} />
      </div>
      <div className="text-sm text-stone-500 font-bold uppercase tracking-wide">{label}</div>
    </motion.div>
  );
}

// Trusted by companies
const trustedCompanies = [
  { name: 'Stripe', logo: 'https://cdn.simpleicons.org/stripe/635BFF' },
  { name: 'Shopify', logo: 'https://cdn.simpleicons.org/shopify/96BF48' },
  { name: 'Notion', logo: 'https://cdn.simpleicons.org/notion/000000' },
  { name: 'Vercel', logo: 'https://cdn.simpleicons.org/vercel/000000' },
  { name: 'Linear', logo: 'https://cdn.simpleicons.org/linear/5E6AD2' },
  { name: 'GitHub', logo: 'https://cdn.simpleicons.org/github/000000' },
];

export default function HomePage() {
  return (
    <main className="relative bg-[#FBF8F2] text-stone-900 overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_circle_at_18%_-12%,_#ffffff_0%,_#fbf8f2_52%,_#f2ede4_100%)] opacity-80" />
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="relative overflow-hidden min-h-[85vh] flex items-center justify-center pt-20 pb-20 bg-[#FEFCF9]">
          {/* Warm organic layered gradients for a human-crafted feel */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFF9F5] via-[#FEFCF9] to-[#F8F6F3]" />
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-50/40 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/3 w-[500px] h-[500px] bg-rose-50/30 rounded-full blur-3xl" />
          <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-sky-50/20 rounded-full blur-3xl" />

          <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10 w-full text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white border border-stone-200 text-stone-600 text-sm font-semibold mb-10 shadow-sm hover:shadow-md transition-shadow cursor-default">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Stick around — explore Signal in action</span>
              </div>

              <h1 className="text-7xl font-black tracking-tight text-stone-900 sm:text-8xl lg:text-9xl mb-10 leading-[0.9]">
                Find Your Calm.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-600">
                  In the Chaos.
                </span>
              </h1>

              <p className="mt-8 text-xl md:text-2xl leading-relaxed text-stone-600 max-w-2xl mx-auto font-medium">
                The intelligent platform that turns alert chaos into engineering clarity. Stop
                firefighting and start building.
              </p>

              <div className="mt-12 flex items-center justify-center gap-6 flex-wrap">
                <Button
                  asChild
                  size="lg"
                  className="h-14 px-10 text-lg bg-stone-900 hover:bg-stone-800 text-white shadow-xl shadow-stone-900/10 rounded-full transition-all hover:scale-105 border border-stone-900"
                >
                  <Link href="/signup">Start Free Trial</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-14 px-10 text-lg border-2 border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300 rounded-full transition-all"
                >
                  <Link href="#how-it-works">How It Works</Link>
                </Button>
              </div>

              <div className="mt-10 flex items-center justify-center gap-8 text-sm font-medium text-stone-400">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" /> 14-day free trial
                </span>
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" /> No credit card
                </span>
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" /> 5-min setup
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Brand Animation Showcase */}
        <section className="py-20 bg-[#FBF8F2]">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-sm font-bold text-emerald-600 mb-4 uppercase tracking-widest">
                EXPERIENCE NIRVANA
              </h2>
              <p className="text-3xl md:text-4xl font-black text-stone-900">
                See Our Vision in{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                  Motion
                </span>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-2xl overflow-hidden shadow-lg border border-stone-200"
            >
              <video autoPlay loop muted playsInline className="w-full h-auto">
                <source src="/brand-animation.mp4" type="video/mp4" />
              </video>
            </motion.div>
          </div>
        </section>

        {/* Stats Section with Icons */}
        <section className="py-20 bg-[#FDFCF8] border-b border-stone-100">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
              {stats.map((stat, index) => (
                <AnimatedStat
                  key={stat.label}
                  value={stat.value}
                  label={stat.label}
                  icon={stat.icon}
                  delay={index * 0.1}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Integrations Section with Infinite Scroll */}
        <section className="py-20 bg-[#FBF8F2] overflow-hidden border-b border-stone-100">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center mb-12">
            <p className="text-sm font-bold text-stone-500 mb-4 uppercase tracking-widest">
              INTEGRATES WITH YOUR FAVORITE TOOLS
            </p>
            <h3 className="text-3xl font-bold text-stone-900">Connect Everything. Instantly.</h3>
          </div>

          {/* Infinite scrolling marquee */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#FBF8F2] to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#FBF8F2] to-transparent z-10" />

            <div
              className="flex animate-scroll"
              style={{
                animation: 'scroll 30s linear infinite',
              }}
            >
              {/* Double the integrations for seamless loop */}
              {[...integrations, ...integrations, ...integrations].map((integration, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 mx-6 flex items-center gap-4 px-8 py-5 bg-white rounded-2xl border-2 border-stone-200 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="w-10 h-10 relative group-hover:scale-110 transition-transform">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={integration.logo}
                      alt={integration.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-stone-700 font-bold text-lg whitespace-nowrap">
                    {integration.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <style jsx>{`
            @keyframes scroll {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(-33.333%);
              }
            }
            .animate-scroll {
              display: flex;
              width: max-content;
            }
          `}</style>
        </section>

        {/* How It Works Section with Enhanced Design */}
        <section id="how-it-works" className="py-32 bg-[#FDFCF8] relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-sm font-bold text-emerald-600 mb-4 uppercase tracking-widest">
                HOW IT WORKS
              </h2>
              <p className="text-5xl md:text-6xl font-black text-stone-900 mb-6">
                From Noise to Resolution
                <br />
                in <span className="text-stone-500">3 Simple Steps</span>
              </p>
              <p className="mt-6 text-xl text-stone-600 max-w-3xl mx-auto font-medium">
                Nirvana sits between your monitoring tools and your team, filtering the chaos so you
                can focus on what matters.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-10 lg:gap-16 relative">
              {/* Animated connection line */}
              <div className="hidden md:block absolute top-20 left-0 right-0 h-0.5 bg-stone-200 -translate-y-1/2 opacity-50" />

              {howItWorksSteps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2, duration: 0.6 }}
                  className="relative"
                >
                  <div
                    className={`absolute -top-6 left-10 w-16 h-16 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-stone-900 font-black text-2xl shadow-lg z-20`}
                  >
                    {index + 1}
                  </div>

                  <div className="bg-white rounded-3xl p-10 border border-stone-200 shadow-xl shadow-stone-900/5 hover:shadow-2xl hover:shadow-stone-900/10 transition-all duration-300 hover:-translate-y-2 h-full relative z-10">
                    <div className="text-6xl mb-6 mt-8 text-stone-800">{step.icon}</div>
                    <h3 className="text-3xl font-bold text-stone-900 mb-4">{step.title}</h3>
                    <p className="text-stone-600 leading-relaxed text-lg">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid with Gradient Cards */}
        <section id="features" className="pt-32 pb-10 bg-[#FBF8F2]">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-sm font-bold text-purple-600 mb-4 uppercase tracking-widest">
                FEATURES
              </h2>
              <p className="text-5xl md:text-6xl font-black text-slate-900">
                Everything You Need to
                <br />
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Master Incidents
                </span>
              </p>
              <p className="mt-6 text-xl text-slate-600 max-w-3xl mx-auto font-medium">
                Built for teams who want to ship fast without sacrificing reliability.
              </p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    variants={itemVariants}
                    whileHover={{ y: -8, transition: { duration: 0.3 } }}
                    className="relative group"
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300`}
                    />
                    <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-8 border-2 border-slate-200 shadow-lg group-hover:shadow-2xl transition-all duration-300 h-full">
                      <div
                        className={`w-16 h-16 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}
                      >
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                      <p className="text-slate-600 leading-relaxed text-lg">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="pt-0 pb-10 bg-[#FBF8F2] border-b border-stone-100">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <p className="text-center text-sm font-bold text-stone-500 mb-8 uppercase tracking-widest">
              Trusted by industry leaders
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-40 hover:opacity-100 transition-opacity grayscale">
              {trustedCompanies.map((company) => (
                <div
                  key={company.name}
                  className="relative h-10 w-32 transition-all duration-300 hover:scale-110 grayscale hover:grayscale-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={company.logo}
                    alt={company.name}
                    className="w-full h-full object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials with Enhanced Cards */}
        <section className="pt-10 pb-10 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-sm font-bold text-orange-600 mb-4 uppercase tracking-widest">
                TESTIMONIALS
              </h2>
              <p className="text-5xl md:text-6xl font-black text-stone-900">
                Loved by{' '}
                <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Teams Worldwide
                </span>
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15, duration: 0.6 }}
                  className="group"
                >
                  <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 h-full flex flex-col">
                    <div className="flex gap-1 mb-6">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <Quote className="w-10 h-10 text-blue-300 mb-6" />
                    <p className="text-stone-700 mb-8 italic text-lg leading-relaxed flex-grow">
                      &ldquo;{testimonial.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 text-lg">{testimonial.author}</p>
                        <p className="text-sm text-stone-600">
                          {testimonial.role} at {testimonial.company}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section with Enhanced Design */}
        <section id="pricing" className="pt-10 pb-10 bg-[#FBF8F2]">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-sm font-bold text-blue-600 mb-4 uppercase tracking-widest">
                PRICING
              </h2>
              <p className="text-5xl md:text-6xl font-black text-stone-900">
                Simple,{' '}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Transparent Pricing
                </span>
              </p>
              <p className="mt-6 text-xl text-stone-600 max-w-3xl mx-auto font-medium">
                Choose the plan that fits your team. All plans include unlimited integrations.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {pricingPlans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15, duration: 0.6 }}
                  className={`relative rounded-3xl p-10 ${
                    plan.highlighted
                      ? 'bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 text-white shadow-2xl shadow-blue-500/40 scale-105 border-4 border-white ring-4 ring-blue-200'
                      : 'bg-white border-2 border-stone-200 shadow-xl hover:shadow-2xl'
                  } transition-all duration-300 hover:-translate-y-2`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-5 left-0 right-0 flex justify-center">
                      <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                        ⭐ Most Popular
                      </span>
                    </div>
                  )}
                  <h3
                    className={`text-3xl font-black mb-3 ${plan.highlighted ? 'text-white' : 'text-stone-900'}`}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={`text-base mb-8 ${plan.highlighted ? 'text-blue-100' : 'text-stone-600'}`}
                  >
                    {plan.description}
                  </p>
                  <div className="mb-8">
                    <span
                      className={`text-6xl font-black ${plan.highlighted ? 'text-white' : 'text-stone-900'}`}
                    >
                      <AnimatedNumber value={plan.price} />
                    </span>
                    {plan.period && (
                      <span
                        className={`text-xl ${plan.highlighted ? 'text-blue-100' : 'text-stone-600'}`}
                      >
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-4 mb-10">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check
                          className={`w-6 h-6 mt-0.5 flex-shrink-0 ${plan.highlighted ? 'text-white' : 'text-emerald-600'}`}
                        />
                        <span
                          className={`text-lg ${plan.highlighted ? 'text-blue-50' : 'text-stone-600'}`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    size="lg"
                    className={`w-full text-lg font-bold py-6 rounded-xl ${
                      plan.highlighted
                        ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-xl'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg'
                    } hover:scale-105 transition-transform`}
                  >
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="pt-10 pb-32 bg-[#FDFCF8] border-t border-stone-100">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-sm font-bold text-emerald-600 mb-4 uppercase tracking-widest">
                FAQ
              </h2>
              <p className="text-5xl md:text-6xl font-black text-stone-900">
                Frequently Asked{' '}
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Questions
                </span>
              </p>
            </motion.div>

            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="bg-white rounded-2xl p-8 border-2 border-stone-200 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <h3 className="text-xl font-bold text-stone-900 mb-3">{faq.question}</h3>
                  <p className="text-stone-600 leading-relaxed text-lg">{faq.answer}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section with Enhanced Design */}
        <section className="py-32 bg-gradient-to-br from-blue-600 via-purple-600 to-orange-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

          <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h2 className="text-5xl md:text-7xl font-black text-white mb-8">
                Ready to Silence the Noise?
              </h2>
              <p className="text-2xl text-blue-100 mb-12 max-w-3xl mx-auto font-medium">
                Join hundreds of teams who&apos;ve reduced alert fatigue and improved incident
                response times.
              </p>
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 shadow-2xl px-12 py-7 text-xl font-bold rounded-xl hover:scale-110 transition-transform"
                >
                  <Link href="/signup">
                    Start Free Trial <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-3 border-white text-white hover:bg-white/20 backdrop-blur-sm px-12 py-7 text-xl font-bold rounded-xl hover:scale-110 transition-transform"
                >
                  <Link href="mailto:sales@signalcraft.app">Talk to Sales</Link>
                </Button>
              </div>
              <p className="mt-8 text-base text-blue-100 font-medium">
                ✨ No credit card required • 14-day free trial • Cancel anytime
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </main>
  );
}
