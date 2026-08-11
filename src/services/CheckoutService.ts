import { PRO_PRICE_ID } from '@/constants/pricing';
import { supabase } from '@/lib/supabase';

export async function startCheckout(): Promise<void> {
  if (PRO_PRICE_ID === 'REPLACE_ME') {
    throw new Error('Stripe Price ID is not configured yet.');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in before upgrading.');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      price_id: PRO_PRICE_ID,
      mode: 'subscription',
      success_url: `${window.location.origin}/upgrade/success`,
      cancel_url: window.location.href,
    }),
  });

  const result = await response.json() as { url?: string; error?: string };
  if (!response.ok || result.error || !result.url) {
    throw new Error(result.error ?? 'Unable to start checkout.');
  }
  window.location.href = result.url;
}
