import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, LogOut } from 'lucide-react';
import BillvieLogo from '@/components/BillvieLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { clearHouseholdCache, setCurrentHousehold } from '@/services/supabaseData';
import { roleLabel } from '@/hooks/useHouseholds';

interface InviteInfo {
  householdName: string;
  role: string;
  accessLevel: string | null;
}

const AcceptInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { session, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteLoading, setInviteLoading] = useState(true);

  useEffect(() => {
    if (loading || !token) return;
    let active = true;
    (async () => {
      const { data, error: queryError } = await supabase
        .from('trusted_person')
        .select('role, access_level, households(name)')
        .eq('invite_token', token)
        .eq('status', 'invited')
        .maybeSingle();
      if (active) {
        if (queryError || !data) {
          setInviteInfo(null);
        } else {
          const household = Array.isArray(data.households) ? data.households[0] : data.households;
          setInviteInfo({
            householdName: (household as { name: string })?.name || 'a household',
            role: (data.role as string) || 'household',
            accessLevel: (data.access_level as string) || null,
          });
        }
        setInviteLoading(false);
      }
    })();
    return () => { active = false; };
  }, [loading, token]);

  const handleAcceptExistingUser = async () => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('accept_household_invite', {
        p_token: token,
      });
      if (rpcError) {
        const msg = rpcError.message || '';
        if (msg.startsWith('WRONG_ACCOUNT:')) {
          setError('This invite was sent to a different email than the one you\'re signed in with. Sign out and try the link again.');
        } else {
          setError('Something went wrong accepting this invite — try again, or ask them to send it again.');
        }
        return;
      }
      clearHouseholdCache();
      setAccepted(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptNewUser = async () => {
    if (!token || !session) return;
    setError(null);
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      if (password) {
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) {
          setError(pwError.message);
          return;
        }
      }
      const { error: rpcError } = await supabase.rpc('accept_household_invite', {
        p_token: token,
      });
      if (rpcError) {
        const msg = rpcError.message || '';
        if (msg.startsWith('WRONG_ACCOUNT:')) {
          setError('This invite was sent to a different email than the one you\'re signed in with. Sign out and try the link again.');
        } else {
          setError('Something went wrong accepting this invite — try again, or ask them to send it again.');
        }
        return;
      }
      clearHouseholdCache();
      setAccepted(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignInToAccept = () => {
    if (!token) return;
    sessionStorage.setItem('pending_invite_token', token);
    navigate('/auth');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading || inviteLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!token) {
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
            <h1 className="text-2xl font-semibold">This invite link isn't valid</h1>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              This link may have expired or already been used. Ask the person who
              invited you to send it again.
            </p>
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Go to sign in
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h1 className="text-2xl font-semibold">You're in</h1>
            <p className="text-muted-foreground text-sm">
              Taking you to your household dashboard...
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Existing session — skip password, accept directly
  if (session) {
    const roleText = inviteInfo ? roleLabel(inviteInfo.accessLevel, inviteInfo.role) : 'a member';
    const householdName = inviteInfo?.householdName ?? 'a household';
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
                <ArrowRight className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold">You've been invited</h1>
              <p className="text-muted-foreground text-sm">
                You've been invited to join {householdName} as a {roleText}.
              </p>
            </div>

            <div className="space-y-4">
              {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

              <Button
                onClick={handleAcceptExistingUser}
                disabled={submitting}
                className="btn-hero w-full text-base h-12"
              >
                {submitting ? 'Please wait...' : 'Accept & continue'}
                {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>

              <button
                onClick={handleSignOut}
                className="block w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                Not you? Sign out
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // No session — new user sets password, or existing user signs in
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
              <ArrowRight className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold">Welcome to Billvie</h1>
            <p className="text-muted-foreground text-sm">
              You've been invited to join a household. Set a password to get started.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Choose a password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
                autoComplete="new-password"
                onKeyDown={(e) => e.key === 'Enter' && handleAcceptNewUser()}
              />
            </div>

            {error && <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>}

            <Button
              onClick={handleAcceptNewUser}
              disabled={submitting || !password.trim()}
              className="btn-hero w-full text-base h-12"
            >
              {submitting ? 'Please wait...' : 'Accept & continue'}
              {!submitting && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>

            <button
              onClick={handleSignInToAccept}
              className="block w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              Already have a Billvie account? Sign in to accept
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AcceptInvite;
