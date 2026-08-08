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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify shared secret
    const sharedSecret = Deno.env.get("N8N_BILL_SCAN_SHARED_SECRET");
    const secretHeader = req.headers.get("X-Scan-Secret");

    if (!sharedSecret || secretHeader !== sharedSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { billId, name, amount, dueDate, category, isRecurring, recurringInterval, confidence, error } = body;

    if (!billId) {
      return new Response(
        JSON.stringify({ error: "billId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (error) {
      const { error: updateError } = await adminClient
        .from("bills")
        .update({
          extraction_status: "failed",
          extraction_error: error,
          processing_started_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", billId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ ok: true, status: "failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const updates: Record<string, unknown> = {
      extraction_status: "needs_review",
      processing_started_at: null,
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (amount !== undefined) updates.amount = amount;
    if (dueDate !== undefined) updates.due_date = dueDate;
    if (category !== undefined) updates.category = category;
    if (isRecurring !== undefined) updates.is_recurring = isRecurring;
    if (recurringInterval !== undefined) updates.recurring_interval = recurringInterval;
    if (confidence !== undefined) updates.extraction_confidence = confidence;

    const { error: updateError } = await adminClient
      .from("bills")
      .update(updates)
      .eq("id", billId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, status: "needs_review" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
