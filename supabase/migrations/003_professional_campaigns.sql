-- Migration 003: Professional Campaign System
-- Adds support for clinics, exams, email templates, and enhanced campaign features

-- =====================================================
-- CLINICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS clinics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  capacity_per_hour INTEGER DEFAULT 4,
  working_hours JSONB DEFAULT '{"mon": {"start": "08:00", "end": "17:00"}, "tue": {"start": "08:00", "end": "17:00"}, "wed": {"start": "08:00", "end": "17:00"}, "thu": {"start": "08:00", "end": "17:00"}, "fri": {"start": "08:00", "end": "17:00"}, "sat": {"start": "08:00", "end": "12:00"}, "sun": null}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinics_active ON clinics(active);
CREATE INDEX IF NOT EXISTS idx_clinics_city ON clinics(city);

-- =====================================================
-- EXAMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  code TEXT UNIQUE, -- Ex: "ASO", "AUDIO", "ECG"
  description TEXT,
  duration_minutes INTEGER DEFAULT 15,
  requires_fasting BOOLEAN DEFAULT false,
  preparation_instructions TEXT,
  category TEXT, -- Ex: "Laboratorial", "Clínico", "Imagem"
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_active ON exams(active);
CREATE INDEX IF NOT EXISTS idx_exams_category ON exams(category);
CREATE INDEX IF NOT EXISTS idx_exams_code ON exams(code);

-- =====================================================
-- EMAIL TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('invite', 'confirmation', 'reminder', 'reschedule', 'completion', 'cancellation')),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT, -- Plain text version
  variables JSONB DEFAULT '["nome", "empresa", "data", "hora", "local", "link_agendamento", "exames"]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(type);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(active);

-- =====================================================
-- CAMPAIGNS TABLE UPDATES
-- =====================================================

-- Add clinic reference
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS clinic_id TEXT REFERENCES clinics(id);

-- Add exam IDs array
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS exam_ids JSONB DEFAULT '[]'::jsonb;

-- Add custom availability override
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS custom_availability JSONB;
-- Structure: {
--   "weekdays": ["mon", "tue", "wed", "thu", "fri"],
--   "time_slots": [{"start": "08:00", "end": "17:00", "slots_per_hour": 4}],
--   "blocked_dates": ["2025-12-25", "2026-01-01"],
--   "special_dates": {"2025-12-24": {"start": "08:00", "end": "12:00"}}
-- }

-- Add email template reference
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS email_template_invite_id TEXT REFERENCES email_templates(id);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS email_template_reminder_id TEXT REFERENCES email_templates(id);

-- Add campaign scheduling constraints
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deadline_date TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_bookings_per_day INTEGER;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_bookings_per_slot INTEGER DEFAULT 1;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS allow_reschedule BOOLEAN DEFAULT true;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS max_reschedules INTEGER DEFAULT 2;

-- Add custom fields configuration
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;
-- Structure: [
--   {"name": "matricula", "label": "Matrícula", "type": "text", "required": true},
--   {"name": "setor", "label": "Setor", "type": "select", "options": ["RH", "TI", "Vendas"]}
-- ]

-- Add notification settings
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "email_enabled": true,
  "sms_enabled": false,
  "whatsapp_enabled": false,
  "reminder_hours_before": [24, 2],
  "admin_notifications": true
}'::jsonb;

-- Add tracking fields
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_invited INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_scheduled INTEGER DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_completed INTEGER DEFAULT 0;

-- Add creator/owner
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- =====================================================
-- CAMPAIGN RECIPIENTS TABLE UPDATES
-- =====================================================

-- Add custom field data
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- Add tracking timestamps
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS opened_email_at TIMESTAMPTZ;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS clicked_link_at TIMESTAMPTZ;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE campaign_recipients ADD COLUMN IF NOT EXISTS rescheduled_count INTEGER DEFAULT 0;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at for clinics
CREATE OR REPLACE FUNCTION update_clinics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_clinics_updated_at
  BEFORE UPDATE ON clinics
  FOR EACH ROW
  EXECUTE FUNCTION update_clinics_updated_at();

-- Update updated_at for exams
CREATE OR REPLACE FUNCTION update_exams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW
  EXECUTE FUNCTION update_exams_updated_at();

