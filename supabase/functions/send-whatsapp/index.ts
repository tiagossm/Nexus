import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const { campaign_id, recipient_id, phone, message, variables } = await req.json();

    // Validate input
    if (!campaign_id || !recipient_id || !phone || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get WhatsApp webhook configuration
    const { data: webhookConfig, error: configError } = await supabase
      .from("webhook_configs")
      .select("*")
      .eq("channel", "whatsapp")
      .eq("active", true)
      .single();

    if (configError || !webhookConfig) {
      console.error("WhatsApp webhook not configured:", configError);
      return new Response(
        JSON.stringify({ error: "WhatsApp webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare webhook payload
    const webhookPayload = {
      campaign_id,
      recipient_id,
      phone,
      message,
      variables: variables || {},
      callback_url: `${supabaseUrl}/functions/v1/webhook-callback`,
      timestamp: new Date().toISOString()
    };

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...webhookConfig.headers
    };

    // Add HMAC signature if secret exists
    if (webhookConfig.secret_key) {
      const signature = await generateHmacSignature(
        JSON.stringify(webhookPayload),
        webhookConfig.secret_key
      );
      headers["X-Webhook-Signature"] = signature;
    }

    // Call n8n webhook
    console.log(`📤 Sending WhatsApp to ${phone}...`);
    
    const webhookResponse = await fetch(webhookConfig.webhook_url, {
      method: "POST",
      headers,
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`Webhook failed: ${webhookResponse.status} ${errorText}`);
      
      // Record failed event
      await supabase.from("message_events").insert({
        campaign_id,
        recipient_id,
        event_type: "failed",
        channel: "whatsapp",
        metadata: {
          error: errorText,
          webhook_status: webhookResponse.status
        }
      });

      return new Response(
        JSON.stringify({ error: "WhatsApp delivery failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await webhookResponse.json();
    console.log("✅ WhatsApp sent:", result);

    // Record sent event
    await supabase.from("message_events").insert({
      campaign_id,
      recipient_id,
      event_type: "sent",
      channel: "whatsapp",
      metadata: {
        message_id: result.message_id || result.id,
        phone,
        provider_response: result
      }
    });

    return new Response(
      JSON.stringify({ success: true, message_id: result.message_id || result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Send-whatsapp error:", error);
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
