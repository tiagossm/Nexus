import { supabase, isSupabaseConfigured } from './supabaseClient';
import { ParsedContact } from '../components/ContactSelector';
import { Contact } from '../types';
import { trackingService } from './trackingService';

/**
 * Add contacts as recipients to a campaign.
 * It upserts contacts globally and creates entries in campaign_recipients.
 */
export const addRecipientsToCampaign = async (
  campaignId: string,
  contacts: ParsedContact[]
): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  // Deduplicate contacts by email (ON CONFLICT requires unique values in batch)
  const uniqueContacts = Array.from(
    new Map(contacts.map(c => [c.email.toLowerCase(), c])).values()
  );

  // 1. Upsert contacts (global catalog)
  const { data: upserted, error: upsertError } = await supabase
    .from('contacts')
    .upsert(
      uniqueContacts.map(c => ({
        name: c.name,
        email: c.email,
        phone: c.phone,
        cpf: c.cpf,
        status: c.status ?? 'Pendente',
        invite_count: c.invite_count ?? 0,
        metadata: c.metadata ?? {}
      })),
      { onConflict: 'email' }
    )
    .select();
  if (upsertError) throw upsertError;

  // 2. Create campaign_recipients entries
  const recipients = (upserted as any[]).map(contact => ({
    campaign_id: campaignId,
    contact_id: contact.id,
    status: 'pending',
    invite_count: 0,
    metadata: contact.metadata ?? {},
    phone: contact.phone, // For future WhatsApp/SMS support
    channel: 'email' // Default channel
  }));

  const { error: insertError } = await supabase
    .from('campaign_recipients')
    .insert(recipients);
  if (insertError) throw insertError;
};

/** Fetch all recipients for a campaign, including contact data */
export const fetchCampaignRecipients = async (campaignId: string) => {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('campaign_recipients')
    .select('*, contacts(*)')
    .eq('campaign_id', campaignId);
  if (error) throw error;
  return data;
};

/** Fetch a single recipient by ID, including contact data */
export const getRecipient = async (recipientId: string) => {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('campaign_recipients')
    .select('*, contacts(*)')
    .eq('id', recipientId)
    .single();
  if (error) throw error;
  return data;
};

/** Send invites to all pending recipients of a campaign */
export const sendInvites = async (
  campaignId: string, 
  sendEmail: (email: string, payload: any) => Promise<void>,
  messageConfig?: { subject: string; body: string }
) => {
  const recipients = await fetchCampaignRecipients(campaignId);
  console.log(`[sendInvites] Total recipients: ${recipients.length}`);
  
  const pending = recipients.filter((r: any) => r.status === 'pending');
  console.log(`[sendInvites] Pending recipients: ${pending.length}`);
  
  if (pending.length === 0) {
    throw new Error('Nenhum contato pendente para enviar. Todos os convites já foram enviados.');
  }
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const rec of pending) {
    try {
      const email = rec.contacts.email;
      console.log(`[sendInvites] Sending to: ${email}`);
      
      // Prepare payload with tracking injection capability
      const payload = { 
        campaignId, 
        recipientId: rec.id, 
        contact: rec.contacts,
        messageConfig, // Pass custom message config
        injectTracking: (html: string) => trackingService.injectEmailTracking(html, campaignId, rec.id)
      };

      await sendEmail(email, payload);
      
      // update status and invite count
      const { error } = await supabase
        .from('campaign_recipients')
        .update({ status: 'sent', invite_count: (rec.invite_count ?? 0) + 1, sent_at: new Date().toISOString() })
        .eq('id', rec.id);
        
      if (error) {
        console.error('Failed to update recipient status', error);
        errorCount++;
      } else {
        // Record 'sent' event in message_events to trigger campaign total update
        const { error: eventError } = await supabase
          .from('message_events')
          .insert({
            campaign_id: campaignId,
            recipient_id: rec.id,
            event_type: 'sent',
            channel: 'email',
            metadata: {
              email: rec.contacts.email,
              timestamp: new Date().toISOString()
            }
          });
          
        if (eventError) {
          console.error('Failed to record sent event:', eventError);
        }
        
        successCount++;
      }
    } catch (error) {
      console.error(`Failed to send to ${rec.contacts.email}:`, error);
      errorCount++;
    }
  }
  
  console.log(`[sendInvites] Success: ${successCount}, Errors: ${errorCount}`);
  
  if (errorCount > 0) {
    throw new Error(`Enviados ${successCount} de ${pending.length} convites. ${errorCount} falharam.`);
  }
};

