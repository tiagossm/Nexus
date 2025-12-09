import { supabase } from './supabaseClient';

export interface WebhookConfig {
  id: string;
  name: string;
  channel: 'whatsapp' | 'sms';
  webhook_url: string;
  secret_key?: string;
  headers?: Record<string, string>;
  retry_config?: {
    max_retries: number;
    backoff: 'exponential' | 'linear';
  };
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookPayload {
  campaign_id: string;
  recipient_id: string;
  phone: string;
  message: string;
  variables?: Record<string, any>;
  callback_url: string;
}

export interface WebhookResponse {
  success: boolean;
  message_id?: string;
  error?: string;
}

/**
 * Webhook Service
 * Handles n8n webhook integrations for WhatsApp and SMS
 */
export const webhookService = {
  /**
   * Get active webhook config for a channel
   */
  async getWebhookConfig(channel: 'whatsapp' | 'sms'): Promise<WebhookConfig | null> {
    const { data, error } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('channel', channel)
      .eq('active', true)
      .single();

    if (error) {
      console.error(`Error fetching webhook config for ${channel}:`, error);
      return null;
    }

    return data;
  },

  /**
   * Send message via webhook with retry logic
   */
  async sendViaWebhook(
    channel: 'whatsapp' | 'sms',
    payload: WebhookPayload,
    attempt = 1
  ): Promise<WebhookResponse> {
    try {
      const config = await this.getWebhookConfig(channel);

      if (!config) {
        throw new Error(`No active webhook configured for ${channel}`);
      }

      const maxRetries = config.retry_config?.max_retries || 3;

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config.headers
      };

      // Add HMAC signature if secret key exists
      if (config.secret_key) {
        const signature = await this.generateHmacSignature(
          JSON.stringify(payload),
          config.secret_key
        );
        headers['X-Webhook-Signature'] = signature;
      }

      // Make the webhook call
      console.log(`📤 Sending ${channel} message (attempt ${attempt}/${maxRetries})`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(config.webhook_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      console.log(`✅ ${channel} message sent successfully:`,  result);

      return {
        success: true,
        message_id: result.message_id || result.id
      };

    } catch (error: any) {
      console.error(`❌ Webhook error (attempt ${attempt}):`, error);

      const config = await this.getWebhookConfig(channel);
      const maxRetries = config?.retry_config?.max_retries || 3;

      // Retry logic
      if (attempt < maxRetries) {
        const delay = this.calculateBackoffDelay(attempt, config?.retry_config?.backoff || 'exponential');
        console.log(`⏳ Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendViaWebhook(channel, payload, attempt + 1);
      }

      return {
        success: false,
        error: error.message || 'Unknown webhook error'
      };
    }
  },

  /**
   * Calculate backoff delay for retries
   */
  calculateBackoffDelay(attempt: number, strategy: 'exponential' | 'linear'): number {
    if (strategy === 'exponential') {
      // 1s, 2s, 4s, 8s, 16s
      return Math.pow(2, attempt - 1) * 1000;
    } else {
      // 2s, 4s, 6s
      return attempt * 2000;
    }
  },

  /**
   * Generate HMAC-SHA256 signature for webhook verification
   */
  async generateHmacSignature(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Test webhook connection
   */
  async testWebhook(webhookId: string): Promise<boolean> {
    try {
      const { data: config, error } = await supabase
        .from('webhook_configs')
        .select('*')
        .eq('id', webhookId)
        .single();

      if (error || !config) {
        console.error('Webhook config not found');
        return false;
      }

      const testPayload = {
        test: true,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(config.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Mode': 'true'
        },
        body: JSON.stringify(testPayload)
      });

      return response.ok;
    } catch (error) {
      console.error('Webhook test failed:', error);
      return false;
    }
  },

  /**
   * Create or update webhook configuration
   */
  async upsertWebhookConfig(config: Partial<WebhookConfig>): Promise<WebhookConfig | null> {
    const { data, error } = await supabase
      .from('webhook_configs')
      .upsert(config)
      .select()
      .single();

    if (error) {
      console.error('Error upserting webhook config:', error);
      return null;
    }

    return data;
  },

  /**
   * List all webhook configs
   */
  async listWebhookConfigs(activeOnly = false): Promise<WebhookConfig[]> {
    let query = supabase
      .from('webhook_configs')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error listing webhook configs:', error);
      return [];
    }

    return data || [];
  }
};
