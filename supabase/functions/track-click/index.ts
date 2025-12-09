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
    const targetUrl = url.searchParams.get("url");

    if (!campaignId || !recipientId || !targetUrl) {
      return new Response("Missing parameters", { status: 400 });
    }

    // Decode the target URL
    const decodedUrl = decodeURIComponent(targetUrl);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract metadata
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";
    const referer = req.headers.get("referer") || "direct";

    // Record click event (async, don't wait)
    supabase
      .from("message_events")
      .insert({
        campaign_id: campaignId,
        recipient_id: recipientId,
        event_type: "clicked",
        channel: "email",
        metadata: {
          url: decodedUrl,
          ip_address: ipAddress,
          user_agent: userAgent,
          referer: referer,
          timestamp: new Date().toISOString()
        }
      })
      .then(({ error }) => {
        if (error) {
          console.error("Error recording click event:", error);
        } else {
          console.log(`✅ Click tracked: ${recipientId} → ${decodedUrl}`);
        }
      });

    // Redirect immediately (don't wait for DB)
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": decodedUrl,
        "Cache-Control": "no-store"
      }
    });

  } catch (error) {
    console.error("Track-click error:", error);
    
    // Fallback: try to redirect anyway
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get("url");
    if (targetUrl) {
      try {
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            "Location": decodeURIComponent(targetUrl)
          }
        });
      } catch {
        return new Response("Invalid URL", { status: 400 });
      }
    }
    
    return new Response("Error processing click", { status: 500 });
  }
});
