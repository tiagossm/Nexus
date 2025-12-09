import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
// Configure as variáveis de ambiente no arquivo .env.local
// Veja .env.example para referência

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// --------------------------------

// Validação de URL
const isValidUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Validação de configuração
const isConfigValid = (): boolean => {
  return isValidUrl(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;
};

// Se não configurado, usa placeholder para evitar crash
const urlToUse = isValidUrl(SUPABASE_URL) ? SUPABASE_URL : 'https://placeholder.supabase.co';
const keyToUse = SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(urlToUse, keyToUse);

// Função auxiliar para verificar se as chaves foram configuradas
export const isSupabaseConfigured = (): boolean => {
  if (!isConfigValid()) {
    // Only warn in development
    if (import.meta.env.MODE === 'development') {
      console.warn('⚠️ Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local');
    }
    return false;
  }
  return true;
};
