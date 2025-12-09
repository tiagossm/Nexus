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
    const url = new URL(req.url);
    const campaignId = url.searchParams.get("cid");
    const recipientId = url.searchParams.get("rid");

    if (!campaignId || !recipientId) {
      console.error("Missing required parameters: cid or rid");
      return new Response("Invalid request", { status: 400 });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract metadata from request
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Record open event
    const { error: eventError } = await supabase
      .from("message_events")
      .insert({
        campaign_id: campaignId,
        recipient_id: recipientId,
        event_type: "opened",
        channel: "email",
        metadata: {
          ip_address: ipAddress,
          user_agent: userAgent,
          timestamp: new Date().toISOString()
        }
      });

    if (eventError) {
      console.error("Error recording open event:", eventError);
    } else {
      console.log(`✅ Open tracked: ${recipientId}`);
    }

    // Return 1x1 transparent GIF
    const transparentGif = Uint8Array.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
      0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
      0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
      0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
      0x01, 0x00, 0x3b
    ]);

    return new Response(transparentGif, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma": "no-cache"
      },
      status: 200
    });

  } catch (error) {
    console.error("Track-open error:", error);
    
    // Still return the GIF even if tracking fails
    const transparentGif = Uint8Array.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
      0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
      0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
      0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
      0x01, 0x00, 0x3b
    ]);

    return new Response(transparentGif, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/gif"
      },
      status: 200
    });
  }
});
