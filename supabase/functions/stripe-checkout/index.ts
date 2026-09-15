import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { price_id, success_url, cancel_url, mode, householdId: requestedHouseholdId } = body;

    let personQuery = supabase
      .from("trusted_person")
      .select("household_id")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (requestedHouseholdId) {
      personQuery = personQuery.eq("household_id", requestedHouseholdId);
    }

    const { data: personRows, error: personError } = await personQuery;

    if (personError || !personRows || personRows.length === 0) {
      return new Response(JSON.stringify({ error: "No household found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const person = personRows[0];

    if (!price_id || !success_url || !cancel_url) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: household } = await supabase
      .from("households")
      .select("stripe_customer_id")
      .eq("id", person.household_id)
      .maybeSingle();

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY")!;
    const params: Record<string, string> = {
      mode: mode || "subscription",
      "line_items[0][price]": price_id,
      "line_items[0][quantity]": "1",
      success_url,
      cancel_url,
      "metadata[household_id]": person.household_id,
      "subscription_data[metadata][household_id]": person.household_id,
      "client_reference_id": person.household_id,
    };

    if (household?.stripe_customer_id) {
      params.customer = household.stripe_customer_id;
    }

    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params),
    });

    if (!sessionRes.ok) {
      const errText = await sessionRes.text();
      return new Response(JSON.stringify({ error: "Stripe error", details: errText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await sessionRes.json();
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
