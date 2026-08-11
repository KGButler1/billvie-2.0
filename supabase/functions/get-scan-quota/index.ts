import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function firstOfMonth(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: callerPerson, error: callerError } = await userClient
      .from("trusted_person")
      .select("household_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (callerError || !callerPerson) {
      return new Response(JSON.stringify({ error: "Could not find your household" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const householdId = callerPerson.household_id;
    const { data: household } = await adminClient
      .from("households")
      .select("plan_status")
      .eq("id", householdId)
      .maybeSingle();
    const isPaid = household?.plan_status === "active" || household?.plan_status === "trialing";
    const limit = isPaid ? Infinity : 5;
    const currentMonthStart = firstOfMonth(new Date());

    const { data: usage } = await adminClient
      .from("household_scan_usage")
      .select("period_start, scan_count")
      .eq("household_id", householdId)
      .maybeSingle();

    let used: number;
    if (!usage) {
      await adminClient.from("household_scan_usage").insert({ household_id: householdId, period_start: currentMonthStart, scan_count: 0 });
      used = 0;
    } else if (usage.period_start !== currentMonthStart) {
      await adminClient.from("household_scan_usage").update({ period_start: currentMonthStart, scan_count: 0, updated_at: new Date().toISOString() }).eq("household_id", householdId);
      used = 0;
    } else {
      used = usage.scan_count;
    }

    const remaining = limit === Infinity ? null : Math.max(0, limit - used);
    return new Response(JSON.stringify({ used, limit: limit === Infinity ? null : limit, remaining }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