/** Send reminders to specific recipients */
export const sendReminders = async (
  campaignId: string,
  recipientIds: string[],
  sendEmail: (email: string, payload: any) => Promise<void>,
  messageConfig?: { subject: string; body: string }
) => {
  const recipients = await fetchCampaignRecipients(campaignId);
  const targets = recipients.filter((r: any) => recipientIds.includes(r.id));

  for (const rec of targets) {
    const email = rec.contacts.email;
    
    const payload = { 
      campaignId, 
      recipientId: rec.id, 
      contact: rec.contacts, 
      type: 'reminder',
      messageConfig,
      injectTracking: (html: string) => trackingService.injectEmailTracking(html, campaignId, rec.id)
    };

    await sendEmail(email, payload);
    
    // update status and invite count
    const { error } = await supabase
      .from('campaign_recipients')
      .update({ 
        invite_count: (rec.invite_count ?? 0) + 1, 
        last_reminder_sent_at: new Date().toISOString() 
      })
      .eq('id', rec.id);
      
    if (error) console.error('Failed to update recipient status', error);
  }
};

/** Remove a recipient from a campaign */
export const removeRecipientFromCampaign = async (recipientId: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  
  const { error } = await supabase
    .from('campaign_recipients')
    .delete()
    .eq('id', recipientId);
  
  if (error) throw error;
};

/** Reset recipient status to pending for resend */
export const resetRecipientStatus = async (recipientId: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  
  const { error } = await supabase
    .from('campaign_recipients')
    .update({ status: 'pending' })
    .eq('id', recipientId);
  
  if (error) throw error;
};

/** Update recipient status */
export const updateRecipientStatus = async (
  recipientId: string, 
  status: 'pending' | 'sent' | 'opened' | 'clicked' | 'booked'
): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  
  const { error } = await supabase
    .from('campaign_recipients')
    .update({ status })
    .eq('id', recipientId);
  
  if (error) throw error;
};

/** Resend invite to a specific recipient (ignores current status) */
export const resendInvite = async (
  campaignId: string,
  recipientId: string,
  sendEmailFn: (email: string, payload: any) => Promise<void>,
  messageConfig?: { subject: string; body: string }
): Promise<void> => {
  const recipient = await getRecipient(recipientId);
  if (!recipient) throw new Error('Recipient not found');
  
  const email = recipient.contacts.email;
  
  const payload = {
    campaignId,
    recipientId: recipient.id,
    contact: recipient.contacts,
    messageConfig,
    injectTracking: (html: string) => trackingService.injectEmailTracking(html, campaignId, recipient.id)
  };

  await sendEmailFn(email, payload);
  
  // Update status and invite count
  const { error } = await supabase
    .from('campaign_recipients')
    .update({ 
      status: 'sent', 
      invite_count: (recipient.invite_count ?? 0) + 1, 
      sent_at: new Date().toISOString() 
    })
    .eq('id', recipient.id);
    
  if (error) throw error;
};

/** Bulk remove recipients */
export const bulkRemoveRecipients = async (recipientIds: string[]): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  
  const { error } = await supabase
    .from('campaign_recipients')
    .delete()
    .in('id', recipientIds);
  
  if (error) throw error;
};

/** Bulk reset recipients to pending */
export const bulkResetRecipients = async (recipientIds: string[]): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  
  const { error } = await supabase
    .from('campaign_recipients')
    .update({ status: 'pending' })
    .in('id', recipientIds);
  
  if (error) throw error;
};

/** Get recipients by status */
export const getRecipientsByStatus = async (
  campaignId: string, 
  status?: 'pending' | 'sent' | 'opened' | 'clicked' | 'booked'
) => {
  if (!isSupabaseConfigured()) return [];
  
  let query = supabase
    .from('campaign_recipients')
    .select('*, contacts(*)')
    .eq('campaign_id', campaignId);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};
