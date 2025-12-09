import { supabase } from './supabaseClient';

export interface MessageEvent {
  id: string;
  campaign_id: string;
  recipient_id: string;
  event_type: 'sent' | 'delivered' | 'bounced' | 'failed' | 'opened' | 'clicked' | 'read' | 'booked' | 'completed' | 'cancelled' | 'unsubscribed';
  channel: 'email' | 'whatsapp' | 'sms';
  metadata: Record<string, any>;
  created_at: string;
}

export interface CampaignAnalytics {
  campaign_id: string;
  total_recipients: number;
  
  // Overall metrics
  sent: number;
  delivered: number;
  bounced: number;
  failed: number;
  opened: number;
  clicked: number;
  booked: number;
  unsubscribed: number;
  
  // Rates
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  booking_rate: number;
  
  // By channel
  by_channel: {
    email: ChannelMetrics;
    whatsapp: ChannelMetrics;
    sms: ChannelMetrics;
  };
  
  // Timeline data
  events_timeline: TimelinePoint[];
}

export interface ChannelMetrics {
  sent: number;
  delivered: number;
  opened?: number;
  read?: number;
  clicked: number;
}

export interface TimelinePoint {
  timestamp: string;
  event_type: string;
  count: number;
}

/**
 * Tracking Service
 * Handles all event tracking and analytics for campaigns
 */
export const trackingService = {
  /**
   * Inject tracking pixel and wrap links for email tracking
   */
  injectEmailTracking(
    html: string,
    campaignId: string,
    recipientId: string
  ): string {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      console.warn('⚠️ VITE_SUPABASE_URL not configured, tracking disabled');
      return html;
    }

    // 1. Inject Tracking Pixel
    const pixelUrl = `${supabaseUrl}/functions/v1/track-open?cid=${campaignId}&rid=${recipientId}`;
    const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

    let trackedHtml = html;
    if (trackedHtml.includes('</body>')) {
      trackedHtml = trackedHtml.replace('</body>', `${pixelHtml}</body>`);
    } else {
      trackedHtml += pixelHtml;
    }

    // 2. Wrap Links (Simple regex replacement for hrefs)
    // Excludes mailto:, tel:, #, and existing tracking links
    trackedHtml = trackedHtml.replace(/href=["'](http[^"']+)["']/g, (match, url) => {
      if (url.includes('track-click') || url.includes('track-open')) {
        return match; // Already tracked
      }
      
      const encodedUrl = encodeURIComponent(url);
      const trackingUrl = `${supabaseUrl}/functions/v1/track-click?cid=${campaignId}&rid=${recipientId}&url=${encodedUrl}`;
      return `href="${trackingUrl}"`;
    });

    return trackedHtml;
  },

  /**
   * Generate a short tracking link for WhatsApp/SMS
   * (For future implementation with URL shortener service)
   */
  async generateTrackingLink(
    url: string,
    campaignId: string,
    recipientId: string
  ): Promise<string> {
    // TODO: Implement with URL shortener service (bit.ly, TinyURL, or custom)
    // For now, return the full tracking URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const encodedUrl = encodeURIComponent(url);
    return `${supabaseUrl}/functions/v1/track-click?cid=${campaignId}&rid=${recipientId}&url=${encodedUrl}`;
  },

  /**
   * Get all events for a specific recipient
   */
  async getRecipientEvents(recipientId: string): Promise<MessageEvent[]> {
    const { data, error } = await supabase
      .from('message_events')
      .select('*')
      .eq('recipient_id', recipientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recipient events:', error);
      return [];
    }

    return data as MessageEvent[];
  },

  /**
   * Get events for a campaign with optional filtering
   */
  async getCampaignEvents(
    campaignId: string,
    options?: {
      eventType?: string;
      channel?: string;
      limit?: number;
    }
  ): Promise<MessageEvent[]> {
    let query = supabase
      .from('message_events')
      .select('*')
      .eq('campaign_id', campaignId);

    if (options?.eventType) {
      query = query.eq('event_type', options.eventType);
    }

    if (options?.channel) {
      query = query.eq('channel', options.channel);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching campaign events:', error);
      return [];
    }

    return data as MessageEvent[];
  },

  /**
   * Get comprehensive analytics for a campaign
   */
  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics | null> {
    try {
      // Fetch campaign data
      const { data: campaign, error: campError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campError) throw campError;

      // Fetch all recipients
      const { data: recipients, error: recError } = await supabase
        .from('campaign_recipients')
        .select('*')
        .eq('campaign_id', campaignId);

      if (recError) throw recError;

      const totalRecipients = recipients?.length || 0;

      // Use the pre-calculated metrics from campaigns table
      const sent = campaign.total_sent || 0;
      const delivered = campaign.total_delivered || 0;
      const bounced = campaign.total_bounced || 0;
      const failed = campaign.total_failed || 0;
      const opened = campaign.total_opened || 0;
      const clicked = campaign.total_clicked || 0;
      const booked = campaign.total_scheduled || 0;
      const unsubscribed = campaign.total_unsubscribed || 0;

      // Calculate rates
      const delivery_rate = sent > 0 ? (delivered / sent) * 100 : 0;
      const open_rate = delivered > 0 ? (opened / delivered) * 100 : 0;
      const click_rate = opened > 0 ? (clicked / opened) * 100 : 0;
      const booking_rate = totalRecipients > 0 ? (booked / totalRecipients) * 100 : 0;

      // Get by-channel metrics from JSONB field
      const by_channel = campaign.metrics_by_channel || {
        email: { sent: 0, delivered: 0, opened: 0, clicked: 0 },
        whatsapp: { sent: 0, delivered: 0, read: 0, clicked: 0 },
        sms: { sent: 0, delivered: 0, clicked: 0 }
      };

      // Get timeline data (last 7 days, hourly)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: timelineData } = await supabase
        .from('message_events')
        .select('event_type, created_at')
        .eq('campaign_id', campaignId)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Group timeline data by hour
      const events_timeline: TimelinePoint[] = [];
      if (timelineData) {
        const grouped = timelineData.reduce((acc: any, event) => {
          const hour = new Date(event.created_at).toISOString().slice(0, 13) + ':00:00';
          const key = `${hour}_${event.event_type}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        events_timeline.push(...Object.entries(grouped).map(([key, count]) => {
          const [timestamp, event_type] = key.split('_');
          return { timestamp, event_type, count: count as number };
        }));
      }

      return {
        campaign_id: campaignId,
        total_recipients: totalRecipients,
        sent,
        delivered,
        bounced,
        failed,
        opened,
        clicked,
        booked,
        unsubscribed,
        delivery_rate,
        open_rate,
        click_rate,
        booking_rate,
        by_channel,
        events_timeline
      };

    } catch (error) {
      console.error('Error getting campaign analytics:', error);
      return null;
    }
  },

  /**
   * Record a custom event
   */
  async recordEvent(
    campaignId: string,
    recipientId: string,
    eventType: MessageEvent['event_type'],
    channel: MessageEvent['channel'],
    metadata?: Record<string, any>
  ): Promise<boolean> {
    const { error } = await supabase
      .from('message_events')
      .insert({
        campaign_id: campaignId,
        recipient_id: recipientId,
        event_type: eventType,
        channel,
        metadata: metadata || {}
      });

    if (error) {
      console.error('Error recording event:', error);
      return false;
    }

    return true;
  }
};
