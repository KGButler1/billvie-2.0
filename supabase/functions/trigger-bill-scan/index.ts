import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SCAN_LIMITS: Record<string, number> = {
  free: 5,
  paid: Infinity,
  anonymous: 5,
  accountant: Infinity,
};

function firstOfMonth(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: callerPerson, error: callerError } = await userClient
      .from("trusted_person")
      .select("household_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (callerError || !callerPerson) {
      return new Response(
        JSON.stringify({ error: "Could not find your household" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const householdId = callerPerson.household_id;

    const { data: settings } = await userClient
      .from("user_settings")
      .select("user_type")
      .eq("user_id", user.id)
      .maybeSingle();

    const tier = settings?.user_type || "free";
    const limit = SCAN_LIMITS[tier] ?? SCAN_LIMITS.free;

    const { documentId, documentUrl, documentType, name } = await req.json();
    if (!documentId || !documentUrl) {
      return new Response(
        JSON.stringify({ error: "documentId and documentUrl are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const currentMonthStart = firstOfMonth(new Date());

    // --- Quota check + increment (atomic) ---
    if (limit !== Infinity) {
      const { data: usage } = await adminClient
        .from("household_scan_usage")
        .select("period_start, scan_count")
        .eq("household_id", householdId)
        .maybeSingle();

      let currentCount: number;
      if (!usage) {
        await adminClient
          .from("household_scan_usage")
          .insert({ household_id: householdId, period_start: currentMonthStart, scan_count: 0 });
        currentCount = 0;
      } else if (usage.period_start !== currentMonthStart) {
        await adminClient
          .from("household_scan_usage")
          .update({ period_start: currentMonthStart, scan_count: 0, updated_at: new Date().toISOString() })
          .eq("household_id", householdId);
        currentCount = 0;
      } else {
        currentCount = usage.scan_count;
      }

      if (currentCount >= limit) {
        return new Response(
          JSON.stringify({ error: "quota_exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: incrementError } = await adminClient
        .from("household_scan_usage")
        .update({ scan_count: currentCount + 1, updated_at: new Date().toISOString() })
        .eq("household_id", householdId);

      if (incrementError) {
        return new Response(
          JSON.stringify({ error: "Could not update scan quota" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // --- Create the bill row ---
    const { data: billRow, error: billError } = await adminClient
      .from("bills")
      .insert({
        household_id: householdId,
        name: name || "Scanned bill",
        status: "pending",
        extraction_status: "processing",
        processing_started_at: new Date().toISOString(),
        source_document_id: documentId,
      })
      .select("id")
      .single();

    if (billError || !billRow) {
      return new Response(
        JSON.stringify({ error: "Could not create bill row" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const billId = billRow.id;

    // --- POST to N8N webhook (fire and forget) ---
    const webhookUrl = Deno.env.get("N8N_BILL_SCAN_WEBHOOK_URL");
    const sharedSecret = Deno.env.get("N8N_BILL_SCAN_SHARED_SECRET");

    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sharedSecret ? { "X-Scan-Secret": sharedSecret } : {}),
          },
          body: JSON.stringify({
            billId,
            householdId,
            documentUrl,
            documentType,
            tier,
          }),
        });
      } catch {
        // N8N is not set up yet — the watchdog will eventually flip this to failed.
      }
    }

    return new Response(
      JSON.stringify({ billId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
