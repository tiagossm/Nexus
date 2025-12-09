import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// UTILITY FUNCTIONS FOR EMAIL ENCODING
// =====================================================

// RFC 2047 encoding for email headers with non-ASCII characters
function encodeRFC2047(str: string): string {
  // Check if string contains non-ASCII characters
  if (/^[\x20-\x7E]*$/.test(str)) {
    return str; // Pure ASCII, no encoding needed
  }
  
  // Encode as UTF-8 Base64 per RFC 2047
  const base64 = base64Encode(str);
  return `=?UTF-8?B?${base64}?=`;
}

// Base64 encode with UTF-8 support
function base64Encode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  utf8Bytes.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary);
}

// Base64url encode for Gmail API (RFC 4648)
function base64UrlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  utf8Bytes.forEach(byte => binary += String.fromCharCode(byte));
  
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// =====================================================
// GMAIL TOKEN REFRESH
// =====================================================

async function refreshGmailToken(refreshToken: string, clientId: string, clientSecret: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token refresh failed:", errorText);
    throw new Error("Failed to refresh token");
  }

  return await response.json();
}

// =====================================================
// GMAIL SEND FUNCTION
// =====================================================

async function sendViaGmail(
  accessToken: string, 
  to: string, 
  subject: string, 
  html: string, 
  from: string
) {
  // RFC 2047 encode subject for UTF-8 characters (ç, ã, é, etc.)
  const encodedSubject = encodeRFC2047(subject);
  
  // Base64 encode the HTML body for proper UTF-8 handling
  const encodedBody = base64Encode(html);
  
  // Create email in RFC 2822 format with proper encoding
  const email = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    encodedBody
  ].join("\r\n");

  // Base64url encode the entire email for Gmail API
  const rawMessage = base64UrlEncode(email);

  console.log(`📧 Sending email via Gmail:`);
  console.log(`   From: ${from}`);
  console.log(`   To: ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Encoded Subject: ${encodedSubject}`);

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: rawMessage }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("❌ Gmail API error:", {
      status: response.status,
      statusText: response.statusText,
      error: error,
    });
    throw new Error(`Gmail API error (${response.status}): ${error}`);
  }

  const result = await response.json();
  console.log(`✅ Email sent successfully! Message ID: ${result.id}`);
  return result;
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, html, text } = await req.json();

    console.log("📬 Email request received:", { to, subject: subject?.substring(0, 50) });

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get authenticated user from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Create client with user's token to get user info
    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    
    if (userError || !user) {
      console.error("Error getting user:", userError);
      return new Response(
        JSON.stringify({ error: "User not authenticated", details: userError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    console.log(`👤 User authenticated: ${user.id}`);

    // Try to get user's Gmail account
    const { data: accounts, error: accountError } = await supabase
      .from("user_email_accounts")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "gmail")
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .limit(1);

    if (accountError) {
      console.error("Error fetching email account:", accountError);
      return new Response(
        JSON.stringify({ error: "Database error fetching email account", details: accountError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // If Gmail account exists, try to send via Gmail
    if (accounts && accounts.length > 0) {
      const account = accounts[0];
      console.log(`✅ Gmail account found: ${account.email}`);
      
      const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

      if (!googleClientId || !googleClientSecret) {
        return new Response(
          JSON.stringify({ error: "Google OAuth credentials not configured on server" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      try {
        let accessToken = account.access_token;
        const now = new Date();
        const expiresAt = new Date(account.token_expires_at);

        // Refresh token if expired (with 5-minute buffer)
        if (!accessToken || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
          console.log("🔄 Refreshing Gmail token...");
          const tokens = await refreshGmailToken(
            account.refresh_token,
            googleClientId,
            googleClientSecret
          );

          accessToken = tokens.access_token;
          const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

          // Update token in database
          await supabase
            .from("user_email_accounts")
            .update({
              access_token: accessToken,
              token_expires_at: newExpiresAt.toISOString(),
              last_used_at: new Date().toISOString(),
            })
            .eq("id", account.id);
          
          console.log("✅ Token refreshed successfully");
        }

        // Send via Gmail
        const result = await sendViaGmail(
          accessToken,
          to,
          subject,
          html,
          account.email
        );

        return new Response(
          JSON.stringify({
            success: true,
            provider: "gmail",
            from: account.email,
            messageId: result.id,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      } catch (gmailError) {
        console.error("❌ Gmail sending failed:", gmailError);
        return new Response(
          JSON.stringify({ error: "Gmail sending failed", details: gmailError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 422 }
        );
      }
    } else {
      console.log(`⚠️ No Gmail account found for user ${user.id}`);
      return new Response(
        JSON.stringify({ error: "No connected Gmail account found. Please connect your Gmail account in Settings." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
