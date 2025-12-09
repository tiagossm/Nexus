import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from './Icons';
import { Campaign, campaignService, CampaignRecipient } from '../services/campaignService';
import * as campaignRecipientService from '../services/campaignRecipientService';
import * as messageTemplateService from '../services/messageTemplateService';
import { campaignBookingService, CampaignBooking } from '../services/campaignBookingService';
import { MessageTemplate } from '../types';
import { emailService } from '../services/emailService';
import { clinicService, Clinic } from '../services/clinicService';
import { companyService } from '../services/companyService';
import { Company } from '../types';
import { examService, Exam } from '../services/examService';
import { trackingService, CampaignAnalytics } from '../services/trackingService';
import { replaceTemplateVariables, buildEmailVariables, ensureHtmlFormatting, wrapInEmailTemplate } from '../utils/templateUtils';
import { toast } from 'sonner';
import { AddRecipientsModal } from './AddRecipientsModal';
import { CampaignScheduleModal } from './CampaignScheduleModal';
import { CampaignMetricsCard } from './ChannelSelector';
import { EditCampaignMessageModal } from './EditCampaignMessageModal';

interface CampaignDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: Campaign | null;
    onEdit: (campaign: Campaign) => void;
}

type TabType = 'recipients' | 'booked' | 'message' | 'metrics' | 'settings';

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    pending: { label: 'Pendente', color: 'text-amber-700', bg: 'bg-amber-100', icon: '🟡' },
    sent: { label: 'Enviado', color: 'text-blue-700', bg: 'bg-blue-100', icon: '📤' },
    opened: { label: 'Aberto', color: 'text-purple-700', bg: 'bg-purple-100', icon: '👁️' },
    clicked: { label: 'Clicou', color: 'text-indigo-700', bg: 'bg-indigo-100', icon: '🖱️' },
    booked: { label: 'Agendado', color: 'text-green-700', bg: 'bg-green-100', icon: '✅' }
};

