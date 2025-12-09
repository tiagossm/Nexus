import { supabase } from './supabaseClient';
import type { MessageTemplate, MessageChannel } from '../types';

interface TemplateFilters {
  channel?: MessageChannel;
  category?: string;
  isActive?: boolean;
  search?: string;
}

/**
 * List all message templates with optional filters
 */
export async function listTemplates(filters?: TemplateFilters) {
  let query = supabase
    .from('message_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.channel) {
    query = query.eq('channel', filters.channel);
  }

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error listing templates:', error);
    throw error;
  }

  return data as MessageTemplate[];
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(id: string) {
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error getting template:', error);
    throw error;
  }

  return data as MessageTemplate;
}

/**
 * Create a new message template
 */
export async function createTemplate(templateData: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('message_templates')
    .insert([templateData])
    .select()
    .single();

  if (error) {
    console.error('Error creating template:', error);
    throw error;
  }

  return data as MessageTemplate;
}

/**
 * Update an existing template
 */
export async function updateTemplate(id: string, updates: Partial<MessageTemplate>) {
  const { data, error } = await supabase
    .from('message_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating template:', error);
    throw error;
  }

  return data as MessageTemplate;
}

/**
 * Delete a template (soft delete by setting is_active to false)
 */
export async function deleteTemplate(id: string, hardDelete = false) {
  if (hardDelete) {
    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  } else {
    await updateTemplate(id, { is_active: false });
  }
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(id: string, newName?: string) {
  const template = await getTemplateById(id);
  
  const { id: _, created_at, updated_at, ...templateData } = template;
  
  return createTemplate({
    ...templateData,
    name: newName || `${template.name} (Cópia)`,
  });
}

/**
 * Render a template with actual variable values
 */
export function renderTemplate(
  template: MessageTemplate,
  variables: Record<string, any>
): { subject?: string; body: string; html_body?: string } {
  const replaceVariables = (text: string) => {
    return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
      // Support nested keys like 'contact.name'
      const keys = key.split('.');
      let value: any = variables;
      
      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) break;
      }
      
      return value !== undefined ? String(value) : match;
    });
  };

  const result: { subject?: string; body: string; html_body?: string } = {
    body: replaceVariables(template.body),
  };

  if (template.subject) {
    result.subject = replaceVariables(template.subject);
  }

  if (template.html_body) {
    result.html_body = replaceVariables(template.html_body);
  }

  return result;
}

/**
 * Get sample data for preview
 */
export function getSampleData(): Record<string, any> {
  return {
    contact: {
      name: 'João da Silva',
      firstName: 'João',
      email: 'joao.silva@email.com',
      phone: '(11) 98765-4321',
    },
    clinic: {
      name: 'Clínica Exemplo',
      address: 'Rua das Flores, 123 - Centro, São Paulo - SP',
      phone: '(11) 3456-7890',
    },
    exam: {
      name: 'Raio-X de Tórax',
      date: '15/12/2024',
      time: '14:30',
      location: 'Sala 3 - Térreo',
    },
    today: new Date().toLocaleDateString('pt-BR'),
    greeting: getGreeting(),
    company: {
      name: 'Nexus Agenda',
    },
  };
}

/**
 * Helper to get greeting based on time of day
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
