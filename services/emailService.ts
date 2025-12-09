import { supabase } from './supabaseClient';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailService = {
  /**
   * Send an email via Supabase Edge Function
   */
  async sendEmail(payload: EmailPayload): Promise<boolean> {
    console.log('📧 [EmailService] Sending email via Edge Function:', payload.to);

    try {
      // Get current session to ensure we send the auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      console.log('🔐 [EmailService] Session status:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        sessionError: sessionError,
      });

      if (!session || !session.access_token) {
        console.error('❌ [EmailService] No active session or access token. User might not be authenticated.');
        throw new Error('User not authenticated. Please login again.');
      }

      // Get Supabase URL from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('VITE_SUPABASE_URL not configured');
      }

      const functionUrl = `${supabaseUrl}/functions/v1/send-email`;
      
      console.log('📤 [EmailService] Sending POST request to:', functionUrl);
      console.log('🔑 [EmailService] Using token:', session.access_token.substring(0, 20) + '...');

      // Use fetch directly with explicit headers
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 [EmailService] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ [EmailService] Error response:', errorData);
        return false;
      }

      const data = await response.json();
      console.log('✅ [EmailService] Email sent successfully:', JSON.stringify(data, null, 2));
      return true;
    } catch (e) {
      console.error('❌ [EmailService] Exception sending email:', e);
      return false;
    }
  }
};
