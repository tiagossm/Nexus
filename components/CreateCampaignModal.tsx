import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { EventType, MessageChannel, MessageTemplate, Company } from '../types';
import { campaignService, Campaign } from '../services/campaignService';
import * as campaignRecipientService from '../services/campaignRecipientService';
import * as companyService from '../services/companyService';
import { googleCalendarService } from '../services/googleCalendarService';
import { supabase } from '../services/supabaseClient';
import { ContactSelector } from './ContactSelector';
import { ClinicSelector } from './ClinicSelector';
import { ExamChecklistSelector } from './ExamChecklistSelector';
import { AvailabilityGridEditor } from './AvailabilityGridEditor';
import { Clinic, clinicService } from '../services/clinicService';
import { toast } from 'sonner';
import { AddRecipientsModal } from './AddRecipientsModal';
import { TemplateSelector } from './TemplateSelector';
import { MessageEditor } from './MessageEditor';
import { CampaignField } from '../types';

interface CreateCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    events: EventType[];
    campaignToEdit?: Campaign | null;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    events,
    campaignToEdit
}) => {
    const [step, setStep] = useState(1);
    const totalSteps = 7; // Increased steps

    // Step 1: Basic Info
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [deadlineDate, setDeadlineDate] = useState('');
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]);

    // Integration Settings
    const [hasGoogleIntegration, setHasGoogleIntegration] = useState(false);
    const [createGoogleCalendar, setCreateGoogleCalendar] = useState(false);

    // Step 2: Event Configuration
    const [eventMode, setEventMode] = useState<'existing' | 'new'>('existing');
    const [selectedEventId, setSelectedEventId] = useState('');
    const [newEventData, setNewEventData] = useState({
        title: '',
        duration: 30,
        location: 'Google Meet',
        description: '',
    });

    // Step 3: Clinic & Exams
    const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
    const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);

    // Step 4: Form Configuration (Custom Fields)
    const [customFields, setCustomFields] = useState<CampaignField[]>([
        { name: 'cpf', label: 'CPF', type: 'text', required: true },
        { name: 'rg', label: 'RG', type: 'text', required: false },
        { name: 'birth_date', label: 'Data de Nascimento', type: 'date', required: true }
    ]);

    // Step 5: Availability
    const [customAvailability, setCustomAvailability] = useState({
        weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
        time_slots: [{ start: '08:00', end: '17:00', slots_per_hour: 4 }],
        blocked_dates: [],
        special_dates: {},
    });

    // Step 6: Contacts
    const [contacts, setContacts] = useState<any[]>([]);

    // Step 7: Messages
    const [inviteMessage, setInviteMessage] = useState<{
        templateId?: string;
        channel: MessageChannel;
        subject: string;
        body: string;
    }>({
        channel: 'email',
        subject: '',
        body: ''
    });

    const [reminderMessage, setReminderMessage] = useState<{
        enabled: boolean;
        templateId?: string;
        channel: MessageChannel;
        subject: string;
        body: string;
        sendHoursBefore: number;
    }>({
        enabled: false,
        channel: 'whatsapp',
        subject: '',
        body: '',
        sendHoursBefore: 24
    });

    const [loading, setLoading] = useState(false);
    const [showRecipientsModal, setShowRecipientsModal] = useState(false);
    const [createdCampaignId, setCreatedCampaignId] = useState<string>('');

    // Load campaign data if editing
    useEffect(() => {
        if (isOpen && campaignToEdit) {
            setTitle(campaignToEdit.title);
            setDescription(campaignToEdit.description || '');
            setStartDate(campaignToEdit.start_date ? campaignToEdit.start_date.split('T')[0] : '');
            setEndDate(campaignToEdit.end_date ? campaignToEdit.end_date.split('T')[0] : '');
            setDeadlineDate(campaignToEdit.deadline_date ? campaignToEdit.deadline_date.split('T')[0] : '');

            if (campaignToEdit.event_type_id) {
                setEventMode('existing');
                setSelectedEventId(campaignToEdit.event_type_id);
            }

            if (campaignToEdit.clinic_id) {
                clinicService.getClinic(campaignToEdit.clinic_id)
                    .then(setSelectedClinic)
                    .catch(err => console.error('Error loading clinic:', err));
            }

            if (campaignToEdit.exam_ids) {
                setSelectedExamIds(campaignToEdit.exam_ids);
            }

            if (campaignToEdit.custom_availability) {
                setCustomAvailability(campaignToEdit.custom_availability);
            }

            if (campaignToEdit.custom_fields && campaignToEdit.custom_fields.length > 0) {
                const defaults = [
                    { name: 'cpf', label: 'CPF', type: 'text', required: true },
                    { name: 'rg', label: 'RG', type: 'text', required: false },
                    { name: 'birth_date', label: 'Data de Nascimento', type: 'date', required: true }
                ];
                // Merge saved fields with defaults to ensure we always have the structure
                // This handles cases where saved data might be incomplete
                const merged = defaults.map(def => {
                    const saved = campaignToEdit.custom_fields?.find(f => f.name === def.name);
                    return saved ? saved : def;
                });
                setCustomFields(merged as CampaignField[]);
            } else {
                // Fallback if empty or null
                setCustomFields([
                    { name: 'cpf', label: 'CPF', type: 'text', required: true },
                    { name: 'rg', label: 'RG', type: 'text', required: false },
                    { name: 'birth_date', label: 'Data de Nascimento', type: 'date', required: true }
                ]);
            }

            // Load Messages
            if (campaignToEdit.invite_message) {
                setInviteMessage({
                    templateId: campaignToEdit.invite_message.template_id,
                    channel: campaignToEdit.invite_message.channel,
                    subject: campaignToEdit.invite_message.subject || '',
                    body: campaignToEdit.invite_message.body
                });
            }

            if (campaignToEdit.reminder_message) {
                setReminderMessage({
                    enabled: true,
                    templateId: campaignToEdit.reminder_message.template_id,
                    channel: campaignToEdit.reminder_message.channel,
                    subject: campaignToEdit.reminder_message.subject || '',
                    body: campaignToEdit.reminder_message.body,
                    sendHoursBefore: campaignToEdit.reminder_message.send_hours_before || 24
                });
            }

            // Load company if editing
            if ((campaignToEdit as any).company_id) {
                companyService.getCompanyById((campaignToEdit as any).company_id)
                    .then(company => company && setSelectedCompany(company))
                    .catch(err => console.error('Error loading company:', err));
            }
        }
    }, [isOpen, campaignToEdit]);

    // Sync availability from selected Event Type (only for NEW campaigns)
    useEffect(() => {
        if (selectedEventId && !campaignToEdit && isOpen) {
            const event = events.find(e => e.id === selectedEventId);
            if (event && event.custom_availability) {
                console.log('🔄 Syncing availability from event type:', event.title, event.custom_availability);
                setCustomAvailability(event.custom_availability);
            }
        }
    }, [selectedEventId, events, campaignToEdit, isOpen]);

    // Check for Google Integration
    useEffect(() => {
        if (isOpen) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                const hasIntegration = !!session?.provider_token;
                setHasGoogleIntegration(hasIntegration);
                // Default to creating calendar if integrated and likely not editing (or check if edit has one)
                if (hasIntegration && !campaignToEdit) {
                    setCreateGoogleCalendar(true);
                }
            });
        }
    }, [isOpen, campaignToEdit]);

    // Load companies when modal opens
    useEffect(() => {
        if (isOpen) {
            companyService.listCompanies()
                .then(setCompanies)
                .catch(err => console.error('Error loading companies:', err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const canProceed = () => {
        switch (step) {
            case 1:
                return title.trim() !== '';
            case 2:
                return eventMode === 'existing' ? selectedEventId !== '' : newEventData.title.trim() !== '';
            case 3:
                return selectedClinic !== null && selectedExamIds.length > 0;
            case 4:
                return customFields.length > 0; // Validation for step 4
            case 5:
                return customAvailability.weekdays.length > 0 && customAvailability.time_slots.length > 0;
            case 6:
                return contacts.length > 0;
            case 7:
                return inviteMessage.body.trim() !== '' && (inviteMessage.channel !== 'email' || inviteMessage.subject.trim() !== '');
            default:
                return false;
        }
    };

    const handleCreateCampaign = async () => {
        try {
            setLoading(true);

            // Check for Google Session and Create Calendar if applicable
            let googleCalendarId = undefined;
            if (createGoogleCalendar) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.provider_token) {
                        // 1. DO NOT save tokens here to avoid overwriting with limited scopes
                        // await googleCalendarService.saveSessionTokens(session);

                        // 2. Create dedicated calendar
                        const calendar = await googleCalendarService.createCalendar(
                            session.provider_token,
                            `Nexus: ${title}`
                        );
                        googleCalendarId = calendar.id;
                        toast.success('Calendário do Google criado com sucesso!');
                    }
                } catch (calErr) {
                    console.error('Error creating Google Calendar:', calErr);
                    toast.error('Erro ao criar calendário no Google. A campanha será criada sem integração.');
                }
            }

            const campaignData = {
                title,
                description,
                event_type_id: eventMode === 'existing' ? selectedEventId : undefined,
                status: campaignToEdit ? campaignToEdit.status : ('draft' as const),
                start_date: startDate || undefined,
                end_date: endDate || undefined,
                deadline_date: deadlineDate || undefined,
                clinic_id: selectedClinic?.id,
                exam_ids: selectedExamIds,
                custom_availability: customAvailability,
                custom_fields: customFields,
                company_id: selectedCompany?.id,
                google_calendar_id: googleCalendarId,

                // New Message Fields
                invite_message: {
                    template_id: inviteMessage.templateId,
                    channel: inviteMessage.channel,
                    subject: inviteMessage.subject,
                    body: inviteMessage.body
                },
                reminder_message: reminderMessage.enabled ? {
                    template_id: reminderMessage.templateId,
                    channel: reminderMessage.channel,
                    subject: reminderMessage.subject,
                    body: reminderMessage.body,
                    send_hours_before: reminderMessage.sendHoursBefore
                } : undefined,

                total_recipients: (campaignToEdit?.total_recipients || 0) + contacts.length,
            };

            let campaign;
            if (campaignToEdit) {
                campaign = await campaignService.updateCampaign(campaignToEdit.id, campaignData);
                toast.success('Campanha atualizada com sucesso!');
            } else {
                campaign = await campaignService.createCampaign(campaignData);
                toast.success('Campanha criada com sucesso!');
            }

            if (contacts.length > 0) {
                await campaignRecipientService.addRecipientsToCampaign(campaign.id, contacts);
            }

            setCreatedCampaignId(campaign.id);
            setShowRecipientsModal(true);
            onSuccess();
            handleClose();
        } catch (error: any) {
            console.error('Erro ao criar campanha:', error);
            toast.error(`Erro ao criar campanha: ${error.message || error.details || 'Verifique o console'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setTitle('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setDeadlineDate('');
        setEventMode('existing');
        setSelectedEventId('');
        setNewEventData({ title: '', duration: 30, location: 'Google Meet', description: '' });
        setSelectedClinic(null);
        setSelectedExamIds([]);
        setCustomFields([
            { name: 'cpf', label: 'CPF', type: 'text', required: true },
            { name: 'rg', label: 'RG', type: 'text', required: false },
            { name: 'birth_date', label: 'Data de Nascimento', type: 'date', required: true }
        ]);
        setCustomAvailability({
            weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
            time_slots: [{ start: '08:00', end: '17:00', slots_per_hour: 4 }],
            blocked_dates: [],
            special_dates: {},
        });
        setContacts([]);
        setSelectedCompany(null);

        // Reset Messages
        setInviteMessage({ channel: 'email', subject: '', body: '' });
        setReminderMessage({ enabled: false, channel: 'whatsapp', subject: '', body: '', sendHoursBefore: 24 });

        onClose();
    };
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{campaignToEdit ? 'Editar Campanha' : 'Nova Campanha Profissional'}</h2>
                        <p className="text-sm text-slate-600 mt-1">Etapa {step} de {totalSteps}</p>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                        <Icons.X size={20} className="text-slate-600" />
                    </button>
                </div>
                {/* Progress Bar */}
                <div className="h-2 bg-slate-100 flex-shrink-0">
                    <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }} />
                </div>
                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Empresa Convocante *</label>
                                <select
                                    value={selectedCompany?.id || ''}
                                    onChange={(e) => setSelectedCompany(companies.find(c => c.id === e.target.value) || null)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">Selecione uma empresa...</option>
                                    {companies.map(company => (
                                        <option key={company.id} value={company.id}>{company.name}</option>
                                    ))}
                                </select>
                                {selectedCompany && (
                                    <div className="mt-2 p-3 rounded-lg border" style={{ borderColor: selectedCompany.primary_color, backgroundColor: `${selectedCompany.primary_color}10` }}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded" style={{ backgroundColor: selectedCompany.primary_color }}></div>
                                            <span className="font-medium text-slate-900">{selectedCompany.name}</span>
                                        </div>
                                        {selectedCompany.footer_text && (
                                            <p className="text-xs text-slate-500 mt-1">Rodapé: {selectedCompany.footer_text}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Título da Campanha *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ex: Exames Admissionais - Novembro 2025"
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Descrição (opcional)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Descreva o objetivo desta campanha..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Data de Início</label>
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Data de Término</label>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Prazo para Agendamento</label>
                                    <input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </div>

                            {/* Integration Option */}
                            {hasGoogleIntegration && (
                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Icons.Calendar size={18} className="text-indigo-600" />
                                            <h4 className="font-bold text-slate-900">Integração com Google Calendar</h4>
                                        </div>
                                        <p className="text-sm text-slate-600 mb-2">Deseja criar um calendário específico para esta campanha?</p>
                                        <label className="flex items-center gap-2 cursor-pointer w-fit">
                                            <input
                                                type="checkbox"
                                                checked={createGoogleCalendar}
                                                onChange={(e) => setCreateGoogleCalendar(e.target.checked)}
                                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-sm font-medium text-slate-900">Criar calendário "Nexus: {title || 'Nova Campanha'}"</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Step 2: Event Configuration */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-3">Como deseja configurar o tipo de atendimento?</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setEventMode('existing')}
                                        className={`p-4 border-2 rounded-lg text-left transition-all ${eventMode === 'existing' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <Icons.LayoutDashboard size={24} className={eventMode === 'existing' ? 'text-indigo-600' : 'text-slate-400'} />
                                            <h4 className="font-bold text-slate-900">Usar Evento Existente</h4>
                                        </div>
                                        <p className="text-sm text-slate-600">Selecione um tipo de evento já cadastrado</p>
                                    </button>
                                    <button
                                        onClick={() => setEventMode('new')}
                                        className={`p-4 border-2 rounded-lg text-left transition-all ${eventMode === 'new' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <Icons.Plus size={24} className={eventMode === 'new' ? 'text-indigo-600' : 'text-slate-400'} />
                                            <h4 className="font-bold text-slate-900">Criar Evento Novo</h4>
                                        </div>
                                        <p className="text-sm text-slate-600">Configure um atendimento específico para esta campanha</p>
                                    </button>
                                </div>
                            </div>
                            {eventMode === 'existing' && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-slate-700">Selecione o Tipo de Evento *</label>
                                    {events.map((event) => (
                                        <button
                                            key={event.id}
                                            onClick={() => setSelectedEventId(event.id)}
                                            className={`w-full p-4 border-2 rounded-lg text-left transition-all ${selectedEventId === event.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }} />
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-900">{event.title}</div>
                                                    <div className="text-sm text-slate-600">{event.duration} minutos · {event.location}</div>
                                                </div>
                                                {selectedEventId === event.id && <Icons.Check size={20} className="text-indigo-600" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {eventMode === 'new' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Atendimento *</label>
                                        <input
                                            type="text"
                                            value={newEventData.title}
                                            onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
                                            placeholder="Ex: Exame Admissional Completo"
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Duração (minutos)</label>
                                            <input
                                                type="number"
                                                value={newEventData.duration}
                                                onChange={(e) => setNewEventData({ ...newEventData, duration: parseInt(e.target.value) })}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Local</label>
                                            <select
                                                value={newEventData.location}
                                                onChange={(e) => setNewEventData({ ...newEventData, location: e.target.value })}
                                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="Google Meet">Google Meet</option>
                                                <option value="Presencial">Presencial</option>
                                                <option value="Microsoft Teams">Microsoft Teams</option>
                                                <option value="Zoom">Zoom</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Descrição</label>
                                        <textarea
                                            value={newEventData.description}
                                            onChange={(e) => setNewEventData({ ...newEventData, description: e.target.value })}
                                            placeholder="Detalhes sobre este tipo de atendimento..."
                                            rows={3}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Step 3: Clinic & Exams */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Selecione a Clínica</h3>
                                <ClinicSelector selectedClinicId={selectedClinic?.id} onSelect={setSelectedClinic} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Selecione os Exames</h3>
                                {selectedClinic && selectedClinic.offered_exams && selectedClinic.offered_exams.length > 0 && (
                                    <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start gap-3">
                                        <Icons.Info size={18} className="text-indigo-600 mt-0.5" />
                                        <div className="text-sm text-indigo-800">
                                            <p className="font-medium">Filtrando exames realizados por {selectedClinic.name}</p>
                                            <p className="opacity-80">A lista abaixo destaca os exames que esta clínica está habilitada a fazer.</p>
                                        </div>
                                    </div>
                                )}
                                <ExamChecklistSelector selectedExamIds={selectedExamIds} onSelectionChange={setSelectedExamIds} highlightedExamIds={selectedClinic?.offered_exams} />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Form Configuration */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Configuração do Formulário</h3>
                                <p className="text-slate-600 text-sm mb-6">Defina quais dados serão solicitados ao paciente no momento do agendamento.</p>

                                {/* Suggestions */}
                                <div className="mb-6">
                                    <p className="text-sm font-medium text-slate-700 mb-2">Sugestões de Campos:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { name: 'cpf', label: 'CPF', type: 'text' },
                                            { name: 'rg', label: 'RG', type: 'text' },
                                            { name: 'birth_date', label: 'Data de Nascimento', type: 'date' },
                                            { name: 'medications', label: 'Medicamentos em uso', type: 'text' },
                                            { name: 'allergies', label: 'Alergias', type: 'text' },
                                            { name: 'surgeries', label: 'Cirurgias anteriores', type: 'text' },
                                            { name: 'health_plan', label: 'Plano de Saúde', type: 'text' },
                                            { name: 'emergency_contact', label: 'Contato de Emergência', type: 'tel' },
                                            { name: 'blood_type', label: 'Tipo Sanguíneo', type: 'text' },
                                            { name: 'pre_anamnesis', label: 'Pré-Anamnese (Observações)', type: 'text' },
                                        ].filter(s => !customFields.find(f => f.name === s.name)).map(suggestion => (
                                            <button
                                                key={suggestion.name}
                                                type="button"
                                                onClick={() => setCustomFields([...customFields, { ...suggestion, required: false }])}
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium hover:bg-indigo-100 transition-all flex items-center gap-1"
                                            >
                                                <Icons.Plus size={14} />
                                                {suggestion.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Current Fields */}
                                <div className="space-y-3">
                                    {customFields.map((field, index) => (
                                        <div key={index} className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
                                            <div className="flex-1 grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-xs text-slate-500 mb-1 block">Nome do Campo</label>
                                                    <input
                                                        type="text"
                                                        value={field.label}
                                                        onChange={(e) => {
                                                            const newFields = [...customFields];
                                                            newFields[index].label = e.target.value;
                                                            setCustomFields(newFields);
                                                        }}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-500 mb-1 block">Tipo</label>
                                                    <select
                                                        value={field.type}
                                                        onChange={(e) => {
                                                            const newFields = [...customFields];
                                                            newFields[index].type = e.target.value;
                                                            setCustomFields(newFields);
                                                        }}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                    >
                                                        <option value="text">Texto</option>
                                                        <option value="number">Número</option>
                                                        <option value="date">Data</option>
                                                        <option value="tel">Telefone</option>
                                                        <option value="email">Email</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={field.required}
                                                        onChange={(e) => {
                                                            const newFields = [...customFields];
                                                            newFields[index].required = e.target.checked;
                                                            setCustomFields(newFields);
                                                        }}
                                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                                    />
                                                    <span className="text-sm text-slate-700">Obrigatório</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newFields = customFields.filter((_, i) => i !== index);
                                                        setCustomFields(newFields);
                                                    }}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Remover campo"
                                                >
                                                    <Icons.Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add Custom Field */}
                                    <button
                                        type="button"
                                        onClick={() => setCustomFields([...customFields, {
                                            name: `custom_${Date.now()}`,
                                            label: 'Novo Campo',
                                            type: 'text',
                                            required: false
                                        }])}
                                        className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Icons.Plus size={18} />
                                        Adicionar Campo Personalizado
                                    </button>

                                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start gap-3 mt-4">
                                        <Icons.Info size={18} className="text-indigo-600 mt-0.5" />
                                        <div className="text-sm text-indigo-800">
                                            <p className="font-medium">Campos Padrão</p>
                                            <p className="opacity-80">Nome, Email e Telefone são solicitados automaticamente por padrão.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Availability */}
                    {step === 5 && (
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Configure a Grade de Horários</h3>
                            <AvailabilityGridEditor value={customAvailability} onChange={setCustomAvailability} />
                        </div>
                    )}
                    {/* Step 6: Contacts */}
                    {step === 6 && (
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Selecione os Contatos</h3>
                            <ContactSelector onContactsSelected={setContacts} initialContacts={contacts} />
                        </div>
                    )}
                    {/* Step 7: Messages */}
                    {step === 7 && (
                        <div className="space-y-8">
                            {/* Invite Message Section */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-slate-900">Mensagem de Convite</h3>
                                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setInviteMessage({ ...inviteMessage, channel: 'email' })}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${inviteMessage.channel === 'email' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            Email
                                        </button>
                                        <button
                                            onClick={() => setInviteMessage({ ...inviteMessage, channel: 'whatsapp' })}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${inviteMessage.channel === 'whatsapp' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            WhatsApp
                                        </button>
                                        <button
                                            onClick={() => setInviteMessage({ ...inviteMessage, channel: 'sms' })}
                                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${inviteMessage.channel === 'sms' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            SMS
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <TemplateSelector
                                        channel={inviteMessage.channel}
                                        selectedTemplateId={inviteMessage.templateId}
                                        onSelect={(template) => setInviteMessage(prev => ({ ...prev, templateId: template?.id }))}
                                        onUseTemplate={(subject, body) => setInviteMessage(prev => ({ ...prev, subject, body }))}
                                    />

                                    <MessageEditor
                                        channel={inviteMessage.channel}
                                        subject={inviteMessage.subject}
                                        body={inviteMessage.body}
                                        onChange={(subject, body) => setInviteMessage(prev => ({ ...prev, subject, body }))}
                                        placeholder="Digite a mensagem de convite..."
                                    />
                                </div>
                            </div>

                            {/* Reminder Message Section */}
                            <div className="border-t border-slate-200 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-slate-900">Mensagem de Lembrete</h3>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={reminderMessage.enabled}
                                                onChange={(e) => setReminderMessage(prev => ({ ...prev, enabled: e.target.checked }))}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>

                                    {reminderMessage.enabled && (
                                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                                            <button
                                                onClick={() => setReminderMessage({ ...reminderMessage, channel: 'email' })}
                                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${reminderMessage.channel === 'email' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                            >
                                                Email
                                            </button>
                                            <button
                                                onClick={() => setReminderMessage({ ...reminderMessage, channel: 'whatsapp' })}
                                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${reminderMessage.channel === 'whatsapp' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                            >
                                                WhatsApp
                                            </button>
                                            <button
                                                onClick={() => setReminderMessage({ ...reminderMessage, channel: 'sms' })}
                                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${reminderMessage.channel === 'sms' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                            >
                                                SMS
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {reminderMessage.enabled && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <div className="flex items-center gap-4 mb-2">
                                            <label className="text-sm font-medium text-slate-700">Enviar lembrete:</label>
                                            <select
                                                value={reminderMessage.sendHoursBefore}
                                                onChange={(e) => setReminderMessage(prev => ({ ...prev, sendHoursBefore: parseInt(e.target.value) }))}
                                                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value={24}>24 horas antes</option>
                                                <option value={48}>48 horas antes</option>
                                                <option value={1}>1 hora antes</option>
                                            </select>
                                        </div>

                                        <TemplateSelector
                                            channel={reminderMessage.channel}
                                            selectedTemplateId={reminderMessage.templateId}
                                            onSelect={(template) => setReminderMessage(prev => ({ ...prev, templateId: template?.id }))}
                                            onUseTemplate={(subject, body) => setReminderMessage(prev => ({ ...prev, subject, body }))}
                                        />

                                        <MessageEditor
                                            channel={reminderMessage.channel}
                                            subject={reminderMessage.subject}
                                            body={reminderMessage.body}
                                            onChange={(subject, body) => setReminderMessage(prev => ({ ...prev, subject, body }))}
                                            placeholder="Digite a mensagem de lembrete..."
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Final Summary */}
                            <div className="border border-slate-200 rounded-lg p-6 bg-slate-50">
                                <h4 className="font-bold text-slate-900 mb-4">Resumo da Campanha</h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-600">Título:</span><span className="font-medium text-slate-900">{title}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-600">Clínica:</span><span className="font-medium text-slate-900">{selectedClinic?.name || '-'}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-600">Exames:</span><span className="font-medium text-slate-900">{selectedExamIds.length}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-600">Contatos:</span><span className="font-medium text-slate-900">{contacts.length}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-600">Convite:</span><span className="font-medium text-slate-900 capitalize">{inviteMessage.channel}</span></div>
                                    {reminderMessage.enabled && (
                                        <div className="flex justify-between"><span className="text-slate-600">Lembrete:</span><span className="font-medium text-slate-900 capitalize">{reminderMessage.channel} ({reminderMessage.sendHoursBefore}h antes)</span></div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {/* Footer */}
                <div className="p-6 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
                    <button onClick={() => step > 1 ? setStep(step - 1) : handleClose()} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all">{step === 1 ? 'Cancelar' : 'Voltar'}</button>
                    <button
                        onClick={() => {
                            if (step === totalSteps) {
                                handleCreateCampaign();
                            } else {
                                setStep(step + 1);
                            }
                        }}
                        disabled={!canProceed() || loading}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                    >
                        {loading ? (<><Icons.Loader2 size={16} className="animate-spin" /> {campaignToEdit ? 'Salvando...' : 'Criando...'}</>) : step === totalSteps ? (campaignToEdit ? 'Salvar Alterações' : 'Criar Campanha') : 'Próximo'}
                    </button>
                </div>
            </div>
            {showRecipientsModal && (
                <AddRecipientsModal campaignId={createdCampaignId} onClose={() => setShowRecipientsModal(false)} />
            )}
        </div>
    );
};
