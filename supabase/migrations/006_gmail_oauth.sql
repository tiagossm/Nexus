-- ============================================
-- Gmail OAuth Integration - Email Accounts
-- ============================================

-- Create table for storing user email accounts and OAuth tokens
CREATE TABLE IF NOT EXISTS user_email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'default_user', -- Multi-user support futuro
  email TEXT NOT NULL,
  provider TEXT DEFAULT 'gmail' CHECK (provider IN ('gmail', 'outlook', 'resend')),
  
  -- OAuth tokens (serão criptografados via RLS policies)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false, -- Conta principal para envio
  
  -- Metadata
  scopes TEXT[], -- Escopos OAuth concedidos
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(user_id, email)
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_user_email_accounts_user_id ON user_email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_accounts_active ON user_email_accounts(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_email_accounts_primary ON user_email_accounts(user_id, is_primary) WHERE is_primary = true;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_email_accounts_updated_at
  BEFORE UPDATE ON user_email_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE user_email_accounts IS 'Armazena contas de email dos usuários com credenciais OAuth';
COMMENT ON COLUMN user_email_accounts.access_token IS 'Token de acesso OAuth (deve ser criptografado)';
COMMENT ON COLUMN user_email_accounts.refresh_token IS 'Token de refresh OAuth (deve ser criptografado)';
COMMENT ON COLUMN user_email_accounts.is_primary IS 'Indica se esta é a conta principal para envio de emails';
COMMENT ON COLUMN user_email_accounts.scopes IS 'Escopos OAuth concedidos pelo usuário';
