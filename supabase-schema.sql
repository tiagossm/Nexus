-- ============================================
-- NEXUS AGENDA - Supabase Database Schema
-- ============================================
-- Execute este script no SQL Editor do Supabase
-- https://supabase.com/dashboard/project/hxbleqzpwwaqvpqkxhmq/sql

-- 1. EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  duration INTEGER NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('One-on-One', 'Group')),
  active BOOLEAN DEFAULT true,
  color TEXT NOT NULL,
  url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para melhorar performance de queries ordenadas
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- 2. CONTACTS TABLE
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  cpf TEXT,
  phone TEXT,
  age INTEGER,
  status TEXT DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Convidado', 'Agendado')),
  invite_count INTEGER DEFAULT 0,
  last_invite_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca por email (usado na integração circular)
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);

-- 3. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes para melhorar queries
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(client_email);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);

-- 4. SINGLE USE LINKS TABLE
CREATE TABLE IF NOT EXISTS single_use_links (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  event_title TEXT NOT NULL,
  url TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_single_use_links_created_at ON single_use_links(created_at DESC);

-- 5. POLLS TABLE
CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  duration INTEGER NOT NULL,
  location TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled')),
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) - OPCIONAL
-- ============================================
-- Descomente se quiser habilitar segurança por usuário
-- Caso contrário, certifique-se de usar a service_role key apenas no backend

-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE single_use_links ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DADOS DE TESTE (OPCIONAL)
-- ============================================
-- Descomente para inserir alguns dados de exemplo

/*
INSERT INTO events (id, title, duration, location, type, active, color, url, description) VALUES
  ('1', 'Discovery Call', 30, 'Google Meet', 'One-on-One', true, '#6366f1', 'https://nexus.com/discovery-call', 'Reunião inicial para entender as necessidades do projeto.'),
  ('2', 'Consultoria Estratégica', 60, 'Zoom', 'One-on-One', true, '#8b5cf6', 'https://nexus.com/consultoria', 'Sessão aprofundada de planejamento.');

INSERT INTO contacts (name, email, cpf, phone, age, status) VALUES
  ('Ana Clara', 'ana@teste.com', '123.456.789-00', '11999999999', 28, 'Pendente'),
  ('Carlos Silva', 'carlos@teste.com', '321.654.987-00', '21988888888', 35, 'Agendado');
*/

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Verifique se as tabelas foram criadas corretamente:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('events', 'contacts', 'bookings', 'single_use_links', 'polls');
