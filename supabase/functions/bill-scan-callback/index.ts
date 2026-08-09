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

    // Rename the source document to match the extracted bill name, and link
    // the document to the bill so DocumentCard picks it up automatically.
    // Only do this when extraction succeeded (no error branch above) and a
    // name was actually extracted — don't rename off a failed guess.
    if (name) {
      const { data: bill } = await adminClient
        .from("bills")
        .select("source_document_id")
        .eq("id", billId)
        .maybeSingle();

      if (bill?.source_document_id) {
        await adminClient
          .from("documents")
          .update({ title: name, updated_at: new Date().toISOString() })
          .eq("id", bill.source_document_id);

        // Create the document -> bill link (same shape as the manual flow).
        // Unlink any existing bill link for this document first.
        const { data: existingLinks } = await adminClient
          .from("document_links")
          .select("id")
          .eq("document_id", bill.source_document_id)
          .eq("link_type", "bill")
          .is("unlinked_at", null);

        if (existingLinks && existingLinks.length > 0) {
          await adminClient
            .from("document_links")
            .update({ unlinked_at: new Date().toISOString() })
            .in("id", existingLinks.map((l: { id: string }) => l.id));
        }

        const { data: billRow } = await adminClient
          .from("bills")
          .select("household_id")
          .eq("id", billId)
          .maybeSingle();

        if (billRow?.household_id) {
          await adminClient
            .from("document_links")
            .insert({
              household_id: billRow.household_id,
              document_id: bill.source_document_id,
              source_type: "document",
              link_type: "bill",
              target_id: billId,
            });
        }
      }
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
