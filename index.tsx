import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard } from './components/AuthGuard';

// Clear potentially corrupted Supabase session cache on load
// This prevents the infinite loading issue caused by stale tokens
const clearStaleCache = () => {
  const supabaseKeys = Object.keys(localStorage).filter(key =>
    key.startsWith('sb-') || key.includes('supabase')
  );

  // Check for stale session (older than 1 hour without refresh)
  const lastClear = localStorage.getItem('nexus_cache_cleared');
  const now = Date.now();

  if (!lastClear || (now - parseInt(lastClear)) > 3600000) {
    // Clear Supabase cache to force fresh session
    supabaseKeys.forEach(key => {
      console.log('[Cache] Clearing stale key:', key);
      localStorage.removeItem(key);
    });
    localStorage.setItem('nexus_cache_cleared', now.toString());
    console.log('[Cache] Cleared stale session data');
  }
};

// Run cache clear before app loads
clearStaleCache();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AuthGuard>
        <App />
      </AuthGuard>
    </AuthProvider>
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={4000}
    />
  </React.StrictMode>
);