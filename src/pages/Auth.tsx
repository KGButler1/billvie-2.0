import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Chrome as Home } from 'lucide-react';
import BillvieLogo from '@/components/BillvieLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'signup';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await signUp(email.trim(), password);
        if (signUpError) {
          if (signUpError.toLowerCase().includes('already')) {
            setError('An account with this email already exists. Try signing in instead.');
            setMode('signin');
          } else {
            setError(signUpError);
          }
          return;
        }

        // Create the household + owner row + seed sample data
        const { error: rpcError } = await supabase.rpc('create_household_with_owner', {
          p_name: householdName.trim() || null,
          p_user_email: email.trim(),
        });
        if (rpcError) {
          setError('Your account was created but we could not set up your household. Please try again.');
          return;
        }

        navigate('/onboarding');
      } else {
        const { error: signInError } = await signIn(email.trim(), password);
        if (signInError) {
          setError(signInError);
          return;
        }
        navigate('/dashboard');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <BillvieLogo size="lg" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Home className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground">
                {mode === 'signup' ? 'Create your household' : 'Welcome back'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {mode === 'signup'
                  ? 'Start with a clean slate — we will add a few sample bills to get you going.'
                  : 'Sign in to manage your household.'}
              </p>
            </div>

            <div className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="household-name">
                    Household name <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="household-name"
                    placeholder="e.g., The Smith Family"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    className="h-12"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
              </div>

              {error && (
                <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-hero w-full text-base h-12"
              >
                {submitting
                  ? 'Please wait...'
                  : mode === 'signup'
                    ? 'Create household'
                    : 'Sign in'}
                {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>

            <div className="text-center">
              <button
                onClick={switchMode}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {mode === 'signup'
                  ? 'Already have an account? Sign in'
                  : "Don\u2019t have an account? Create one"}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
