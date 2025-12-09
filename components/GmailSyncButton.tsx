import React, { useState } from 'react';
import { Icons } from './Icons';
import { toast } from 'sonner';
import { supabase } from '../services/supabaseClient';

interface GmailSyncButtonProps {
    onSuccess?: () => void;
}

export const GmailSyncButton: React.FC<GmailSyncButtonProps> = ({ onSuccess }) => {
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = async () => {
        setIsConnecting(true);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            toast.error('Você precisa estar logado para conectar o Gmail');
            setIsConnecting(false);
            return;
        }

        // Google OAuth configuration
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-oauth-callback`;
        const scope = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email';

        if (!clientId) {
            toast.error('Google Client ID não configurado');
            setIsConnecting(false);
            return;
        }

        // Build state parameter with user_id
        const state = encodeURIComponent(JSON.stringify({ user_id: user.id }));

        // Build OAuth URL
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', scope);
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
        authUrl.searchParams.set('state', state); // ⭐ ADICIONADO: state com user_id

        // Open popup window for OAuth
        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const popup = window.open(
            authUrl.toString(),
            'Gmail OAuth',
            `width=${width},height=${height},left=${left},top=${top}`
        );

        // Poll for window close
        const pollTimer = setInterval(() => {
            if (popup?.closed) {
                clearInterval(pollTimer);
                setIsConnecting(false);
                toast.success('Gmail conectado com sucesso!');
                onSuccess?.();
            }
        }, 500);
    };

    return (
        <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isConnecting ? (
                <Icons.Loader2 size={20} className="text-indigo-600 animate-spin" />
            ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                </svg>
            )}
            <span className="font-medium text-slate-700">
                {isConnecting ? 'Conectando...' : 'Conectar Gmail'}
            </span>
        </button>
    );
};
