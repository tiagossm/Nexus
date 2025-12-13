```javascript
import { supabase, supabaseAnon } from './supabaseClient';

import { Campaign, CampaignRecipient } from '../types';

export const campaignService = {
  /**
   * Get all campaigns with optional filtering
   */
  async getCampaigns(status?: Campaign['status']): Promise<Campaign[]> {
    let query = supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  /**
   * Get a single campaign by ID
   */
  async getCampaign(id: string): Promise<Campaign | null> {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new campaign
   */
  async createCampaign(campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .insert(campaign)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update an existing campaign
   */
  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a campaign
   */
  async deleteCampaign(id: string): Promise<void> {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get recipients for a campaign
   */
  async getRecipients(campaignId: string): Promise<CampaignRecipient[]> {
    const { data, error } = await supabase
      .from('campaign_recipients')
      .select(`
        *,
        contact:contacts (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Add recipients to a campaign (bulk operation)
   */
  async addRecipients(
    campaignId: string,
    contactIds: string[],
    metadata?: Record<string, any>
  ): Promise<CampaignRecipient[]> {
    const recipients = contactIds.map(contactId => ({
      campaign_id: campaignId,
      contact_id: contactId,
      metadata: metadata || {}
    }));

    const { data, error } = await supabase
      .from('campaign_recipients')
      .insert(recipients)
      .select();

    if (error) throw error;
    return data || [];
  },

  /**
   * Update recipient status
   */
  async updateRecipientStatus(
    recipientId: string,
    status: CampaignRecipient['status']
  ): Promise<CampaignRecipient> {
    const updates: Partial<CampaignRecipient> = { status };
    
    // Auto-set timestamps based on status
    if (status === 'sent') updates.sent_at = new Date().toISOString();
    if (status === 'opened') updates.opened_at = new Date().toISOString();
    if (status === 'clicked') updates.clicked_at = new Date().toISOString();
    if (status === 'booked') updates.booked_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('campaign_recipients')
      .update(updates)
      .eq('id', recipientId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },


  /**
 * Get campaign statistics
 * Uses campaign totals updated by database triggers when message_events are recorded
 */
async getCampaignStats(campaignId: string) {
  // Get campaign totals (updated by triggers on message_events)
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('total_recipients, total_sent, total_opened, total_clicked, total_delivered, total_bounced, total_failed')
    .eq('id', campaignId)
    .single();

  // Get recipient counts by status (for pending and booked which aren't in message_events)
  const { data: recipients, error: recipientError } = await supabase
    .from('campaign_recipients')
    .select('status')
    .eq('campaign_id', campaignId);

  if (campaignError || recipientError) {
    console.error('Error fetching campaign stats:', campaignError || recipientError);
    throw campaignError || recipientError;
  }

  // Count pending and booked from recipients status
  let pending = 0;
  let booked = 0;
  recipients?.forEach(r => {
    if (r.status === 'pending') pending++;
    if (r.status === 'booked') booked++;
  });

  // Use campaign totals for tracking metrics, fallback to recipient counts
  const total = recipients?.length || 0;
  const sent = campaign?.total_sent || recipients?.filter(r => r.status !== 'pending').length || 0;
  const opened = campaign?.total_opened || 0;
  const clicked = campaign?.total_clicked || 0;
  const failed = campaign?.total_failed || 0;

  return {
    total,
    pending,
    sent,
    opened,
    clicked,
    booked,
    failed
  };
}
};
