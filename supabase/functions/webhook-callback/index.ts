import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    // Parse webhook payload
    const payload = await req.json();
    const {
      type, // 'delivery', 'read', 'failed'
      campaign_id,
      recipient_id,
      channel, // 'whatsapp' or 'sms'
      status,
      timestamp,
      provider_message_id,
      error
    } = payload;

    // Validate required fields
    if (!type || !campaign_id || !recipient_id || !channel) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Optional: Verify webhook signature
    const signature = req.headers.get("x-webhook-signature");
    if (signature) {
      // Get webhook config to verify signature
      const { data: config } = await supabase
        .from("webhook_configs")
        .select("secret_key")
        .eq("channel", channel)
        .single();

      if (config?.secret_key) {
        const expectedSignature = await generateHmacSignature(
          JSON.stringify(payload),
          config.secret_key
        );
        
        if (signature !== expectedSignature) {
          console.warn("⚠️ Invalid webhook signature");
          return new Response(
            JSON.stringify({ error: "Invalid signature" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Map callback type to event type
    let event_type;
    switch (type) {
      case "delivery":
      case "delivered":
        event_type = "delivered";
        break;
      case "read":
        event_type = "read";
        break;
      case "failed":
      case "error":
        event_type = "failed";
        break;
      case "bounced":
        event_type = "bounced";
        break;
      default:
        console.warn(`Unknown callback type: ${type}`);
        event_type = type;
    }

    // Record the event
    const { error: insertError } = await supabase.from("message_events").insert({
      campaign_id,
      recipient_id,
      event_type,
      channel,
      metadata: {
        provider_message_id,
        status,
        timestamp: timestamp || new Date().toISOString(),
        error: error || null,
        raw_payload: payload
      }
    });

    if (insertError) {
      console.error("Error recording webhook event:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to record event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Webhook processed: ${event_type} for ${channel} (${recipient_id})`);

    return new Response(
      JSON.stringify({ success: true, event_type }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook-callback error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to generate HMAC signature
async function generateHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
