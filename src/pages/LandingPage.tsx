import { motion } from 'framer-motion';
import { ArrowRight, Zap, Bell, Users, Calendar, Receipt, Check, Shield, Lock, Eye } from 'lucide-react';
import BillvieLogo from '@/components/BillvieLogo';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Zap,
      title: 'Capture What Matters',
      description: 'Bills, commitments, key details — saved in seconds so nothing lives only in your head.',
    },
    {
      icon: Bell,
      title: 'Nothing Gets Missed',
      description: 'Timely alerts mean the right things get handled — even when you\'re not the one doing it.',
    },
    {
      icon: Users,
      title: 'Someone Else Knows',
      description: 'Give the people you trust visibility into what keeps your household running.',
    },
    {
      icon: Calendar,
      title: 'Life\'s Big Moments',
      description: 'Weddings, moves, renovations — plan and budget for milestones together.',
    },
    {
      icon: Receipt,
      title: 'Always Ready',
      description: 'Clean records you can export or share whenever life demands it.',
    },
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Everything you need to get your household in order',
      features: [
        'Up to 25 bills',
        'Up to 3 events',
        'Basic reminders',
        'Mobile access',
        'Share 1 person per category (Bills, Events, Tax Documents) — free',
        'Advisor & accountant sharing — always free',
      ],
      cta: 'Get Started Free',
      featured: false,
    },
    {
      name: 'Pro',
      price: '$60',
      period: '/year',
      description: 'Renews annually — full continuity for the whole family',
      features: [
        'Unlimited bills',
        'Unlimited events',
        'Smart reminders',
        'Unlimited trusted people',
        'Tax export',
        'Advisor & accountant sharing — always free',
        'Priority support',
      ],
      cta: 'Get the Annual Plan',
      featured: true,
    },
  ];

  const trustSignals = [
    { icon: Lock, text: 'No bank logins or financial credentials stored' },
    { icon: Eye, text: 'Only visible to you and people you invite' },
    { icon: Shield, text: 'Your data is private by default' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <BillvieLogo size="md" />
          <Button 
            onClick={() => navigate('/onboarding')}
            className="btn-hero text-sm py-2 px-4"
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section-hero pt-32 pb-16 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance max-w-4xl mx-auto leading-tight">
              Your household shouldn't depend on one person knowing everything
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Billvie gives your family clarity, continuity, and the confidence that someone can always step in.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/onboarding')}
                className="btn-hero text-lg"
              >
                Start With One Thing
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline"
                className="btn-hero-outline text-lg"
              >
                See How It Works
              </Button>
            </div>
            {/* Trust signals */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8">
              {trustSignals.map((signal) => (
                <span key={signal.text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <signal.icon className="w-3.5 h-3.5" />
                  {signal.text}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Emotional Bridge */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto italic"
          >
            "Most households rely on one person knowing everything. Bills, logins, deadlines — all in one head. Billvie makes sure that's never a problem."
          </motion.p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Less mental load, more peace of mind
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Everything that keeps your household running — visible, shared, and handled.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card-elevated"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mid-page CTA */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              It takes two minutes to start
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Add one bill, one contact, or one document — and your household is already better prepared.
            </p>
            <Button
              onClick={() => navigate('/onboarding')}
              className="btn-hero"
            >
              Get Your Household in Order
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              Start free. Upgrade when your household needs more.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={plan.featured ? 'pricing-card-featured' : 'pricing-card'}
              >
                {plan.featured && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg rounded-tr-xl">
                    Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-muted-foreground mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => navigate('/onboarding')}
                  className={plan.featured ? 'btn-hero w-full' : 'btn-hero-outline w-full'}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Your family will thank you
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
              Two minutes now saves someone hours of confusion later.
            </p>
            <Button
              onClick={() => navigate('/onboarding')}
              className="btn-hero text-lg"
            >
              Start With One Thing
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Free to start. No credit card required.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <BillvieLogo size="sm" />
            <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Your data is private by default
              </span>
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="/cookies" className="hover:text-foreground transition-colors">Cookies</a>
              <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a 
                href="https://form.typeform.com/to/ruIhYIAz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Contact
              </a>
            </nav>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Billvie. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
