
export interface EventType {
  id: string;
  title: string;
  duration: number; // in minutes
  location: string; // e.g., 'Google Meet', 'Zoom'
  type: 'One-on-One' | 'Group';
  active: boolean;
  color: string; // Hex code for the side bar
  url: string;
  description?: string;
  custom_availability?: {
    weekdays?: string[];
    time_slots?: Array<{ start: string; end: string; slots_per_hour?: number }>;
    blocked_dates?: string[];
    special_dates?: Record<string, { start: string; end: string }>;
  };
}

export enum ViewState {
  SCHEDULING = 'Agendamento',
  CALENDAR = 'Agenda',
  MEETINGS = 'Reuniões',
  AVAILABILITY = 'Disponibilidade',
  CONTACTS = 'Contatos',
  CAMPAIGNS = 'Campanhas',
  TEMPLATES = 'Templates',
  CLINICS = 'Clínicas',
  EXAMS = 'Exames',
  COMPANIES = 'Empresas',
  WORKFLOWS = 'Fluxos de trabalho',
  INTEGRATIONS = 'Integrações e apps',
  ROUTING = 'Roteamento',
  ANALYTICS = 'Análises',
  ADMIN = 'Centro de administração',
  HELP = 'Ajuda'
}

export interface UserProfile {
  name: string;
  avatarInitials: string;
  landingPageUrl: string;
}

export interface AIMeetingSuggestion {
  title: string;
  duration: number;
  description: string;
  location: string;
}

export interface Booking {
  id?: string;
  event_id: string;
  client_name: string;
  client_email: string;
  start_time: string; // ISO String
  end_time: string; // ISO String
  created_at?: string;
  events?: EventType; 
}

export interface SingleUseLink {
  id: string;
  eventId: string;
  eventTitle: string;
  url: string;
  createdAt: Date;
  active: boolean;
}

export interface Poll {
  id: string;
  title: string;
  duration: number;
  location: string;
  status: 'pending' | 'scheduled';
  votes: number;
  createdAt: Date;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  age?: number;
  status: 'Pendente' | 'Convidado' | 'Agendado';
  last_invite_sent_at?: string;
  invite_count?: number;
}

export interface Campaign {
  id: string;
  title: string;
  description?: string;
  event_type_id?: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';
  start_date?: string;
  end_date?: string;
  deadline_date?: string;
  clinic_id?: string;
  exam_ids?: string[];
  custom_availability?: {
    weekdays?: string[];
    time_slots?: Array<{ start: string; end: string; slots_per_hour?: number }>;
    blocked_dates?: string[];
    special_dates?: Record<string, { start: string; end: string }>;
  };
  // Message Customization
  invite_message?: {
    template_id?: string;
    channel: MessageChannel;
    subject?: string;
    body: string;
  };
  reminder_message?: {
    template_id?: string;
    channel: MessageChannel;
    subject?: string;
    body: string;
    send_hours_before?: number;
  };
  
  // Legacy fields (keep for backward compatibility if needed, or mark deprecated)
  email_template_invite_id?: string;
  email_template_reminder_id?: string;
  max_bookings_per_day?: number;
  max_bookings_per_slot?: number;
  allow_reschedule?: boolean;
  max_reschedules?: number;
}

export interface CampaignField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'tel' | 'email' | 'textarea';
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface Campaign {
  id: string;
  title: string;
  description?: string;
  event_type_id?: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';
  start_date?: string;
  end_date?: string;
  deadline_date?: string;
  clinic_id?: string;
  exam_ids?: string[];
  custom_availability?: {
    weekdays?: string[];
    time_slots?: Array<{ start: string; end: string; slots_per_hour?: number }>;
    blocked_dates?: string[];
    special_dates?: Record<string, { start: string; end: string }>;
  };
  // Message Customization
  invite_message?: {
    template_id?: string;
    channel: MessageChannel;
    subject?: string;
    body: string;
  };
  reminder_message?: {
    template_id?: string;
    channel: MessageChannel;
    subject?: string;
    body: string;
    send_hours_before?: number;
  };
  
  // Legacy fields (keep for backward compatibility if needed, or mark deprecated)
  email_template_invite_id?: string;
  email_template_reminder_id?: string;
  max_bookings_per_day?: number;
  max_bookings_per_slot?: number;
  allow_reschedule?: boolean;
  max_reschedules?: number;
  custom_fields?: CampaignField[];
  notification_settings?: {
    email_enabled?: boolean;
    sms_enabled?: boolean;
    whatsapp_enabled?: boolean;
    reminder_hours_before?: number[];
    admin_notifications?: boolean;
  };
  total_recipients?: number;
  total_invited?: number;
  total_scheduled?: number;
  total_completed?: number;
  created_by?: string;
  owner_email?: string;
  company_id?: string;
  company?: Company;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  contact_id: string;
  unique_link_id?: string;
  status: 'pending' | 'sent' | 'opened' | 'clicked' | 'booked' | 'failed';
  sent_at?: string;
  opened_at?: string;
  clicked_at?: string;
  booked_at?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export type MessageChannel = 'email' | 'whatsapp' | 'sms';

export interface MessageTemplate {
  id: string;
  name: string;
  description?: string;
  channel: MessageChannel;
  category?: string;
  subject?: string; // Only for email
  body: string;
  html_body?: string; // Only for email
  available_variables?: string[];
  attachments?: Array<{ name: string; url: string }>;
  is_active: boolean;
  tags?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  key: string;
  label: string;
  description?: string;
  example?: string;
  category: 'contact' | 'campaign' | 'clinic' | 'exam' | 'system' | 'other';
}

export interface Company {
  id: string;
  name: string;
  logo_url?: string;
  primary_color: string;
  footer_text?: string;
  contact_email?: string;
  contact_phone?: string;
  website_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: 'contact.phone', label: 'Telefone do Contato', category: 'contact' },
  { key: 'clinic.name', label: 'Nome da Clínica', category: 'clinic' },
  { key: 'clinic.address', label: 'Endereço da Clínica', category: 'clinic' },
  { key: 'clinic.phone', label: 'Telefone da Clínica', category: 'clinic' },
  { key: 'exam.name', label: 'Nome do Exame', category: 'exam' },
  { key: 'exam.date', label: 'Data do Exame', category: 'exam' },
  { key: 'exam.time', label: 'Hora do Exame', category: 'exam' },
  { key: 'exam.location', label: 'Local do Exame', category: 'exam' },
  { key: 'today', label: 'Data de Hoje', category: 'system' },
  { key: 'greeting', label: 'Saudação (Bom dia/Boa tarde/Boa noite)', category: 'system' },
  { key: 'company.name', label: 'Nome da Empresa', category: 'system' },
];

