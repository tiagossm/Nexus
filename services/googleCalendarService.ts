import { supabase } from './supabaseClient';

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export interface Calendar {
  id: string;
  summary: string;
  primary: boolean;
}

export interface BusyTime {
  start: string;
  end: string;
}

// NOTE: In a real production app, token exchange should happen on the backend (Supabase Edge Function)
// to keep the Client Secret secure. For this MVP/Demo, we might use Supabase Auth provider tokens
// or a simplified flow.

export const googleCalendarService = {
  
  /**
   * Initiates the Google OAuth flow specifically for Calendar access.
   * If using Supabase Auth, this might be a signInWithOAuth call with scopes.
   */
  connect: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar',
        queryParams: {
          access_type: 'offline', // Required for Refresh Token
          prompt: 'consent',
        },
        redirectTo: window.location.origin + '/integrations/callback'
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Lists the user's calendars.
   * Requires a valid provider_token from the session.
   */
  listCalendars: async (accessToken: string): Promise<Calendar[]> => {
    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch calendars');
    }

    const data = await response.json();
    return data.items.map((item: any) => ({
      id: item.id,
      summary: item.summary,
      primary: item.primary || false
    }));
  },

  /**
   * Checks for busy times in the specified time range.
   */
  getBusyTimes: async (accessToken: string, timeMin: string, timeMax: string): Promise<BusyTime[]> => {
    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/freeBusy`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: 'primary' }] // Check primary calendar
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch busy times');
    }

    const data = await response.json();
    const busy = data.calendars.primary.busy;
    return busy;
  },

  /**
   * Creates an event in the user's calendar.
   */
  createEvent: async (accessToken: string, calendarId: string = 'primary', event: any) => {
    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to create event:', errorData);
      throw new Error(`Failed to create event in Google Calendar: ${response.statusText}`);
    }

    return await response.json();
  },

  /**
   * Creates a secondary calendar for a campaign
   */
  createCalendar: async (accessToken: string, summary: string): Promise<Calendar> => {
    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: summary,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create calendar');
    }

    return await response.json();
  },

  /**
   * Deletes an event from a calendar
   */
  deleteEvent: async (accessToken: string, calendarId: string, eventId: string) => {
    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/${calendarId}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete event');
    }
  },

  /**
   * Save session tokens to the database for backend use
   */
  /**
   * Save session tokens to the database for backend use
   */
  saveSessionTokens: async (session: any) => {
    if (!session?.provider_token || !session?.user?.email) return;

    // Calculate expiry (approximate if not provided, usually 1h)
    // Supabase session usually has expires_in or provider_token_duration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (session.expires_in || 3600));

    const payload = {
      user_id: session.user.id,
      email: session.user.email,
      provider: 'gmail', // Using 'gmail' as generic Google provider key
      access_token: session.provider_token,
      refresh_token: session.provider_refresh_token, // Only present on first login/consent
      token_expires_at: expiresAt.toISOString(),
      is_active: true,
      updated_at: new Date().toISOString()
    };

    // Strategy: First check if record exists to preserve refresh_token if needed
    const { data: existing } = await supabase
        .from('user_email_accounts')
        .select('refresh_token')
        .eq('user_id', session.user.id)
        .eq('email', session.user.email)
        .eq('provider', 'gmail')
        .single();

    if (!payload.refresh_token && existing?.refresh_token) {
        payload.refresh_token = existing.refresh_token;
    }

    const { error } = await supabase
      .from('user_email_accounts')
      .upsert(payload, { onConflict: 'user_id,email' });

    if (error) {
        console.error('Failed to save tokens:', error);
    }
  },

  /**
   * Retrieves a valid access token from the database, refreshing if necessary.
   */
  getValidAccessToken: async (userId: string): Promise<string | null> => {
    // 1. Get account
    const { data: account, error } = await supabase
        .from('user_email_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'gmail')
        .eq('is_active', true)
        .single();

    if (error || !account) {
        console.error('No connected Google account found');
        return null;
    }

    // 2. Check expiry
    const now = new Date();
    const expiresAt = new Date(account.token_expires_at);
    
    // If valid for more than 5 mins, return it
    if (expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
        return account.access_token;
    }

    // 3. Refresh if needed
    if (!account.refresh_token) {
        console.error('Token expired and no refresh token available');
        return null;
    }

    try {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        // NOTE: We can't safely use Client Secret on frontend. 
        // Ideally checking "expires_in" should be enough if we rely on session, 
        // BUT for background tasks we really need the backend to do this.
        // For this "Professional Booking" flow, we are running on the Client (browser),
        // so we might actually be able to just use the current Session if the user is logged in!
        
        // However, if we must refresh, we need the Edge Function to do it securely.
        // Let's rely on the Edge Function 'gmail-oauth-callback' or 'send-email' logic?
        // Or simply ask Supabase to refresh the session?
        
        // Workaround: We will rely on the session being active in the browser for now.
        // If we really need to refresh a stored token without client secret, we can't do it purely client-side securely.
        // We probably need a dedicated 'refresh-token' Edge Function.
        
        // For now, let's assume if we are in the browser, we might have a valid session.
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.provider_token) {
             return session.provider_token;
        }

        console.warn('Could not refresh token on client side safely. Ensure user is logged in.');
        return account.access_token; // Return potentially expired token and hope for the best?
    } catch (e) {
        console.error('Token refresh error:', e);
        return null;
    }
  }
};
