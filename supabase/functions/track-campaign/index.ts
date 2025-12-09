import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRANSPARENT_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b
]);

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // 'open' | 'click'
    const campaignId = url.searchParams.get("cid");
    const recipientId = url.searchParams.get("rid");
    const targetUrl = url.searchParams.get("url");

    if (!campaignId || !recipientId) {
      return new Response("Missing parameters", { status: 400 });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Record event
    if (type === "open") {
      await supabase
        .from("campaign_recipients")
        .update({ 
          status: "opened",
          opened_at: new Date().toISOString() 
        })
        .eq("id", recipientId)
        .is("opened_at", null); // Only record first open to avoid overwriting timestamp? Or update last open? 
                                // Usually we want first open. But status update is fine.
                                // Let's just update. If it's already 'clicked' or 'booked', we might not want to revert status to 'opened'.
                                // But for now, let's just record the timestamp if it's null.
      
      // We also want to update status if it's currently 'sent' or 'pending'.
      // A simple update is easiest.
      await supabase.rpc('record_campaign_open', { recipient_id: recipientId });

      return new Response(TRANSPARENT_PIXEL, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "image/gif",
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });

    } else if (type === "click") {
      if (!targetUrl) {
        return new Response("Missing target URL", { status: 400 });
      }

      await supabase
        .from("campaign_recipients")
        .update({ 
          status: "clicked",
          clicked_at: new Date().toISOString() 
        })
        .eq("id", recipientId);

      // Redirect to target URL
      return Response.redirect(targetUrl, 302);
    }

    return new Response("Invalid type", { status: 400 });

  } catch (error) {
    console.error("Tracking error:", error);
    return new Response("Internal Error", { status: 500 });
  }
});