export const CampaignDetailsModal: React.FC<CampaignDetailsModalProps> = ({
    isOpen,
    onClose,
    campaign,
    onEdit
}) => {
    const [loading, setLoading] = useState(true);
    const [clinic, setClinic] = useState<Clinic | null>(null);
    const [exams, setExams] = useState<Exam[]>([]);
    const [company, setCompany] = useState<Company | null>(null);
    const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
    const [bookings, setBookings] = useState<CampaignBooking[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
    const [sending, setSending] = useState(false);
    const [showAddRecipientsModal, setShowAddRecipientsModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showEditMessageModal, setShowEditMessageModal] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('recipients');
    const [selectedChannel, setSelectedChannel] = useState<'email' | 'whatsapp' | 'sms'>('email');

    // Recipients state
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showConfirmRemove, setShowConfirmRemove] = useState<string | null>(null);

    // Template state
    const [activeTemplate, setActiveTemplate] = useState<MessageTemplate | null>(null);

    useEffect(() => {
        if (isOpen && campaign) {
            loadDetails();
        }
    }, [isOpen, campaign]);

    const loadDetails = async () => {
        if (!campaign) return;

        try {
            setLoading(true);

            // Load clinic if exists
            if (campaign.clinic_id) {
                const clinicData = await clinicService.getClinic(campaign.clinic_id);
                setClinic(clinicData);
            }

            // Load company if exists (for branding)
            if ((campaign as any).company_id) {
                try {
                    const companyData = await companyService.getCompanyById((campaign as any).company_id);
                    setCompany(companyData);
                } catch (err) {
                    console.log('Company not found or error loading');
                }
            }

            // Load exams if exist
            if (campaign.exam_ids && campaign.exam_ids.length > 0) {
                const allExams = await examService.getExams();
                const campaignExams = allExams.filter(e => campaign.exam_ids?.includes(e.id));
                setExams(campaignExams);
            }

            // Load template if exists
            if (campaign.email_template_invite_id) {
                try {
                    const template = await messageTemplateService.getTemplateById(campaign.email_template_invite_id);
                    setActiveTemplate(template);
                } catch (e) {
                    console.log('Template not found');
                }
            }

            // Load recipients, stats, analytics, and bookings
            const [recipientsData, statsData, analyticsData, bookingsData] = await Promise.all([
                campaignService.getRecipients(campaign.id),
                campaignService.getCampaignStats(campaign.id),
                trackingService.getCampaignAnalytics(campaign.id),
                campaignBookingService.getBookingsByCampaign(campaign.id)
            ]);

            setRecipients(recipientsData);
            setStats(statsData);
            setAnalytics(analyticsData);
            setBookings(bookingsData);

        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter recipients
    const filteredRecipients = useMemo(() => {
        return recipients.filter(r => {
            const contact = r.contact || (r as any).contacts;
            const matchesSearch = search === '' ||
                contact?.name?.toLowerCase().includes(search.toLowerCase()) ||
                contact?.email?.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [recipients, search, statusFilter]);

    // Status counts - use stats from getCampaignStats for tracking metrics
    const statusCounts = useMemo(() => {
        // Start with recipient-based counts
        const counts: Record<string, number> = { all: recipients.length, pending: 0, sent: 0, opened: 0, clicked: 0, booked: 0 };
        recipients.forEach(r => {
            counts[r.status] = (counts[r.status] || 0) + 1;
        });

        // Override with stats from database if available (these are updated by tracking triggers)
        if (stats) {
            counts.sent = stats.sent || counts.sent;
            counts.opened = stats.opened || 0;
            counts.clicked = stats.clicked || 0;
            counts.pending = stats.pending ?? counts.pending;
            counts.booked = stats.booked ?? counts.booked;
        }

        return counts;
    }, [recipients, stats]);

    // Get message preview
    const messagePreview = useMemo(() => {
        if (campaign?.invite_message?.body) {
            return {
                subject: campaign.invite_message.subject || 'Sem assunto',
                body: campaign.invite_message.body,
                source: 'Mensagem Personalizada'
            };
        }
        if (activeTemplate) {
            return {
                subject: activeTemplate.subject || 'Sem assunto',
                body: activeTemplate.html_body || activeTemplate.body,
                source: `Template: ${activeTemplate.name}`
            };
        }
        return null;
    }, [campaign, activeTemplate]);

    // Selection handlers
    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const selectAll = () => {
        if (selectedIds.size === filteredRecipients.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredRecipients.map(r => r.id)));
        }
    };

    const handleRemove = async (recipientId: string) => {
        try {
            await campaignRecipientService.removeRecipientFromCampaign(recipientId);
            toast.success('Destinatário removido');
            setRecipients(prev => prev.filter(r => r.id !== recipientId));
            setShowConfirmRemove(null);
        } catch (error) {
            console.error('Erro ao remover:', error);
            toast.error('Erro ao remover destinatário');
        }
    };

    const handleBulkRemove = async () => {
        if (selectedIds.size === 0) return;
        try {
            await campaignRecipientService.bulkRemoveRecipients(Array.from(selectedIds));
            toast.success(`${selectedIds.size} destinatários removidos`);
            setRecipients(prev => prev.filter(r => !selectedIds.has(r.id)));
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Erro ao remover:', error);
            toast.error('Erro ao remover destinatários');
        }
    };

    const handleBulkReset = async () => {
        if (selectedIds.size === 0) return;
        try {
            await campaignRecipientService.bulkResetRecipients(Array.from(selectedIds));
            toast.success(`${selectedIds.size} destinatários resetados para reenvio`);
            loadDetails();
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Erro ao resetar:', error);
            toast.error('Erro ao resetar destinatários');
        }
    };

    const handleSendInvites = async () => {
        if (!campaign) return;

        const hasInviteMessage = campaign?.invite_message?.body;
        const hasLegacyTemplate = campaign?.email_template_invite_id;

        if (!hasInviteMessage && !hasLegacyTemplate) {
            toast.error('Campanha sem mensagem de convite configurada');
            return;
        }

        try {
            setSending(true);

            let messageConfig;
            let template;

            if (hasInviteMessage) {
                messageConfig = {
                    subject: campaign.invite_message?.subject || 'Convite para Exame',
                    body: campaign.invite_message?.body || ''
                };
            } else if (hasLegacyTemplate) {
                try {
                    template = await messageTemplateService.getTemplateById(campaign.email_template_invite_id!);
                    messageConfig = {
                        subject: template.subject || 'Convite',
                        body: template.html_body || template.body
                    };
                } catch (error) {
                    toast.error('Template não encontrado. Configure uma nova mensagem.');
                    setShowEditMessageModal(true);
                    return;
                }
            }

            await campaignRecipientService.sendInvites(
                campaign.id,
                async (email, payload) => {
                    const variables = buildEmailVariables({
                        contact: payload.contact,
                        campaign: campaign,
                        clinic: clinic,
                        exams: exams,
                        recipientId: payload.recipientId
                    });

                    const subject = replaceTemplateVariables(
                        payload.messageConfig.subject,
                        variables,
                        { cleanUnused: true }
                    );
                    let html = replaceTemplateVariables(
                        payload.messageConfig.body,
                        variables,
                        { cleanUnused: true }
                    );

                    html = ensureHtmlFormatting(html);
                    html = wrapInEmailTemplate(html, {
                        companyName: company?.name,
                        primaryColor: company?.primary_color,
                        logoUrl: company?.logo_url,
                        footerText: company?.footer_text,
                        contactEmail: company?.contact_email,
                        contactPhone: company?.contact_phone,
                        websiteUrl: company?.website_url
                    });

                    if (payload.injectTracking) {
                        html = payload.injectTracking(html);
                    }

                    console.log('📧 Sending email:', { to: email, subject });
                    await emailService.sendEmail({ to: email, subject, html });
                },
                messageConfig
            );

            toast.success('Convites enviados com sucesso!');
            loadDetails();
        } catch (error: any) {
            console.error('Erro ao enviar convites:', error);
            toast.error(error.message || 'Erro ao enviar convites');
        } finally {
            setSending(false);
        }
    };

    const handleSendReminder = async (recipientId?: string) => {
        if (!campaign) return;

        try {
            setSending(true);

            let messageConfig;

            if (campaign.reminder_message?.body) {
                messageConfig = {
                    subject: campaign.reminder_message.subject || 'Lembrete: Agende seu Exame',
                    body: campaign.reminder_message.body
                };
            } else if (campaign.invite_message?.body) {
                messageConfig = {
                    subject: campaign.invite_message.subject || 'Lembrete: Agende seu Exame',
                    body: campaign.invite_message.body
                };
            } else if (campaign.email_template_reminder_id || campaign.email_template_invite_id) {
                const templateId = campaign.email_template_reminder_id || campaign.email_template_invite_id;
                try {
                    const template = await messageTemplateService.getTemplateById(templateId!);
                    messageConfig = { subject: template.subject || 'Lembrete', body: template.html_body || template.body };
                } catch {
                    toast.error('Template não encontrado');
                    return;
                }
            }

            const targetRecipients = recipientId
                ? recipients.filter(r => r.id === recipientId)
                : recipients.filter(r => r.status !== 'booked');

            await campaignRecipientService.sendReminders(
                campaign.id,
                targetRecipients.map(r => r.id),
                async (email, payload) => {
                    const variables = buildEmailVariables({
                        contact: payload.contact,
                        campaign: campaign,
                        clinic: clinic,
                        exams: exams,
                        recipientId: payload.recipientId
                    });

                    const subject = replaceTemplateVariables(
                        payload.messageConfig.subject,
                        variables,
                        { cleanUnused: true }
                    );
                    let html = replaceTemplateVariables(
                        payload.messageConfig.body,
                        variables,
                        { cleanUnused: true }
                    );

                    html = ensureHtmlFormatting(html);
                    html = wrapInEmailTemplate(html, {
                        companyName: company?.name,
                        primaryColor: company?.primary_color,
                        logoUrl: company?.logo_url,
                        footerText: company?.footer_text,
                        contactEmail: company?.contact_email,
                        contactPhone: company?.contact_phone,
                        websiteUrl: company?.website_url
                    });

                    if (payload.injectTracking) {
                        html = payload.injectTracking(html);
                    }

                    await emailService.sendEmail({ to: email, subject, html });
                },
                messageConfig
            );

            toast.success(`Lembretes enviados para ${targetRecipients.length} contatos!`);
            loadDetails();
        } catch (error) {
            console.error('Erro ao enviar lembretes:', error);
            toast.error('Erro ao enviar lembretes');
        } finally {
            setSending(false);
        }
    };

    if (!isOpen || !campaign) return null;

    const tabs = [
        { id: 'recipients' as TabType, label: 'Destinatários', icon: Icons.Users, count: recipients.length },
        { id: 'booked' as TabType, label: 'Agendados', icon: Icons.CheckCircle, count: bookings.length },
        { id: 'message' as TabType, label: 'Mensagem', icon: Icons.Mail },
        { id: 'metrics' as TabType, label: 'Métricas', icon: Icons.BarChart2 },
        { id: 'settings' as TabType, label: 'Configurações', icon: Icons.Settings }
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            {/* EXPANDED MODAL */}
            <div className="bg-white rounded-2xl w-full max-w-7xl h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/20 rounded-lg transition-all"
                            >
                                <Icons.ArrowLeft size={20} />
                            </button>
                            <div>
                                <h2 className="text-xl font-bold">{campaign.title}</h2>
                                <div className="flex items-center gap-3 mt-1">
                                    {messagePreview && (
                                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                            📧 {messagePreview.source}
                                        </span>
                                    )}
                                    {clinic && (
                                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                            🏥 {clinic.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowScheduleModal(true)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-all"
                                title="Horários"
                            >
                                <Icons.Calendar size={20} />
                            </button>
                            <button
                                onClick={() => campaign && onEdit(campaign)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-all"
                                title="Editar"
                            >
                                <Icons.Edit size={20} />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/20 rounded-lg transition-all"
                            >
                                <Icons.X size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 border-b border-slate-200 bg-slate-50">
                    <div className="flex gap-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === tab.id
                                    ? 'border-indigo-600 text-indigo-600 bg-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className="px-1.5 py-0.5 bg-slate-200 rounded text-xs">
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Icons.Loader2 size={40} className="text-indigo-600 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* TAB: Destinatários */}
                            {activeTab === 'recipients' && (
                                <div className="p-6">
                                    {/* Message Preview Banner */}
                                    {messagePreview && (
                                        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Icons.Mail size={16} className="text-indigo-600" />
                                                        <span className="text-xs font-medium text-indigo-600 uppercase">
                                                            Mensagem que será enviada
                                                        </span>
                                                    </div>
                                                    <div className="font-semibold text-slate-900 mb-1">
                                                        {messagePreview.subject}
                                                    </div>
                                                    <div className="text-sm text-slate-600 line-clamp-2">
                                                        {(messagePreview.body || '').replace(/<[^>]+>/g, '').substring(0, 200)}...
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setShowEditMessageModal(true)}
                                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all flex items-center gap-1"
                                                >
                                                    <Icons.Edit size={14} />
                                                    Editar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {!messagePreview && (
                                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-amber-700">
                                                    <Icons.AlertTriangle size={20} />
                                                    <span className="font-medium">Nenhuma mensagem configurada</span>
                                                </div>
                                                <button
                                                    onClick={() => setShowEditMessageModal(true)}
                                                    className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-all"
                                                >
                                                    Configurar Mensagem
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Stats Summary */}
                                    <div className="grid grid-cols-5 gap-3 mb-6">
                                        {Object.entries(statusConfig).map(([status, config]) => (
                                            <div
                                                key={status}
                                                onClick={() => setStatusFilter(status === statusFilter ? 'all' : status)}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === status
                                                    ? 'border-indigo-300 bg-indigo-50'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                                    }`}
                                            >
                                                <div className="text-2xl mb-1">{config.icon}</div>
                                                <div className="text-xl font-bold text-slate-900">{statusCounts[status] || 0}</div>
                                                <div className="text-xs text-slate-500">{config.label}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Search and Actions */}
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="relative flex-1">
                                            <Icons.Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                placeholder="Buscar por nome ou email..."
                                                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setShowAddRecipientsModal(true)}
                                            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all flex items-center gap-2"
                                        >
                                            <Icons.Plus size={18} />
                                            Adicionar
                                        </button>
                                    </div>

                                    {/* Bulk Actions */}
                                    {selectedIds.size > 0 && (
                                        <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 mb-4">
                                            <span className="text-sm font-medium text-indigo-700">
                                                {selectedIds.size} selecionado(s)
                                            </span>
                                            <div className="flex-1" />
                                            <button
                                                onClick={handleBulkReset}
                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all flex items-center gap-1"
                                            >
                                                <Icons.RefreshCw size={14} />
                                                Resetar
                                            </button>
                                            <button
                                                onClick={handleBulkRemove}
                                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-all flex items-center gap-1"
                                            >
                                                <Icons.Trash2 size={14} />
                                                Remover
                                            </button>
                                        </div>
                                    )}

                                    {/* Recipients Table */}
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        {/* Header */}
                                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.size === filteredRecipients.length && filteredRecipients.length > 0}
                                                    onChange={selectAll}
                                                    className="rounded border-slate-300 text-indigo-600"
                                                />
                                                <span className="text-sm text-slate-600">
                                                    Selecionar todos ({filteredRecipients.length})
                                                </span>
                                            </label>
                                            <div className="flex-1" />
                                            <button
                                                onClick={() => setStatusFilter('all')}
                                                className={`text-xs px-2 py-1 rounded ${statusFilter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
                                            >
                                                Todos
                                            </button>
                                        </div>

                                        {/* List */}
                                        <div className="max-h-[400px] overflow-y-auto">
                                            {filteredRecipients.map((recipient) => {
                                                const contact = recipient.contact || (recipient as any).contacts;
                                                const statusInfo = statusConfig[recipient.status] || { label: recipient.status, color: 'text-slate-600', bg: 'bg-slate-100', icon: '⚪' };

                                                return (
                                                    <div
                                                        key={recipient.id}
                                                        className={`px-4 py-3 border-b border-slate-100 last:border-b-0 flex items-center gap-4 hover:bg-slate-50 transition-all ${selectedIds.has(recipient.id) ? 'bg-indigo-50' : ''
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(recipient.id)}
                                                            onChange={() => toggleSelection(recipient.id)}
                                                            className="rounded border-slate-300 text-indigo-600"
                                                        />

                                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                                            {contact?.name?.charAt(0)?.toUpperCase() || '?'}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-slate-900">
                                                                {contact?.name || 'Sem nome'}
                                                            </div>
                                                            <div className="text-sm text-slate-500">
                                                                {contact?.email || 'Sem email'}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {recipient.invite_count > 0 && (
                                                                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                                                    {recipient.invite_count}x enviado
                                                                </span>
                                                            )}
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusInfo.bg} ${statusInfo.color}`}>
                                                                <span>{statusInfo.icon}</span>
                                                                {statusInfo.label}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            {recipient.status !== 'booked' && (
                                                                <button
                                                                    onClick={() => handleSendReminder(recipient.id)}
                                                                    disabled={sending}
                                                                    className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition-all disabled:opacity-50"
                                                                    title="Reenviar"
                                                                >
                                                                    <Icons.RefreshCw size={16} />
                                                                </button>
                                                            )}

                                                            {showConfirmRemove === recipient.id ? (
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => handleRemove(recipient.id)}
                                                                        className="p-1.5 bg-red-600 text-white rounded"
                                                                    >
                                                                        <Icons.Check size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setShowConfirmRemove(null)}
                                                                        className="p-1.5 bg-slate-300 text-slate-700 rounded"
                                                                    >
                                                                        <Icons.X size={14} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setShowConfirmRemove(recipient.id)}
                                                                    className="p-2 hover:bg-red-100 rounded-lg text-slate-400 hover:text-red-600 transition-all"
                                                                    title="Remover"
                                                                >
                                                                    <Icons.Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {filteredRecipients.length === 0 && (
                                                <div className="p-12 text-center text-slate-500">
                                                    <Icons.Users size={48} className="mx-auto mb-3 opacity-30" />
                                                    <p className="font-medium">Nenhum destinatário encontrado</p>
                                                    <button
                                                        onClick={() => setShowAddRecipientsModal(true)}
                                                        className="mt-3 text-indigo-600 hover:underline"
                                                    >
                                                        Adicionar destinatários
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: Mensagem */}
                            {activeTab === 'message' && (
                                <div className="p-6">
                                    <div className="max-w-3xl mx-auto">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-bold text-slate-900">Mensagem de Convite</h3>
                                            <button
                                                onClick={() => setShowEditMessageModal(true)}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all flex items-center gap-2"
                                            >
                                                <Icons.Edit size={16} />
                                                Editar Mensagem
                                            </button>
                                        </div>

                                        {messagePreview ? (
                                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                                    <div className="text-xs text-slate-500 uppercase mb-1">Assunto</div>
                                                    <div className="font-semibold text-slate-900">{messagePreview.subject}</div>
                                                </div>
                                                <div className="p-6">
                                                    <div className="text-xs text-slate-500 uppercase mb-3">Corpo da Mensagem</div>
                                                    <div
                                                        className="prose prose-sm max-w-none text-slate-700"
                                                        dangerouslySetInnerHTML={{ __html: messagePreview.body }}
                                                    />
                                                </div>
                                                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                                                    Fonte: {messagePreview.source}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
                                                <Icons.AlertTriangle size={48} className="mx-auto mb-3 text-amber-500" />
                                                <h4 className="font-medium text-amber-800 mb-2">Nenhuma mensagem configurada</h4>
                                                <p className="text-amber-600 text-sm mb-4">Configure uma mensagem para poder enviar convites.</p>
                                                <button
                                                    onClick={() => setShowEditMessageModal(true)}
                                                    className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-all"
                                                >
                                                    Configurar Mensagem
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB: Agendados */}
                            {activeTab === 'booked' && (
                                <div className="p-6">
                                    <div className="max-w-5xl mx-auto">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900">Agendamentos Confirmados</h3>
                                                <p className="text-sm text-slate-500">
                                                    {bookings.length} agendamento(s) realizado(s)
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    // Get custom field definitions from campaign
                                                    const customFieldDefs = campaign.custom_fields || [];
                                                    const customFieldLabels = customFieldDefs.map((f: any) => f.label);

                                                    // Build header row
                                                    const headers = ['Nome', 'Email', 'Telefone', 'CPF', 'Data', 'Horário', ...customFieldLabels];

                                                    const rows = bookings.map(b => {
                                                        const d = new Date(b.start_time);
                                                        const dateStr = d.toLocaleDateString('pt-BR');
                                                        const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                                                        // Parse notes to extract custom field values
                                                        const notesMap: Record<string, string> = {};
                                                        if (b.notes) {
                                                            b.notes.split('\n').forEach((line: string) => {
                                                                const colonIdx = line.indexOf(':');
                                                                if (colonIdx > 0) {
                                                                    const key = line.substring(0, colonIdx).trim();
                                                                    const value = line.substring(colonIdx + 1).trim();
                                                                    notesMap[key] = value;
                                                                }
                                                            });
                                                        }

                                                        // Build row with dynamic custom fields
                                                        const customValues = customFieldDefs.map((f: any) => {
                                                            // Check if it's CPF (already in dedicated field)
                                                            if (f.name === 'cpf') return b.client_cpf || '';
                                                            // Get from parsed notes
                                                            return notesMap[f.label] || '';
                                                        });

                                                        // Escape quotes for CSV
                                                        const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

                                                        return [
                                                            escape(b.client_name),
                                                            escape(b.client_email),
                                                            escape(b.client_phone || ''),
                                                            escape(b.client_cpf || ''),
                                                            escape(dateStr),
                                                            escape(timeStr),
                                                            ...customValues.map((v: string) => escape(v))
                                                        ].join(',');
                                                    });

                                                    const csv = [headers.join(','), ...rows].join('\n');
                                                    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); // BOM for Excel
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `relatorio-${campaign.title}-${new Date().toISOString().split('T')[0]}.csv`;
                                                    a.click();
                                                    toast.success('Relatório CSV exportado com sucesso!');
                                                }}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all flex items-center gap-2"
                                            >
                                                <Icons.DownloadCloud size={16} />
                                                Exportar Relatório
                                            </button>
                                        </div>

                                        {bookings.length === 0 ? (
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
                                                <Icons.Calendar size={48} className="mx-auto mb-4 text-slate-300" />
                                                <h4 className="font-medium text-slate-700 mb-2">Nenhum agendamento ainda</h4>
                                                <p className="text-sm text-slate-500">
                                                    Os agendamentos confirmados aparecerão aqui com os dados coletados.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                                            <tr>
                                                                <th className="px-6 py-3 font-medium">Cliente</th>
                                                                <th className="px-6 py-3 font-medium">Dados</th>
                                                                <th className="px-6 py-3 font-medium">Horário</th>
                                                                <th className="px-6 py-3 font-medium">Notas / Campos</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {bookings.map(booking => (
                                                                <tr key={booking.id} className="hover:bg-slate-50 transition-all">
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                                                                {booking.client_name.charAt(0).toUpperCase()}
                                                                            </div>
                                                                            <div>
                                                                                <div className="font-medium text-slate-900">{booking.client_name}</div>
                                                                                <div className="text-slate-500">{booking.client_email}</div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="space-y-1">
                                                                            {booking.client_phone && (
                                                                                <div className="flex items-center gap-2 text-slate-600">
                                                                                    <Icons.Phone size={14} className="text-slate-400" />
                                                                                    {booking.client_phone}
                                                                                </div>
                                                                            )}
                                                                            {booking.client_cpf && (
                                                                                <div className="flex items-center gap-2 text-slate-600">
                                                                                    <Icons.CreditCard size={14} className="text-slate-400" />
                                                                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">{booking.client_cpf}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="font-medium text-slate-900">
                                                                            {new Date(booking.start_time).toLocaleDateString('pt-BR')}
                                                                        </div>
                                                                        <div className="text-slate-500">
                                                                            {new Date(booking.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        {booking.notes ? (
                                                                            <div className="text-slate-600 text-xs bg-slate-50 p-2 rounded border border-slate-100 max-w-[200px] truncate" title={booking.notes}>
                                                                                {booking.notes}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-slate-400 italic">Nada</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB: Métricas */}
                            {activeTab === 'metrics' && (
                                <div className="p-6">
                                    <CampaignMetricsCard analytics={analytics} loading={loading} />
                                </div>
                            )}

                            {/* TAB: Configurações */}
                            {activeTab === 'settings' && (
                                <div className="p-6">
                                    <div className="max-w-2xl mx-auto space-y-6">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4">Configurações da Campanha</h3>

                                        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                                            <div>
                                                <label className="text-xs font-medium text-slate-500 uppercase">Descrição</label>
                                                <p className="text-slate-900 mt-1">{campaign.description || 'Sem descrição'}</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 uppercase">Data de Início</label>
                                                    <p className="text-slate-900 mt-1 flex items-center gap-2">
                                                        <Icons.Calendar size={16} className="text-slate-400" />
                                                        {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString('pt-BR') : 'Não definida'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 uppercase">Prazo Final</label>
                                                    <p className="text-slate-900 mt-1 flex items-center gap-2">
                                                        <Icons.Clock size={16} className="text-slate-400" />
                                                        {campaign.deadline_date ? new Date(campaign.deadline_date).toLocaleDateString('pt-BR') : 'Não definido'}
                                                    </p>
                                                </div>
                                            </div>

                                            {clinic && (
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 uppercase">Clínica</label>
                                                    <div className="mt-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                        <div className="font-medium text-slate-900">{clinic.name}</div>
                                                        <div className="text-sm text-slate-500">{clinic.city}, {clinic.state}</div>
                                                    </div>
                                                </div>
                                            )}

                                            {exams.length > 0 && (
                                                <div>
                                                    <label className="text-xs font-medium text-slate-500 uppercase">Exames</label>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {exams.map(exam => (
                                                            <span key={exam.id} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                                                                {exam.code}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="pt-4 border-t border-slate-200">
                                                <label className="text-xs font-medium text-indigo-600 uppercase">Link de Agendamento</label>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <code className="flex-1 bg-slate-100 px-3 py-2 rounded-lg text-sm font-mono text-slate-600 truncate">
                                                        {'{{link_agendamento}}'}
                                                    </code>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText('{{link_agendamento}}');
                                                            toast.success('Copiado!');
                                                        }}
                                                        className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-all"
                                                    >
                                                        <Icons.Copy size={16} />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-2">
                                                    Use esta variável no template. Cada destinatário recebe um link único.
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => campaign && onEdit(campaign)}
                                            className="w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Icons.Edit size={18} />
                                            Editar Campanha Completa
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer - Compact */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-500">Canal:</span>
                            <select
                                value={selectedChannel}
                                onChange={(e) => setSelectedChannel(e.target.value as any)}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="email">📧 Email</option>
                                <option value="whatsapp">💬 WhatsApp</option>
                                <option value="sms">📱 SMS</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-all"
                            >
                                Fechar
                            </button>
                            <button
                                onClick={() => handleSendReminder()}
                                disabled={sending}
                                className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                <Icons.Bell size={18} />
                                Lembretes
                            </button>
                            <button
                                onClick={handleSendInvites}
                                disabled={sending || !messagePreview}
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {sending ? (
                                    <>
                                        <Icons.Loader2 size={18} className="animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Icons.Send size={18} />
                                        Enviar Convites ({statusCounts.pending || 0})
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showAddRecipientsModal && (
                <AddRecipientsModal
                    campaignId={campaign.id}
                    onClose={() => {
                        setShowAddRecipientsModal(false);
                        loadDetails();
                    }}
                />
            )}
            {showScheduleModal && campaign && (
                <CampaignScheduleModal
                    campaign={campaign}
                    isOpen={showScheduleModal}
                    onClose={() => setShowScheduleModal(false)}
                    onUpdate={loadDetails}
                />
            )}
            {showEditMessageModal && campaign && (
                <EditCampaignMessageModal
                    isOpen={showEditMessageModal}
                    onClose={() => setShowEditMessageModal(false)}
                    campaign={campaign}
                    onUpdate={loadDetails}
                />
            )}
        </div>
    );
};
