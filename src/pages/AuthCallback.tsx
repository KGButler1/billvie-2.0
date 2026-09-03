import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BillvieLogo from '@/components/BillvieLogo';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { checkPendingInvite } from '@/services/InviteService';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!session?.user?.email) {
      setError("We couldn't complete sign-in. Please try again.");
      return;
    }

    const bootstrap = async () => {
      try {
        const invite = await checkPendingInvite(session.user.email);

        if (invite) {
          const { error: acceptError } = await supabase.rpc('accept_household_invite', {
            p_token: invite.token,
          });
          if (acceptError) throw acceptError;
        } else {
          const { error: createError } = await supabase.rpc('create_household_with_owner', {
            p_name: null,
            p_user_email: session.user.email,
          });
          if (createError) throw createError;
        }

        navigate('/dashboard');
      } catch {
        setError('Signed in, but we could not set up your household. Please try again or contact support.');
      }
    };

    bootstrap();
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-4">
        <div className="flex flex-col items-center mb-8">
          <BillvieLogo size="lg" />
        </div>
        {error ? (
          <>
            <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
            <button
              onClick={() => navigate('/auth')}
              className="text-sm text-primary underline"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Finishing sign-in…</p>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
