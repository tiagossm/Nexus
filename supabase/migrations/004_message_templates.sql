-- Migration: Message Templates System
-- Description: Creates tables for managing multi-channel message templates (Email, WhatsApp, SMS)

-- Create message_templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'whatsapp', 'sms')),
  category VARCHAR(100), -- ex: 'appointment_reminder', 'follow_up', 'confirmation'
  
  -- Content fields
  subject VARCHAR(500), -- Apenas para email
  body TEXT NOT NULL,
  html_body TEXT, -- Apenas para email (versão HTML)
  
  -- Metadata
  available_variables JSONB DEFAULT '[]', -- Lista de variáveis usadas no template
  attachments JSONB DEFAULT '[]', -- [{name, url}] para email
  
  -- Status & Organization
  is_active BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  
  -- Audit fields
  created_by VARCHAR(255) DEFAULT 'default_user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_template_name_channel UNIQUE(name, channel)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_message_templates_channel ON message_templates(channel);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_message_templates_created_at ON message_templates(created_at DESC);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_message_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_message_templates_updated_at();

-- Insert some example templates
INSERT INTO message_templates (name, channel, category, subject, body, is_active, tags) VALUES
  (
    'Confirmação de Exame',
    'email',
    'appointment_confirmation',
    'Confirmação: {{exam.name}} - {{exam.date}}',
    'Olá {{contact.firstName}},

Confirmamos seu exame de {{exam.name}} para o dia {{exam.date}} às {{exam.time}}.

📍 Local: {{clinic.name}}
📫 Endereço: {{clinic.address}}
📞 Telefone: {{clinic.phone}}

Por favor, chegue 15 minutos antes do horário marcado.

Atenciosamente,
Equipe {{company.name}}',
    true,
    ARRAY['confirmacao', 'exame']
  ),
  (
    'Lembrete WhatsApp',
    'whatsapp',
    'appointment_reminder',
    NULL,
    '{{greeting}}, {{contact.firstName}}! 👋

Lembrando que você tem um exame amanhã:

🏥 Exame: {{exam.name}}
📅 Data: {{exam.date}}
🕐 Horário: {{exam.time}}
📍 Local: {{clinic.name}}

Até lá!',
    true,
    ARRAY['lembrete', 'whatsapp']
  ),
  (
    'SMS Lembrete',
    'sms',
    'appointment_reminder',
    NULL,
    'Lembrete: Exame {{exam.name}} dia {{exam.date}} as {{exam.time}} em {{clinic.name}}. Info: {{clinic.phone}}',
    true,
    ARRAY['lembrete', 'sms']
  );

-- Grant permissions (adjust as needed)
-- ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
