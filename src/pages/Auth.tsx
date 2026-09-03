import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Chrome as Home, Mail, Lock } from 'lucide-react';
import BillvieLogo from '@/components/BillvieLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { checkPendingInvite } from '@/services/InviteService';

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
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [joinOffer, setJoinOffer] = useState<{ token: string; householdName: string } | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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
        const pending = await checkPendingInvite(email.trim());
        if (pending) {
          setJoinOffer(pending);
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) {
          if (signUpError.message.toLowerCase().includes('already')) {
            setError('An account with this email already exists. Try signing in instead.');
            setMode('signin');
          } else {
            setError(signUpError.message);
          }
          return;
        }

        if (!signUpData.session) {
          setAwaitingConfirmation(true);
          return;
        }

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

  const handleJoinInstead = async () => {
    if (!joinOffer) return;
    setSubmitting(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!signUpData.session) {
        sessionStorage.setItem('pending_invite_token', joinOffer.token);
        setAwaitingConfirmation(true);
        return;
      }

      const { error: rpcError } = await supabase.rpc('accept_household_invite', {
        p_token: joinOffer.token,
      });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      navigate('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      if (error.message.toLowerCase().includes('already')) {
        toast({ description: 'An account with this email already exists. Sign in with your password, or reset it below.', variant: 'destructive' });
      } else {
        toast({ description: error.message, variant: 'destructive' });
      }
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      setError('Please enter your email.');
      return;
    }
    setResetSending(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setResetSent(true);
    } finally {
      setResetSending(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
    setJoinOffer(null);
    setShowReset(false);
    setResetSent(false);
  };

  if (awaitingConfirmation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <BillvieLogo size="lg" />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">Check your email</h1>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              We've sent a confirmation link to {email.trim()}. Click it to finish
              setting up your account.
            </p>
            <Button variant="outline" onClick={() => { setAwaitingConfirmation(false); setMode('signin'); }}>
              I've confirmed — sign in
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <BillvieLogo size="lg" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode + (joinOffer ? '-join' : '') + (showReset ? '-reset' : '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {joinOffer ? (
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Home className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold">You have a pending invite</h1>
                <p className="text-muted-foreground text-sm">
                  Someone has already invited {email.trim()} to join {joinOffer.householdName}.
                  Would you like to join that household instead of creating a new one?
                </p>
              </div>
            ) : showReset ? (
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Lock className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold">Reset your password</h1>
                <p className="text-muted-foreground text-sm">
                  Enter your email and we'll send you a link to choose a new password.
                </p>
              </div>
            ) : (
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
            )}

            {showReset ? (
              resetSent ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-4"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Mail className="w-7 h-7 text-primary" />
                  </div>
                  <h1 className="text-2xl font-semibold">Check your email</h1>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    We've sent a reset link to {resetEmail.trim()}. Click it to choose a new password.
                  </p>
                  <Button variant="outline" onClick={() => { setShowReset(false); setResetSent(false); setMode('signin'); }}>
                    Back to sign in
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="h-12"
                      autoComplete="email"
                      onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                    />
                  </div>

                  {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

                  <Button
                    onClick={handleResetPassword}
                    disabled={resetSending}
                    className="btn-hero w-full text-base h-12"
                  >
                    {resetSending ? 'Please wait...' : 'Send reset link'}
                    {!resetSending && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>

                  <button
                    onClick={() => { setShowReset(false); setError(null); }}
                    className="block w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
                  >
                    Back to sign in
                  </button>
                </div>
              )
            ) : (
              <>
                {!joinOffer && (
                  <>
                    <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)}>
                      <TabsList className="w-full">
                        <TabsTrigger value="signin" className="flex-1">Sign in</TabsTrigger>
                        <TabsTrigger value="signup" className="flex-1">Sign up</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="space-y-4">
                      <Button
                        variant="outline"
                        onClick={handleGoogleSignIn}
                        className="w-full h-12 text-base font-medium"
                      >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                        </svg>
                        Continue with Google
                      </Button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">or use email</span>
                        </div>
                      </div>
                    </div>

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
                  </>
                )}

                <div className="space-y-4">
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
                      disabled={!!joinOffer}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === 'signin' && !joinOffer && (
                        <button
                          type="button"
                          onClick={() => { setShowReset(true); setError(null); setResetEmail(email); }}
                          className="text-sm text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
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

                  {joinOffer ? (
                    <div className="space-y-3">
                      <Button
                        onClick={handleJoinInstead}
                        disabled={submitting || !password.trim()}
                        className="btn-hero w-full text-base h-12"
                      >
                        {submitting ? 'Please wait...' : 'Join that household'}
                        {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
                      </Button>
                      <button
                        onClick={() => setJoinOffer(null)}
                        className="block w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        No thanks, create my own household
                      </button>
                    </div>
                  ) : (
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
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
