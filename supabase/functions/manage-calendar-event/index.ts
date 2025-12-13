import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatInTimeZone } from "npm:date-fns-tz";
import { ptBR } from "npm:date-fns/locale";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// UTILITY FUNCTIONS FOR EMAIL ENCODING
// =====================================================

// RFC 2047 encoding for email headers with non-ASCII characters
function encodeRFC2047(str: string): string {
  if (/^[\x20-\x7E]*$/.test(str)) {
    return str;
  }
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
      .select("google_calendar_id, status, title") // Include title for email
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    // 2. Fetch Owner's Tokens (Assuming single user or primary account)
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
    const GOOGLE_API = "https://www.googleapis.com";
    let googleEventId = null;

    if (action === "create_event") {
      // A. Create Calendar Event (Only if calendar_id is present)
      if (campaign.google_calendar_id) {
          try {
            const calendarId = campaign.google_calendar_id;
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
                console.error(`Google Calendar API Error: ${JSON.stringify(err)}`);
                // Don't throw, just log so we proceed to email
            } else {
                const googleEvent = await resp.json();
                googleEventId = googleEvent.id;
            }
          } catch (calError) {
              console.error("Error creating Calendar event:", calError);
          }
      }

      // B. Send Confirmation Email via Gmail API (Always try)
      let emailSent = false;
      try {
           // Get the booking to retrieve access_code
           const { data: bookingData } = await supabase
             .from("campaign_bookings")
             .select("access_code")
             .eq("id", booking_id)
             .single();
           
           const accessCode = bookingData?.access_code || '';
           const appUrl = Deno.env.get("APP_URL") || "https://nexusagenda.vercel.app";
           const manageLink = accessCode ? `${appUrl}/my-bookings/${accessCode}` : null;
           // Format date/time in Brazil timezone using dedicated formatInTimeZone function
           const startDate = new Date(booking_details.start_time);
           const timeZone = 'America/Sao_Paulo';
           
           // Format using pt-BR locale directly with timezone
           const formattedDate = formatInTimeZone(startDate, timeZone, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
           const formattedTime = formatInTimeZone(startDate, timeZone, "HH:mm", { locale: ptBR });
           
           // Capitalize first letter of day
           const finalDateStr = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
           
           const subject = `Confirmação de Agendamento: ${campaign.title}`;
           const htmlBody = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4f46e5;">Agendamento Confirmado! ✅</h2>
                    <p>Olá <strong>${booking_details.client_name}</strong>,</p>
                    <p>Seu agendamento para <strong>${campaign.title}</strong> foi confirmado com sucesso.</p>
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>📅 Data:</strong> ${finalDateStr}</p>
                        <p style="margin: 5px 0;"><strong>⏰ Horário:</strong> ${formattedTime}</p>
                    </div>
                    ${googleEventId ? '<p>Um convite foi enviado para sua agenda Google.</p>' : ''}
                    ${manageLink ? `
                    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #92400e;"><strong>📋 Gerenciar seu agendamento:</strong></p>
                        <p style="margin: 10px 0 0 0;"><a href="${manageLink}" style="color: #4f46e5; font-weight: bold;">Clique aqui para cancelar ou remarcar</a></p>
                    </div>
                    ` : ''}
                    <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Este é um email automático.</p>
                </div>
           `;
           
           // Correctly encode headers and body
           const encodedSubject = encodeRFC2047(subject);
           const encodedBody = base64Encode(htmlBody);

           const emailParts = [
             `From: "Nexus Agenda" <${account.email}>`,
             `To: ${booking_details.client_email}`,
             `Subject: ${encodedSubject}`,
             `MIME-Version: 1.0`,
             `Content-Type: text/html; charset=utf-8`,
             `Content-Transfer-Encoding: base64`,
             ``,
             encodedBody
           ].join('\r\n');

           // Base64Url Encode for Gmail API
           const rawMessage = base64UrlEncode(emailParts);
             
           const emailResp = await fetch(`${GOOGLE_API}/gmail/v1/users/me/messages/send`, {
             method: 'POST',
             headers: {
               Authorization: `Bearer ${account.access_token}`,
               'Content-Type': 'application/json',
             },
             body: JSON.stringify({ raw: rawMessage })
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

      // Update booking with Google Event ID if created
      if (googleEventId) {
          await supabase
            .from("campaign_bookings")
            .update({
              google_event_id: googleEventId,
              google_synced_at: new Date().toISOString()
            })
            .eq("id", booking_id);
      }

      return new Response(
        JSON.stringify({ 
            success: true, 
            google_event_id: googleEventId,
            emailSent: emailSent,
            emailError: emailSent ? null : "Check function logs for details" 
        }),
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
