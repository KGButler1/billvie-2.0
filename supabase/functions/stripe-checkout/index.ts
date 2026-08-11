import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { appInfo: { name: 'Billvie', version: '1.0.0' } });
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function corsResponse(body: string | object | null, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? corsHeaders : { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return corsResponse(null, 200);
    if (req.method !== 'POST') return corsResponse({ error: 'Method not allowed' }, 405);

    const { price_id, success_url, cancel_url, mode } = await req.json();
    const error = validateParameters({ price_id, success_url, cancel_url, mode }, {
      cancel_url: 'string', price_id: 'string', success_url: 'string', mode: { values: ['payment', 'subscription'] },
    });
    if (error) return corsResponse({ error }, 400);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return corsResponse({ error: 'Missing authorization header' }, 401);
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) return corsResponse({ error: 'Not authenticated' }, 401);

    const { data: person, error: personError } = await supabase
      .from('trusted_person')
      .select('household_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    if (personError || !person?.household_id) return corsResponse({ error: 'Could not find your household' }, 403);
    const householdId = person.household_id;

    const { data: customer, error: customerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .maybeSingle();
    if (customerError) return corsResponse({ error: 'Failed to fetch customer information' }, 500);

    let customerId = customer?.customer_id;
    if (!customerId) {
      const newCustomer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id, householdId } });
      const { error: createError } = await supabase.from('stripe_customers').insert({ household_id: householdId, user_id: user.id, customer_id: newCustomer.id });
      if (createError) {
        await stripe.customers.del(newCustomer.id).catch((cleanupError) => console.error('Failed to clean up Stripe customer:', cleanupError));
        return corsResponse({ error: 'Failed to create customer mapping' }, 500);
      }
      customerId = newCustomer.id;
    }

    if (mode === 'subscription') {
      const { data: subscription, error: subscriptionError } = await supabase
        .from('stripe_subscriptions')
        .select('status')
        .eq('customer_id', customerId)
        .maybeSingle();
      if (subscriptionError) return corsResponse({ error: 'Failed to fetch subscription information' }, 500);
      if (!subscription) {
        const { error: insertError } = await supabase.from('stripe_subscriptions').insert({ customer_id: customerId, status: 'not_started' });
        if (insertError) return corsResponse({ error: 'Failed to create subscription record' }, 500);
      }
    }

    const session = await stripe.checkout.sessions.create({ customer: customerId, payment_method_types: ['card'], line_items: [{ price: price_id, quantity: 1 }], mode, success_url, cancel_url });
    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout failed';
    console.error(`Checkout error: ${message}`);
    return corsResponse({ error: message }, 500);
  }
});

type ExpectedType = 'string' | { values: string[] };
type Expectations<T> = { [K in keyof T]: ExpectedType };
function validateParameters<T extends Record<string, unknown>>(values: T, expected: Expectations<T>): string | undefined {
  for (const parameter in values) {
    const expectation = expected[parameter];
    const value = values[parameter];
    if (expectation === 'string') {
      if (typeof value !== 'string' || value.length === 0) return `Expected parameter ${parameter} to be a string`;
    } else if (!expectation.values.includes(String(value))) {
      return `Expected parameter ${parameter} to be one of ${expectation.values.join(', ')}`;
    }
  }
  return undefined;
}
