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

    const { email, name, role, keyPersonId, accessLevel, scopes } = await req.json();
    if (!email || !email.trim()) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate accessLevel — 'owner' is never allowed via invite
    const pAccessLevel = accessLevel || "trusted_person";
    if (pAccessLevel === "owner") {
      return new Response(
        JSON.stringify({ error: "There is exactly one owner per household, set at creation. Use co_owner instead." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (pAccessLevel !== "trusted_person" && pAccessLevel !== "co_owner") {
      return new Response(
        JSON.stringify({ error: `Invalid access level: ${pAccessLevel}` }),
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

    // Authorization: only owners and co-owners can invite
    if (callerPerson.access_level !== "owner" && callerPerson.access_level !== "co_owner") {
      return new Response(
        JSON.stringify({ error: "Only an owner or co-owner can invite someone" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const householdId = callerPerson.household_id;

    const pRole = role || "household";
    const displayName = (name || "").trim() || email.trim().split("@")[0];
    // accessLevel only applies to household members; advisors/accountants are always trusted_person
    const effectiveAccessLevel = pRole === "household" ? pAccessLevel : "trusted_person";

    // Shared helper: build redirect URL (strips trailing slashes) and send the invite email.
    const sendInviteEmail = async (inviteEmail: string, token: string) => {
      const appUrl = (Deno.env.get("APP_URL") || `${supabaseUrl.replace(".supabase.co", "")}`).replace(/\/+$/, "");
      const redirectUrl = `${appUrl}/accept-invite?token=${token}`;
      return adminClient.auth.admin.inviteUserByEmail(inviteEmail, { redirectTo: redirectUrl });
    };

    // Duplicate-invite guard: check for an existing trusted_person row
    // matching this household + email (case-insensitive) that is still
    // invited or active, so "Send again" doesn't create duplicate rows.
    // This runs BEFORE the entitlement check — resending to an existing
    // person should never hit the free-tier limit.
    // Authorization was already checked above — this path is reachable by admins only.
    const { data: existingRow } = await userClient
      .from("trusted_person")
      .select("id, invite_token, status, name")
      .eq("household_id", householdId)
      .ilike("email", email.trim())
      .in("status", ["invited", "active"])
      .maybeSingle();

    if (existingRow) {
      if (existingRow.status === "active") {
        return new Response(
          JSON.stringify({
            error: `${existingRow.name} is already an active member of your household.`,
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // status === 'invited': reuse the existing row instead of inserting a new one
      const { error: updateError } = await userClient
        .from("trusted_person")
        .update({ invited_at: new Date().toISOString() })
        .eq("id", existingRow.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Re-fetch the full row so the response shape matches a fresh insert
      const { data: reusedRow, error: refetchError } = await userClient
        .from("trusted_person")
        .select("*")
        .eq("id", existingRow.id)
        .single();

      if (refetchError) {
        return new Response(
          JSON.stringify({ error: refetchError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Re-send the invite email using the existing token
      const { error: inviteError } = await sendInviteEmail(email.trim(), existingRow.invite_token);

      if (inviteError) {
        // If the account already exists (they clicked the original link once but
        // never finished setting a password), inviteUserByEmail fails. Fall back
        // to a magic link so they get a working sign-in path back to /accept-invite.
        const isAccountExists =
          (inviteError as { code?: string }).code === "email_exists" ||
          /already been registered/i.test(inviteError.message || "");

        if (isAccountExists) {
          const plainClient = createClient(supabaseUrl, anonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const appUrl = (Deno.env.get("APP_URL") || `${supabaseUrl.replace(".supabase.co", "")}`).replace(/\/+$/, "");
          const redirectUrl = `${appUrl}/accept-invite?token=${existingRow.invite_token}`;
          const { error: otpError } = await plainClient.auth.signInWithOtp({
            email: email.trim(),
            options: { emailRedirectTo: redirectUrl },
          });

          if (!otpError) {
            return new Response(
              JSON.stringify({ person: reusedRow }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        return new Response(
          JSON.stringify({
            person: reusedRow,
            warning: "Person added but invite email could not be sent. Try 'Send again' later.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ person: reusedRow }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No existing row found — this is a brand-new invite.
    // Run the entitlement check here, only for new household members.
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

    // Insert the trusted_person row
    const { data: personRow, error: insertError } = await userClient
      .from("trusted_person")
      .insert({
        household_id: householdId,
        name: displayName,
        display_name: displayName,
        email: email.trim(),
        role: pRole,
        access_level: effectiveAccessLevel,
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

    // Insert initial access_grants for trusted_person (not co_owner — they get full default access)
    let grantsWarning: string | undefined;
    if (effectiveAccessLevel !== "co_owner" && Array.isArray(scopes) && scopes.length > 0) {
      const grantRows = scopes.map((scope: string) => ({
        household_id: householdId,
        person_id: personRow.id,
        scope,
        item_id: null,
      }));
      const { error: grantsError } = await adminClient
        .from("access_grants")
        .insert(grantRows);
      if (grantsError) {
        grantsWarning = "Person added but initial access scopes could not be set. You can add them from the People page.";
      }
    }

    // Send the invite email via Supabase's built-in invite system
    const { error: inviteError } = await sendInviteEmail(email.trim(), inviteToken);

    if (inviteError) {
      // The trusted_person row was created, but the email failed.
      // We still return success since the row exists — the owner can "Send again".
      const warning = grantsWarning || "Person added but invite email could not be sent. Try 'Send again' later.";
      return new Response(
        JSON.stringify({ person: personRow, warning }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: Record<string, unknown> = { person: personRow };
    if (grantsWarning) body.warning = grantsWarning;
    return new Response(
      JSON.stringify(body),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
