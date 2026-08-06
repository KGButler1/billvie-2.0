import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Client with the caller's JWT — for RLS-scoped queries
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Admin client — for inviteUserByEmail
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify the caller's session
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, name, role, keyPersonId } = await req.json();
    if (!email || !email.trim()) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the caller's household
    const { data: callerPerson, error: callerError } = await userClient
      .from("trusted_person")
      .select("household_id, access_level, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (callerError || !callerPerson) {
      return new Response(
        JSON.stringify({ error: "Could not find your household" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const householdId = callerPerson.household_id;

    // Server-side entitlement check: free-tier "one trusted person" limit
    const pRole = role || "household";
    if (pRole === "household") {
      const { data: settings } = await userClient
        .from("user_settings")
        .select("user_type")
        .eq("user_id", user.id)
        .maybeSingle();

      const isPaid = settings?.user_type === "paid" || settings?.user_type === "accountant";
      if (!isPaid) {
        const { count, error: countError } = await userClient
          .from("trusted_person")
          .select("id", { count: "exact", head: true })
          .eq("household_id", householdId)
          .eq("role", "household")
          .in("status", ["invited", "active"]);

        if (countError) {
          return new Response(
            JSON.stringify({ error: "Could not check entitlements" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Count includes the owner, so free tier allows 1 non-owner household member
        // owner has access_level='owner', so count - 1 = invited/active non-owner
        // Actually the count includes owner (status=active, role=household). Free tier
        // allows 1 trusted person total (non-owner). So if count >= 2 (owner + 1), block.
        if ((count || 0) >= 2) {
          return new Response(
            JSON.stringify({
              error: "Free includes one trusted person. Add anyone else with Pro.",
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Generate invite token
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let inviteToken = "";
    for (let i = 0; i < 16; i++) {
      inviteToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const displayName = (name || "").trim() || email.trim().split("@")[0];

    // Insert the trusted_person row
    const { data: personRow, error: insertError } = await userClient
      .from("trusted_person")
      .insert({
        household_id: householdId,
        name: displayName,
        display_name: displayName,
        email: email.trim(),
        role: pRole,
        status: "invited",
        invite_token: inviteToken,
        key_person_id: keyPersonId || null,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send the invite email via Supabase's built-in invite system
    const appUrl = Deno.env.get("APP_URL") || `${supabaseUrl.replace(".supabase.co", "")}`;
    const redirectUrl = `${appUrl}/accept-invite?token=${inviteToken}`;

    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email.trim(),
      { redirectTo: redirectUrl }
    );

    if (inviteError) {
      // The trusted_person row was created, but the email failed.
      // We still return success since the row exists — the owner can "Send again".
      return new Response(
        JSON.stringify({
          person: personRow,
          warning: "Person added but invite email could not be sent. Try 'Send again' later.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ person: personRow }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
