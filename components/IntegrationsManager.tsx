import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import { googleCalendarService } from '../services/googleCalendarService';
import { GmailSyncButton } from './GmailSyncButton';

interface Integration {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    connected: boolean;
    comingSoon?: boolean;
}

export const IntegrationsManager: React.FC = () => {
    const [integrations, setIntegrations] = useState<Integration[]>([
        {
            id: 'gmail_email',
            name: 'Gmail (Envio de Emails)',
            description: 'Envie emails diretamente da sua conta Gmail. Os emails saem da sua caixa e usam seus próprios limites.',
            icon: <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100"><img src="https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_48dp.png" alt="Gmail" className="w-6 h-6" /></div>,
            connected: false
        },
        {
            id: 'google_calendar',
            name: 'Google Calendar',
            description: 'Sincronize seus agendamentos e evite conflitos verificando sua disponibilidade.',
            icon: <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100"><img src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png" alt="Google Calendar" className="w-6 h-6" /></div>,
            connected: false
        },
        {
            id: 'google_meet',
            name: 'Google Meet',
            description: 'Gere links de videoconferência automaticamente para cada agendamento.',
            icon: <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100"><img src="https://www.gstatic.com/images/branding/product/1x/meet_2020q4_48dp.png" alt="Google Meet" className="w-6 h-6" /></div>,
            connected: false
        },
        {
            id: 'zoom',
            name: 'Zoom',
            description: 'Integração nativa com Zoom para criar salas de reunião.',
            icon: <div className="w-10 h-10 bg-[#2D8CFF] rounded-full flex items-center justify-center shadow-sm"><Icons.Video className="text-white" size={20} /></div>,
            connected: false,
            comingSoon: true
        },
        {
            id: 'stripe',
            name: 'Stripe',
            description: 'Cobre pagamentos pelos seus agendamentos diretamente no fluxo.',
            icon: <div className="w-10 h-10 bg-[#635BFF] rounded-full flex items-center justify-center shadow-sm"><Icons.Zap className="text-white" size={20} /></div>,
            connected: false,
            comingSoon: true
        }
    ]);

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.provider_token) {
            console.log('Google Token detected:', session.provider_token);
            setIntegrations(prev => prev.map(i =>
                i.id === 'google_calendar' ? { ...i, connected: true } : i
            ));
        }

        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.warn('No authenticated user');
            return;
        }

        // Check Gmail email account with real user_id
        const { data: gmailAccounts } = await supabase
            .from('user_email_accounts')
            .select('*')
            .eq('user_id', user.id) // ⭐ CORRIGIDO: Usar user.id real
            .eq('provider', 'gmail')
            .eq('is_active', true);

        if (gmailAccounts && gmailAccounts.length > 0) {
            console.log('✅ Gmail account found:', gmailAccounts[0].email);
            setIntegrations(prev => prev.map(i =>
                i.id === 'gmail_email' ? { ...i, connected: true } : i
            ));
        } else {
            console.log('⚠️ No Gmail account found for user:', user.id);
        }
    };

    const handleConnect = async (id: string) => {
        if (!isSupabaseConfigured()) {
            alert('Configure o Supabase para habilitar integrações.');
            return;
        }

        if (id === 'google_calendar') {
            try {
                await googleCalendarService.connect();
            } catch (error) {
                console.error('Erro ao conectar Google Calendar:', error);
                alert('Erro ao iniciar conexão. Verifique o console.');
            }
        }
        // Gmail is handled by GmailSyncButton
    };

    const handleDisconnect = async (id: string) => {
        if (id === 'gmail_email') {
            const { error } = await supabase
                .from('user_email_accounts')
                .update({ is_active: false })
                .eq('user_id', 'default_user')
                .eq('provider', 'gmail');

            if (!error) {
                setIntegrations(prev => prev.map(i =>
                    i.id === 'gmail_email' ? { ...i, connected: false } : i
                ));
            }
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Integrações</h2>
                <p className="text-slate-600">Conecte suas ferramentas favoritas para automatizar seu fluxo de trabalho.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {integrations.map((integration) => (
                    <div
                        key={integration.id}
                        className={`
              bg-white border rounded-xl p-6 flex flex-col transition-all
              ${integration.connected ? 'border-green-200 bg-green-50/30' : 'border-slate-200 hover:border-indigo-200 hover:shadow-md'}
            `}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                                {integration.icon}
                                <div>
                                    <h3 className="font-bold text-slate-900">{integration.name}</h3>
                                    {integration.connected && (
                                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit mt-1">
                                            <Icons.Check size={10} /> Conectado
                                        </span>
                                    )}
                                    {integration.comingSoon && (
                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                                            Em breve
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <p className="text-sm text-slate-600 mb-6 flex-1">
                            {integration.description}
                        </p>

                        {integration.id === 'gmail_email' && !integration.connected ? (
                            <GmailSyncButton onSuccess={checkConnection} />
                        ) : (
                            <button
                                onClick={() => integration.connected ? handleDisconnect(integration.id) : handleConnect(integration.id)}
                                disabled={integration.comingSoon}
                                className={`
                    w-full py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2
                    ${integration.connected
                                        ? 'bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200'
                                        : integration.comingSoon
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10'
                                    }
                  `}
                            >
                                {integration.connected ? (
                                    <>Desconectar</>
                                ) : integration.comingSoon ? (
                                    <>Indisponível</>
                                ) : (
                                    <>Conectar</>
                                )}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
