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

// Create client with explicit options to prevent auth from blocking queries
export const supabase = createClient(urlToUse, keyToUse, {
  auth: {
    // Don't persist session in storage (prevents stale session issues)
    persistSession: true,
    // Auto refresh token
    autoRefreshToken: true,
    // Detect session from URL (for OAuth callbacks)
    detectSessionInUrl: true,
    // Storage key
    storageKey: 'nexus-auth',
  },
  global: {
    // Add headers for debugging
    headers: {
      'x-client-info': 'nexus-agenda/1.0.0'
    }
  },
  // Disable realtime by default (can cause connection issues)
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
});

// ANONYMOUS CLIENT - For public pages that don't need auth
// This client has NO auth session management, so queries run immediately
export const supabaseAnon = createClient(urlToUse, keyToUse, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-client-info': 'nexus-agenda-anon/1.0.0'
    }
  }
});

// Log client initialization status
console.log('[Supabase] Client initialized with URL:', urlToUse.substring(0, 30) + '...');

// Função auxiliar para verificar se as chaves foram configuradas
export const isSupabaseConfigured = (): boolean => {
  if (!isConfigValid()) {
    // Only warn in development
    if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development') {
      console.warn('⚠️ Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local');
    }
    return false;
  }
  return true;
};
