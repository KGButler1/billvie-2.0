import { motion } from 'framer-motion';
import { ArrowRight, Zap, Bell, Users, Calendar, Receipt, Check, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Zap,
      title: 'Quick Capture',
      description: 'Add a bill or commitment in seconds. Name it, save it, done.',
    },
    {
      icon: Bell,
      title: 'Nothing Falls Through',
      description: 'Get alerted before anything is missed — even if you\'re not around.',
    },
    {
      icon: Users,
      title: 'Shared Visibility',
      description: 'Make sure you\'re not the only one who knows what\'s due.',
    },
    {
      icon: Calendar,
      title: 'Life\'s Big Moments',
      description: 'Budget for weddings, moves, and milestones together.',
    },
    {
      icon: Receipt,
      title: 'Always Organised',
      description: 'Export tidy records whenever you need them.',
    },
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting your household organised',
      features: [
        'Up to 25 bills',
        'Up to 3 events',
        'Basic reminders',
        'Mobile access',
      ],
      cta: 'Get Started',
      featured: false,
    },
    {
      name: 'Pro',
      price: '$5',
      period: '/month',
      description: 'For families who want full peace of mind',
      features: [
        'Unlimited bills',
        'Unlimited events',
        'Smart reminders',
        'Shared household visibility',
        'Tax export',
        'Priority support',
      ],
      cta: 'Go Pro',
      featured: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">Billvie</span>
          </div>
          <Button 
            onClick={() => navigate('/onboarding')}
            className="btn-hero text-sm py-2 px-4"
          >
            Set Up Your Household
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="section-hero pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance max-w-4xl mx-auto leading-tight">
              Everything your household runs on — in one place, ready for anyone to step in
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              The private control centre that gives your family clarity, continuity, and peace of mind — so you're never the only one who knows.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/onboarding')}
                className="btn-hero text-lg"
              >
                Set Up Your Household
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline"
                className="btn-hero-outline text-lg"
              >
                See How It Works
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Free to start. No financial credentials stored.
            </p>
          </motion.div>
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
              Everything you need, nothing you don't
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Simple, powerful features designed for real life.
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

      {/* Pricing Section */}
      <section className="py-20 px-4">
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
              Start free, upgrade when you need more.
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
                  onClick={() => navigate('/dashboard')}
                  className={plan.featured ? 'btn-hero w-full' : 'btn-hero-outline w-full'}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Receipt className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold">Billvie</span>
            </div>
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
