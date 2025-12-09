import { supabase } from './supabaseClient';
import { googleCalendarService } from './googleCalendarService';
import { emailService } from './emailService';

export interface CampaignBooking {
  id: string;
  campaign_id: string;
  recipient_id?: string;
  contact_id?: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'rescheduled';
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_cpf?: string;
  notes?: string;
  cancellation_reason?: string;
  google_event_id?: string;
  google_synced_at?: string;
  soc_protocolo?: string;
  soc_sync_status?: 'pending' | 'synced' | 'error' | 'not_applicable';
  soc_response?: any;
  created_at: string;
  updated_at: string;
  // Joined data
  campaign?: {
    id: string;
    title: string;
    clinic_id?: string;
  };
  contact?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
  };
}

export const campaignBookingService = {
  /**
   * Get all bookings for a campaign
   */
  async getBookingsByCampaign(campaignId: string): Promise<CampaignBooking[]> {
    const { data, error } = await supabase
      .from('campaign_bookings')
      .select(`
        *,
        campaign:campaigns(id, title, clinic_id),
        contact:contacts(id, name, email, phone, cpf)
      `)
      .eq('campaign_id', campaignId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all bookings within a date range (for calendar view)
   */
  async getBookingsInRange(
    startDate: Date,
    endDate: Date,
    campaignId?: string
  ): Promise<CampaignBooking[]> {
    let query = supabase
      .from('campaign_bookings')
      .select(`
        *,
        campaign:campaigns(id, title, clinic_id),
        contact:contacts(id, name, email, phone)
      `)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true });

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Create a new booking
   */
  async createBooking(booking: Omit<CampaignBooking, 'id' | 'created_at' | 'updated_at'>): Promise<CampaignBooking> {
    
    // 0. Uniqueness Check (One booking per email per campaign)
    if (booking.client_email) {
        const { data: existing } = await supabase
           .from('campaign_bookings')
           .select('id')
           .eq('campaign_id', booking.campaign_id)
           .eq('client_email', booking.client_email)
           .neq('status', 'cancelled');
           
        if (existing && existing.length > 0) {
            throw new Error('Você já possui um agendamento nesta campanha.');
        }
    }

    // 1. Security Check: If recipient_id is provided, validate email
    if (booking.recipient_id) {
        const { data: recipient } = await supabase
            .from('campaign_recipients')
            .select('contact:contacts(email)')
            .eq('id', booking.recipient_id)
            .single();
        
        if (recipient && recipient.contact) {
            // Normalize emails for comparison
            const recipientEmail = (recipient.contact as any).email?.toLowerCase().trim();
            const bookingEmail = booking.client_email.toLowerCase().trim();
            
            if (recipientEmail && recipientEmail !== bookingEmail) {
                console.error(`[Security] Email mismatch: Link belongs to ${recipientEmail}, but used by ${bookingEmail}`);
                 throw new Error(`Este link de agendamento é exclusivo para ${recipientEmail}. Por favor, verifique seu email.`);
            }
        }
    }

    const { data, error } = await supabase
      .from('campaign_bookings')
      .insert(booking)
      .select()
      .single();

    if (error) throw error;
    
    // --- PROFESSIONAL BOOKING FLOW ---
    try {
        console.log('[ProfessionalFlow] Booking created, invoking server-side manager...');
        
        // Invoke Edge Function to handle Calendar + Email securely (bypassing RLS for public users)
        console.log('[ProfessionalFlow] Invoking manage-calendar-event with payload:', {
             action: 'create_event',
             campaign_id: booking.campaign_id,
             booking_id: data.id,
             booking_details: { email: booking.client_email } // Logging partial details for privacy
        });

        const { data: funcData, error: funcError } = await supabase.functions.invoke('manage-calendar-event', {
            body: {
                action: 'create_event',
                campaign_id: booking.campaign_id,
                booking_id: data.id,
                booking_details: {
                    client_name: booking.client_name,
                    client_email: booking.client_email,
                    client_phone: booking.client_phone,
                    start_time: booking.start_time,
                    end_time: booking.end_time
                }
            }
        });

        if (funcError) {
             console.error('[ProfessionalFlow] ❌ Edge Function invocation failed:', funcError);
             console.error('[ProfessionalFlow] Error details:', JSON.stringify(funcError));
        } else {
             console.log('[ProfessionalFlow] ✅ Server response:', funcData);
             if (funcData?.emailSent) {
                 console.log('[ProfessionalFlow] 📧 Email confirmation marked as sent by server.');
             } else {
                 console.warn('[ProfessionalFlow] ⚠️ Server did not confirm email sending:', funcData);
             }
        }

    } catch (flowError) {
        console.error('[ProfessionalFlow] Error in confirmation flow:', flowError);
    }

    return data;
  },

  /**
   * Update a booking
   */
  async updateBooking(id: string, updates: Partial<CampaignBooking>): Promise<CampaignBooking> {
    const { data, error } = await supabase
      .from('campaign_bookings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Cancel a booking
   */
  async cancelBooking(id: string, reason?: string): Promise<CampaignBooking> {
    return this.updateBooking(id, {
      status: 'cancelled',
      cancellation_reason: reason
    });
  },

  /**
   * Mark booking as completed
   */
  async completeBooking(id: string): Promise<CampaignBooking> {
    return this.updateBooking(id, { status: 'completed' });
  },

  /**
   * Mark booking as no-show
   */
  async markNoShow(id: string): Promise<CampaignBooking> {
    return this.updateBooking(id, { status: 'no_show' });
  },

  /**
   * Check if a time slot is available for a campaign
   */
  async isSlotAvailable(campaignId: string, startTime: Date, endTime: Date): Promise<boolean> {
    const { data, error } = await supabase
      .from('campaign_bookings')
      .select('id')
      .eq('campaign_id', campaignId)
      .neq('status', 'cancelled')
      .gte('start_time', startTime.toISOString())
      .lt('start_time', endTime.toISOString())
      .limit(1);

    if (error) throw error;
    return (data || []).length === 0;
  },

  /**
   * Get booked slots for a campaign on a specific date
   */
  async getBookedSlotsForDate(campaignId: string, date: Date): Promise<string[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('campaign_bookings')
      .select('start_time')
      .eq('campaign_id', campaignId)
      .neq('status', 'cancelled')
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString());

    if (error) throw error;
    
    // Return array of HH:mm times
    return (data || []).map(b => {
      const d = new Date(b.start_time);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    });
  },

  /**
   * Get booking statistics for a campaign
   */
  async getBookingStats(campaignId: string) {
    const { data, error } = await supabase
      .from('campaign_bookings')
      .select('status')
      .eq('campaign_id', campaignId);

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0
    };

    data?.forEach(b => {
      if (b.status === 'confirmed') stats.confirmed++;
      if (b.status === 'completed') stats.completed++;
      if (b.status === 'cancelled') stats.cancelled++;
      if (b.status === 'no_show') stats.no_show++;
    });

    return stats;
  }
};
