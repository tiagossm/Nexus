-- ============================================
-- SPRINT 4: CORE SCHEDULING - AVAILABILITY
-- ============================================

-- 0. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. AVAILABILITY RULES (Horários disponíveis por dia da semana)
CREATE TABLE IF NOT EXISTS availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'default_user', -- Multi-user support futuro
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Domingo, 6=Sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Garante que não há sobreposição de horários no mesmo dia
  CONSTRAINT no_overlap EXCLUDE USING gist (
    user_id WITH =,
    day_of_week WITH =,
    int4range(
      (EXTRACT(EPOCH FROM start_time)::integer),
      (EXTRACT(EPOCH FROM end_time)::integer)
    ) WITH &&
  ) WHERE (is_available = true)
);

-- Index para busca rápida
CREATE INDEX IF NOT EXISTS idx_availability_rules_day ON availability_rules(day_of_week, is_available);

-- 2. AVAILABILITY EXCEPTIONS (Férias, feriados, bloqueios pontuais)
CREATE TABLE IF NOT EXISTS availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'default_user',
  exception_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT false, -- false = bloqueio total do dia
  reason TEXT, -- "Férias", "Feriado", etc
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_availability_exceptions_date ON availability_exceptions(exception_date);

-- 3. EVENT SETTINGS (Configurações avançadas por evento)
-- Adiciona colunas à tabela events existente
ALTER TABLE events ADD COLUMN IF NOT EXISTS buffer_before INTEGER DEFAULT 0; -- minutos
ALTER TABLE events ADD COLUMN IF NOT EXISTS buffer_after INTEGER DEFAULT 0; -- minutos
ALTER TABLE events ADD COLUMN IF NOT EXISTS min_notice_hours INTEGER DEFAULT 0; -- antecedência mínima
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_bookings_per_day INTEGER; -- limite diário
ALTER TABLE events ADD COLUMN IF NOT EXISTS booking_window_days INTEGER DEFAULT 60; -- janela de agendamento

-- 4. FUNÇÃO: Check se um slot está livre
CREATE OR REPLACE FUNCTION is_slot_available(
  p_event_id TEXT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_conflict_count INTEGER;
  v_exception_blocked BOOLEAN;
  v_daily_count INTEGER;
  v_max_daily INTEGER;
BEGIN
  -- 1. Check dia da semana tem disponibilidade configurada
  v_day_of_week := EXTRACT(DOW FROM p_start_time);
  
  IF NOT EXISTS (
    SELECT 1 FROM availability_rules
    WHERE day_of_week = v_day_of_week
      AND is_available = true
      AND start_time <= p_start_time::TIME
      AND end_time >= p_end_time::TIME
  ) THEN
    RETURN FALSE;
  END IF;

  -- 2. Check exceptions (férias, feriados)
  SELECT is_available INTO v_exception_blocked
  FROM availability_exceptions
  WHERE exception_date = p_start_time::DATE
    AND (start_time IS NULL OR (start_time <= p_start_time::TIME AND end_time >= p_end_time::TIME));
  
  IF v_exception_blocked = FALSE THEN
    RETURN FALSE;
  END IF;

  -- 3. Check conflitos com bookings existentes (incluindo buffers)
  SELECT COUNT(*) INTO v_conflict_count
  FROM bookings b
  JOIN events e ON b.event_id = e.id
  WHERE (
    -- Overlap simples
    (b.start_time < p_end_time AND b.end_time > p_start_time)
    OR
    -- Overlap considerando buffers
    (b.start_time - INTERVAL '1 minute' * COALESCE(e.buffer_before, 0) < p_end_time AND
     b.end_time + INTERVAL '1 minute' * COALESCE(e.buffer_after, 0) > p_start_time)
  );
  
  IF v_conflict_count > 0 THEN
    RETURN FALSE;
  END IF;

  -- 4. Check limite de agendamentos por dia
  SELECT max_bookings_per_day INTO v_max_daily
  FROM events
  WHERE id = p_event_id;

  IF v_max_daily IS NOT NULL THEN
    SELECT COUNT(*) INTO v_daily_count
    FROM bookings
    WHERE event_id = p_event_id
      AND DATE(start_time) = DATE(p_start_time);
    
    IF v_daily_count >= v_max_daily THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Tudo OK!
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. DADOS INICIAIS - Disponibilidade padrão (Seg-Sex 9h-17h)
INSERT INTO availability_rules (day_of_week, start_time, end_time, is_available)
VALUES
  (1, '09:00', '17:00', true), -- Segunda
  (2, '09:00', '17:00', true), -- Terça
  (3, '09:00', '17:00', true), -- Quarta
  (4, '09:00', '17:00', true), -- Quinta
  (5, '09:00', '17:00', true)  -- Sexta
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Testa a função
SELECT is_slot_available(
  '1',
  NOW() + INTERVAL '1 day' + INTERVAL '10 hours',
  NOW() + INTERVAL '1 day' + INTERVAL '10 hours 30 minutes'
);
