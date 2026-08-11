import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { appInfo: { name: 'Billvie', version: '1.0.0' } });
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    const signature = req.headers.get('stripe-signature');
    if (!signature) return new Response('No signature found', { status: 400, headers: corsHeaders });
    const body = await req.text();
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid signature';
      console.error(`Webhook signature verification failed: ${message}`);
      return new Response(`Webhook signature verification failed: ${message}`, { status: 400, headers: corsHeaders });
    }
    EdgeRuntime.waitUntil(handleEvent(event));
    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object;
  if (!stripeData || !('customer' in stripeData)) return;
  if (event.type === 'payment_intent.succeeded' && event.data.object.invoice === null) return;
  const customerId = stripeData.customer;
  if (typeof customerId !== 'string') return;

  if (event.type === 'checkout.session.completed') {
    const session = stripeData as Stripe.Checkout.Session;
    if (session.mode !== 'subscription' && session.payment_status === 'paid') {
      await supabase.from('stripe_orders').insert({ checkout_session_id: session.id, payment_intent_id: session.payment_intent, customer_id: customerId, amount_subtotal: session.amount_subtotal, amount_total: session.amount_total, currency: session.currency, payment_status: session.payment_status, status: 'completed' });
      return;
    }
  }
  await syncCustomerFromStripe(customerId);
}

async function updateHouseholdPlan(customerId: string, planStatus: string) {
  const { data: customerRow, error } = await supabase.from('stripe_customers').select('household_id').eq('customer_id', customerId).maybeSingle();
  if (error) throw error;
  if (customerRow?.household_id) {
    const { error: updateError } = await supabase.from('households').update({ plan_status: planStatus }).eq('id', customerRow.household_id);
    if (updateError) throw updateError;
  }
}

async function syncCustomerFromStripe(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 1, status: 'all', expand: ['data.default_payment_method'] });
  if (subscriptions.data.length === 0) {
    const { error } = await supabase.from('stripe_subscriptions').upsert({ customer_id: customerId, status: 'not_started' }, { onConflict: 'customer_id' });
    if (error) throw error;
    await updateHouseholdPlan(customerId, 'not_started');
    return;
  }

  const subscription = subscriptions.data[0];
  const { error } = await supabase.from('stripe_subscriptions').upsert({
    customer_id: customerId,
    subscription_id: subscription.id,
    price_id: subscription.items.data[0].price.id,
    current_period_start: subscription.current_period_start,
    current_period_end: subscription.current_period_end,
    cancel_at_period_end: subscription.cancel_at_period_end,
    ...(subscription.default_payment_method && typeof subscription.default_payment_method !== 'string' ? { payment_method_brand: subscription.default_payment_method.card?.brand ?? null, payment_method_last4: subscription.default_payment_method.card?.last4 ?? null } : {}),
    status: subscription.status,
  }, { onConflict: 'customer_id' });
  if (error) throw error;
  await updateHouseholdPlan(customerId, subscription.status);
}
