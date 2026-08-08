import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';
import BillvieLogo from '@/components/BillvieLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      setError('This reset link isn\'t valid — ask for a new one.');
    }
  }, [loading, session]);

  const handleReset = async () => {
    if (!session) return;
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setDone(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
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
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">This reset link isn't valid</h1>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              This link may have expired or already been used. Go back to sign in
              and request a new reset link.
            </p>
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Go to sign in
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h1 className="text-2xl font-semibold">Password updated</h1>
            <p className="text-muted-foreground text-sm">
              Taking you to your dashboard...
            </p>
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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">Choose a new password</h1>
            <p className="text-muted-foreground text-sm">
              Enter a new password for your account.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
                autoComplete="new-password"
                onKeyDown={(e) => e.key === 'Enter' && handleReset()}
              />
            </div>

            {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

            <Button
              onClick={handleReset}
              disabled={submitting || !password.trim()}
              className="btn-hero w-full text-base h-12"
            >
              {submitting ? 'Please wait...' : 'Update password'}
              {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
