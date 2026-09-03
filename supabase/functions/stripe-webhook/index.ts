import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function verifyStripeSignature(rawBody: string, sig: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const parts = sig.split(",").map((p) => p.trim().split("="));
  const t = parts.find((p) => p[0] === "t")?.[1];
  const v1 = parts.find((p) => p[0] === "v1")?.[1];
  if (!t || !v1) return false;
  const signedPayload = `${t}.${rawBody}`;
  const expectedSig = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const expectedHex = Array.from(new Uint8Array(expectedSig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expectedHex === v1;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

    const valid = await verifyStripeSignature(rawBody, sig, webhookSecret);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let householdId: string | null = null;
    let status: string | null = null;
    let customerId: string | null = null;
    let subscriptionId: string | null = null;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      householdId = session?.metadata?.household_id || session?.client_reference_id;
      status = "active";
      customerId = session?.customer || null;
      subscriptionId = session?.subscription || null;
    } else if (event.type.startsWith("customer.subscription.")) {
      const sub = event.data.object;
      householdId = sub?.metadata?.household_id;
      status = sub?.status;
      customerId = sub?.customer || null;
      subscriptionId = sub?.id || null;
    }

    if (!householdId || !status) {
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validStatuses = ["incomplete", "incomplete_expired", "trialing", "active", "past_due", "canceled", "unpaid", "paused"];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: Record<string, string> = { plan_status: status };
    if (customerId) updates.stripe_customer_id = customerId;
    if (subscriptionId) updates.stripe_subscription_id = subscriptionId;

    const { error } = await supabase
      .from("households")
      .update(updates)
      .eq("id", householdId);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
