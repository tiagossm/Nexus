import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { BookingModal } from './BookingModal';
import { EventType } from '../types';
import { campaignService } from '../services/campaignService';
import { getRecipient } from '../services/campaignRecipientService';
import { getEvents } from '../services/supabaseService';

import { IdentityGate } from './IdentityGate';

interface PublicBookingPageProps {
    recipientId: string;
}

export const PublicBookingPage: React.FC<PublicBookingPageProps> = ({ recipientId }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [event, setEvent] = useState<EventType | null>(null);
    const [recipientData, setRecipientData] = useState<any>(null);
    const [campaignData, setCampaignData] = useState<any>(null);
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        loadBookingData();
    }, [recipientId]);

    const loadBookingData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch recipient data
            const recipient = await getRecipient(recipientId);
            if (!recipient) {
                setError('Link de agendamento inválido ou expirado.');
                return;
            }

            setRecipientData(recipient);
            console.log('👤 Recipient Data Loaded:', recipient);

            // Track click - update status if not already clicked/booked
            if (recipient.status === 'sent' || recipient.status === 'opened' || recipient.status === 'pending') {
                try {
                    await campaignService.updateRecipientStatus(recipientId, 'clicked');
                    console.log('✅ Click tracked for recipient:', recipientId);
                } catch (err) {
                    console.error('Failed to track click:', err);
                }
            }

            // 2. Fetch campaign data
            const campaign = await campaignService.getCampaign(recipient.campaign_id);
            if (!campaign) {
                setError('Campanha não encontrada.');
                return;
            }

            setCampaignData(campaign);

            // 3. Fetch event type (if campaign has one)
            let finalEvent: EventType;

            if (campaign.event_type_id) {
                const events = await getEvents();
                const eventType = events.find(e => e.id === campaign.event_type_id);

                if (eventType) {
                    console.log('✅ Found event type:', eventType.title);
                    console.log('📝 Campaign availability config:', campaign.custom_availability);
                    finalEvent = {
                        ...eventType,
                        custom_availability: campaign.custom_availability || eventType.custom_availability
                    };
                } else {
                    // Fallback if event type not found
                    console.warn('Event type not found, creating default from campaign');
                    finalEvent = {
                        id: campaign.id,
                        title: campaign.title || 'Agendamento',
                        duration: campaign.custom_availability?.duration || 60, // Read from campaign config
                        location: 'A definir',
                        type: 'One-on-One',
                        active: true,
                        color: '#6366f1',
                        url: '',
                        description: campaign.description || '',
                        custom_availability: campaign.custom_availability
                    };
                }
            } else {
                // Create a default event from campaign data
                finalEvent = {
                    id: campaign.id,
                    title: campaign.title || 'Agendamento',
                    duration: campaign.custom_availability?.duration || 60, // Read from campaign config
                    location: 'A definir',
                    type: 'One-on-One',
                    active: true,
                    color: '#6366f1',
                    url: '',
                    description: campaign.description || '',
                    custom_availability: campaign.custom_availability
                };
            }

            setEvent(finalEvent);

        } catch (err) {
            console.error('Erro ao carregar dados de agendamento:', err);
            setError('Erro ao carregar informações. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Carregando informações...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.AlertCircle size={32} className="text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Ops!</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <a
                        href="/"
                        className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all"
                    >
                        Voltar ao início
                    </a>
                </div>
            </div>
        );
    }

    // Security Gate for forwarded links
    if (recipientId && !isVerified) {
        if (!recipientData) return null;

        // Access email from contacts relation (plural, as per Supabase join naming)
        const securityEmail = (recipientData.contacts as any)?.email || recipientData.email;

        console.log('🔒 Gate Check (Forced):', { recipientId, securityEmail, fullData: recipientData });

        return (
            <IdentityGate
                recipientEmail={securityEmail}
                onVerified={() => setIsVerified(true)}
            />
        );
    }

    if (!event) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                            <Icons.Calendar size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                {campaignData?.company?.name || campaignData?.title || 'Agendamento'}
                            </h1>
                            <p className="text-sm text-slate-500">
                                {campaignData?.company?.name ? (
                                    <span>Convocação de <strong>{campaignData.company.name}</strong> para {recipientData?.contacts?.name || 'você'}</span>
                                ) : (
                                    <span>Olá, {recipientData?.contacts?.name || 'Paciente'}! Agende seu horário.</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Campaign Info */}
            {campaignData?.description && (
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-start gap-3">
                            <Icons.Info size={20} className="text-indigo-600 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-1">Sobre esta campanha</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    {campaignData.description}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Booking Modal (always open) */}
            {event && (
                <BookingModal
                    event={event}
                    onClose={() => {
                        // Redirect to success page or home
                        window.location.href = '/';
                    }}
                    prefillData={{
                        name: recipientData?.contacts?.name || '',
                        email: recipientData?.contacts?.email || ''
                    }}
                    recipientId={recipientId}
                    campaignId={campaignData?.id}
                    contactId={recipientData?.contact_id}
                    customFields={campaignData?.custom_fields}
                />
            )}
        </div>
    );
};
