import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    // Check for OAuth errors
    if (error) {
      console.error("OAuth error:", error);
      return new Response(
        `<html><body><h1>Erro na autenticação</h1><p>${error}</p><p>Você pode fechar esta janela.</p></body></html>`,
        { headers: { "Content-Type": "text/html" }, status: 400 }
      );
    }

    if (!code) {
      return new Response("Missing authorization code", { status: 400 });
    }

    // Get Google OAuth credentials from environment
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    
    // Construct the redirect URI correctly - must match Google Cloud Console exactly
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const redirectUri = `${supabaseUrl}/functions/v1/gmail-oauth-callback`;

    console.log("Redirect URI being used:", redirectUri);

    if (!clientId || !clientSecret) {
      throw new Error("Missing Google OAuth credentials");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      throw new Error(`Failed to exchange code for tokens. Redirect URI used: ${redirectUri}. Error: ${errorData}`);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokens;

    // Get user's email from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const userInfo = await userInfoResponse.json();
    const { email } = userInfo;

    // Get user_id from state parameter (passed during OAuth initiation)
    const state = url.searchParams.get("state");
    let userId = "default_user"; // Fallback
    
    if (state) {
      try {
        const stateData = JSON.parse(decodeURIComponent(state));
        userId = stateData.user_id || "default_user";
      } catch (e) {
        console.warn("Failed to parse state parameter:", e);
      }
    }

    console.log(`Saving Gmail account for user: ${userId}, email: ${email}`);

    // Save to database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    const { error: dbError } = await supabase
      .from("user_email_accounts")
      .upsert({
        user_id: userId, // ⭐ CORRIGIDO: Usar userId do state
        email,
        provider: "gmail",
        access_token,
        refresh_token,
        token_expires_at: expiresAt.toISOString(),
        scopes: scope.split(" "),
        is_active: true,
        is_primary: true, // ⭐ ADICIONADO
        last_used_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,email",
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw dbError;
    }

    // Return success page
    return new Response(
      `<html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #4CAF50; }
            p { font-size: 18px; color: #666; }
          </style>
        </head>
        <body>
          <h1>✅ Gmail conectado com sucesso!</h1>
          <p>Conta: <strong>${email}</strong></p>
          <p>Você pode fechar esta janela e voltar para o aplicativo.</p>
          <script>
            // Auto-close after 3 seconds
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>`,
      { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