-- Update updated_at for email_templates
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default exams
INSERT INTO exams (name, code, description, duration_minutes, category, requires_fasting) VALUES
  ('Exame Clínico Ocupacional', 'ASO', 'Avaliação médica completa incluindo anamnese e exame físico', 30, 'Clínico', false),
  ('Audiometria', 'AUDIO', 'Exame de audição ocupacional', 20, 'Complementar', false),
  ('Acuidade Visual', 'VISUAL', 'Teste de acuidade visual com e sem correção', 15, 'Complementar', false),
  ('Eletrocardiograma', 'ECG', 'Eletrocardiograma de repouso', 15, 'Complementar', false),
  ('Raio-X de Tórax', 'RX-TORAX', 'Radiografia de tórax PA e perfil', 15, 'Imagem', false),
  ('Espirometria', 'ESPIRO', 'Avaliação da função pulmonar', 20, 'Complementar', false),
  ('Hemograma Completo', 'HEMOGRAMA', 'Análise completa das células sanguíneas', 5, 'Laboratorial', true),
  ('Glicemia de Jejum', 'GLICEMIA', 'Dosagem de glicose no sangue', 5, 'Laboratorial', true),
  ('Colesterol Total e Frações', 'COLESTEROL', 'Perfil lipídico completo', 5, 'Laboratorial', true),
  ('TGO/TGP', 'TGO-TGP', 'Enzimas hepáticas', 5, 'Laboratorial', true)
ON CONFLICT (code) DO NOTHING;

-- Insert default email templates
INSERT INTO email_templates (name, type, subject, body_html, body_text, is_default) VALUES
  (
    'Convite de Agendamento - Padrão',
    'invite',
    'Convocação para Exame Ocupacional - {empresa}',
    '<html><body><h2>Olá, {nome}!</h2><p>Você foi convocado(a) para realizar exame ocupacional.</p><p><strong>Empresa:</strong> {empresa}<br><strong>Local:</strong> {local}<br><strong>Prazo para agendamento:</strong> {data_limite}</p><p>Clique no link abaixo para escolher o melhor horário:</p><p><a href="{link_agendamento}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Agendar Agora</a></p><p><strong>Exames incluídos:</strong><br>{exames}</p><p>Em caso de dúvidas, entre em contato.</p></body></html>',
    'Olá, {nome}!\n\nVocê foi convocado(a) para realizar exame ocupacional.\n\nEmpresa: {empresa}\nLocal: {local}\nPrazo: {data_limite}\n\nAcesse: {link_agendamento}\n\nExames: {exames}',
    true
  ),
  (
    'Confirmação de Agendamento',
    'confirmation',
    'Agendamento Confirmado - {empresa}',
    '<html><body><h2>Agendamento Confirmado!</h2><p>Olá, {nome}!</p><p>Seu agendamento foi confirmado com sucesso.</p><p><strong>Data:</strong> {data}<br><strong>Horário:</strong> {hora}<br><strong>Local:</strong> {local}</p><p>Por favor, chegue com 10 minutos de antecedência.</p></body></html>',
    'Agendamento Confirmado!\n\nData: {data}\nHorário: {hora}\nLocal: {local}\n\nChegue com 10 minutos de antecedência.',
    true
  ),
  (
    'Lembrete 24h Antes',
    'reminder',
    'Lembrete: Exame Amanhã - {empresa}',
    '<html><body><h2>Lembrete de Exame</h2><p>Olá, {nome}!</p><p>Seu exame ocupacional está agendado para <strong>amanhã</strong>.</p><p><strong>Data:</strong> {data}<br><strong>Horário:</strong> {hora}<br><strong>Local:</strong> {local}</p><p>Não esqueça!</p></body></html>',
    'Lembrete: Seu exame é amanhã!\n\nData: {data}\nHorário: {hora}\nLocal: {local}',
    true
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE clinics IS 'Clínicas e unidades de atendimento para exames ocupacionais';
COMMENT ON TABLE exams IS 'Catálogo de exames e procedimentos ocupacionais';
COMMENT ON TABLE email_templates IS 'Templates de email para comunicação com candidatos';

COMMENT ON COLUMN campaigns.custom_availability IS 'Configuração de disponibilidade personalizada que sobrescreve a disponibilidade padrão do evento';
COMMENT ON COLUMN campaigns.custom_fields IS 'Campos adicionais a serem coletados dos candidatos nesta campanha';
COMMENT ON COLUMN campaigns.notification_settings IS 'Configurações de notificações por email, SMS e WhatsApp';
