import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const users = [
  { email: "vanderson.gabriel@selfit.com.br", name: "Vanderson Gabriel" },
  { email: "guilherme.santos@selfit.com.br", name: "Guilherme Santos" },
  { email: "marcelo.duarte@selfit.com.br", name: "Marcelo Duarte" },
  { email: "yvson.jose@selfit.com.br", name: "Yvson José" },
  { email: "matheus.feliciano@selfit.com.br", name: "Matheus Feliciano" },
  { email: "nilton.carneiro@selfit.com.br", name: "Nilton Carneiro" },
];

const PASSWORD = "selfit2026";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: { email: string; status: string }[] = [];

    for (const user of users) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { name: user.name, role: "admin" },
      });

      if (error) {
        if (error.message.includes("already been registered") || error.message.includes("already registered")) {
          results.push({ email: user.email, status: "already exists" });
        } else {
          results.push({ email: user.email, status: `error: ${error.message}` });
        }
      } else {
        results.push({ email: user.email, status: "created" });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
