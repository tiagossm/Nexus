import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    const { action, campaign_id, booking_id, booking_details } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch Campaign to get Google Calendar ID
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("google_calendar_id, status") // User ID link is implicit via user_email_accounts logic below
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    if (!campaign.google_calendar_id) {
      return new Response(
        JSON.stringify({ message: "No Google Calendar linked to this campaign" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch Owner's Tokens (Assuming single user or primary account)
    // In a multi-user app, we'd need to link campaign -> user explicitly.
    // Here we'll take the most recently updated active 'gmail' account.
    const { data: accounts, error: accountError } = await supabase
      .from("user_email_accounts")
      .select("*")
      .eq("provider", "gmail")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (accountError || !accounts || accounts.length === 0) {
      throw new Error("No connected Google account found");
    }

    let account = accounts[0];

    // 3. Refresh Token if needed
    const now = new Date();
    const expiresAt = new Date(account.token_expires_at);
    
    // Refresh if expired or expiring in next 5 mins
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      console.log("Refreshing token...");
      if (!account.refresh_token) {
        throw new Error("Token expired and no refresh token available");
      }

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
          refresh_token: account.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error("Failed to refresh Google token");
      }

      const newTokens = await tokenResponse.json();
      
      // Update DB
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + newTokens.expires_in);
      
      const { error: updateError } = await supabase
        .from("user_email_accounts")
        .update({
          access_token: newTokens.access_token,
          token_expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", account.id);

      if (updateError) console.error("Failed to update tokens in DB", updateError);
      
      account.access_token = newTokens.access_token;
    }



    // 4. Perform Action
    const calendarId = campaign.google_calendar_id;
    const GOOGLE_API = "https://www.googleapis.com";

    if (action === "create_event") {
      const event = {
        summary: `${booking_details.client_name} - ${campaign.title || 'Consulta'}`,
        description: `Cliente: ${booking_details.client_name}\nEmail: ${booking_details.client_email}\nTel: ${booking_details.client_phone || 'N/A'}\n\nAgendado via Nexus Agenda.`,
        start: { dateTime: booking_details.start_time },
        end: { dateTime: booking_details.end_time },
        attendees: [
            { email: booking_details.client_email, displayName: booking_details.client_name }
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      const resp = await fetch(`${GOOGLE_API}/calendar/v3/calendars/${calendarId}/events`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(`Google API Error: ${JSON.stringify(err)}`);
      }

      const googleEvent = await resp.json();

      // 5. Send Confirmation Email via Gmail API
      let emailSent = false;
      try {
           const subject = `Confirmação de Agendamento: ${campaign.title}`;
           const htmlBody = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4f46e5;">Agendamento Confirmado! ✅</h2>
                    <p>Olá <strong>${booking_details.client_name}</strong>,</p>
                    <p>Seu agendamento para <strong>${campaign.title}</strong> foi confirmado com sucesso.</p>
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>📅 Data:</strong> ${new Date(booking_details.start_time).toLocaleDateString('pt-BR')}</p>
                        <p style="margin: 5px 0;"><strong>⏰ Horário:</strong> ${new Date(booking_details.start_time).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                    <p>Um convite foi enviado para sua agenda Google.</p>
                    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Este é um email automático.</p>
                </div>
           `;
           
           const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
           const messageParts = [
             `From: "Nexus Agenda" <${account.email}>`,
             `To: ${booking_details.client_email}`,
             `Subject: ${utf8Subject}`,
             `MIME-Version: 1.0`,
             `Content-Type: text/html; charset=utf-8`,
             ``,
             htmlBody
           ];
           const message = messageParts.join('\n');
           // Base64Url Encode
           const encodedMessage = btoa(unescape(encodeURIComponent(message)))
             .replace(/\+/g, '-')
             .replace(/\//g, '_')
             .replace(/=+$/, '');
             
           const emailResp = await fetch(`${GOOGLE_API}/gmail/v1/users/me/messages/send`, {
             method: 'POST',
             headers: {
               Authorization: `Bearer ${account.access_token}`,
               'Content-Type': 'application/json',
             },
             body: JSON.stringify({ raw: encodedMessage })
           });
           
           if (emailResp.ok) {
               console.log("Email sent via Gmail API");
               emailSent = true;
           } else {
               const err = await emailResp.json();
               console.error("Gmail API Error:", err);
           }
      } catch (emailErr) {
          console.error("Error sending email:", emailErr);
      }

      // Update booking with Google Event ID
      await supabase
        .from("campaign_bookings")
        .update({
          google_event_id: googleEvent.id,
          google_synced_at: new Date().toISOString()
        })
        .eq("id", booking_id);

      return new Response(
        JSON.stringify({ success: true, google_event_id: googleEvent.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "delete_event") {
       // ... Implementation for delete if needed
       return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
