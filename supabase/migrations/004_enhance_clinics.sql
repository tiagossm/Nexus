-- Migration to enhance clinics table with professional data
ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS corporate_name text, -- Razão Social
ADD COLUMN IF NOT EXISTS technical_responsible jsonb DEFAULT '{"name": "", "council_id": "", "council_type": "CRM", "uf": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS facilities text[] DEFAULT '{}', -- Array of strings: ['Estacionamento', 'Acessibilidade', 'Wifi']
ADD COLUMN IF NOT EXISTS offered_exams text[] DEFAULT '{}', -- Array of Exam IDs that this clinic performs
ADD COLUMN IF NOT EXISTS cnae_code text,
ADD COLUMN IF NOT EXISTS cnae_description text;

-- Add index for CNPJ for faster lookups
CREATE INDEX IF NOT EXISTS idx_clinics_cnpj ON clinics(cnpj);

-- Comment on columns
COMMENT ON COLUMN clinics.corporate_name IS 'Razão Social da empresa';
COMMENT ON COLUMN clinics.technical_responsible IS 'Dados do responsável técnico (Médico/Coordenador)';
COMMENT ON COLUMN clinics.offered_exams IS 'Lista de IDs dos exames que a clínica realiza';
