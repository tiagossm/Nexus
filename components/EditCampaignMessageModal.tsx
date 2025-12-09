import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Campaign, campaignService } from '../services/campaignService';
import * as messageTemplateService from '../services/messageTemplateService';
import { MessageTemplate } from '../types';
import { toast } from 'sonner';

interface EditCampaignMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaign: Campaign;
    onUpdate: () => void;
}

export const EditCampaignMessageModal: React.FC<EditCampaignMessageModalProps> = ({
    isOpen,
    onClose,
    campaign,
    onUpdate
}) => {
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [messageType, setMessageType] = useState<'invite' | 'reminder'>('invite');

    // Form state
    const [useTemplate, setUseTemplate] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    useEffect(() => {
        if (isOpen && templates.length > 0) {
            loadCurrentMessage();
        }
    }, [isOpen, messageType, campaign, templates]);

    const loadTemplates = async () => {
        try {
            const data = await messageTemplateService.listTemplates({ channel: 'email', isActive: true });
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    };

    const loadCurrentMessage = () => {
        let currentSubject = '';
        let currentBody = '';
        let currentTemplateId = '';
        let isTemplate = false;

        const message = messageType === 'invite' ? campaign.invite_message : campaign.reminder_message;
        const templateId = messageType === 'invite' ? campaign.email_template_invite_id : campaign.email_template_reminder_id;

        if (message?.body) {
            isTemplate = false;
            currentSubject = message.subject || '';
            currentBody = message.body || '';
        } else if (templateId) {
            isTemplate = true;
            currentTemplateId = templateId;
            // Try to find template content
            const tmpl = templates.find(t => t.id === templateId);
            if (tmpl) {
                currentSubject = tmpl.subject || '';
                currentBody = tmpl.html_body || tmpl.body || '';
            }
        }

        setUseTemplate(isTemplate);
        setSelectedTemplateId(currentTemplateId);
        setSubject(currentSubject);
        setBody(currentBody);
    };

    const handleTemplateSelect = async (templateId: string) => {
        setSelectedTemplateId(templateId);
        if (templateId) {
            const template = templates.find(t => t.id === templateId);
            if (template) {
                setSubject(template.subject || '');
                setBody(template.html_body || template.body || '');
            }
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);

            // Validation
            if (!useTemplate && (!subject.trim() || !body.trim())) {
                toast.error('Por favor, preencha o assunto e o conteúdo da mensagem.');
                setLoading(false);
                return;
            }

            if (useTemplate && !selectedTemplateId) {
                toast.error('Por favor, selecione um template.');
                setLoading(false);
                return;
            }

            const updateData: Partial<Campaign> = {};

            if (messageType === 'invite') {
                if (useTemplate && selectedTemplateId) {
                    updateData.email_template_invite_id = selectedTemplateId;
                    updateData.invite_message = null; // Clear manual message
                } else {
                    updateData.invite_message = { subject, body, channel: 'email' };
                    updateData.email_template_invite_id = null; // Clear template link
                }
            } else {
                if (useTemplate && selectedTemplateId) {
                    updateData.email_template_reminder_id = selectedTemplateId;
                    updateData.reminder_message = null;
                } else {
                    updateData.reminder_message = { subject, body, channel: 'email' };
                    updateData.email_template_reminder_id = null;
                }
            }

            console.log('Saving message update:', updateData);
            await campaignService.updateCampaign(campaign.id, updateData);
            toast.success('Mensagem atualizada com sucesso!');
            onUpdate();
            onClose();
        } catch (error: any) {
            console.error('Error saving message:', error);
            toast.error(`Erro ao salvar mensagem: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Icons.Mail size={20} className="text-indigo-600" />
                        Editar Mensagem
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                        <Icons.X size={20} className="text-slate-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Message Type Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setMessageType('invite')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${messageType === 'invite'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <Icons.Send size={16} className="inline mr-2" />
                            Convite
                        </button>
                        <button
                            onClick={() => setMessageType('reminder')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${messageType === 'reminder'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <Icons.Bell size={16} className="inline mr-2" />
                            Lembrete
                        </button>
                    </div>

                    {/* Source Toggle */}
                    <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                checked={!useTemplate}
                                onChange={() => setUseTemplate(false)}
                                className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-slate-700">Mensagem Personalizada</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                checked={useTemplate}
                                onChange={() => setUseTemplate(true)}
                                className="text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-slate-700">Usar Template</span>
                        </label>
                    </div>

                    {/* Template Selector */}
                    {useTemplate && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Selecionar Template
                            </label>
                            <select
                                value={selectedTemplateId}
                                onChange={(e) => handleTemplateSelect(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="">Selecione um template...</option>
                                {templates.map(template => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Assunto
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Ex: Confirmação de Exame Ocupacional"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            disabled={useTemplate && !selectedTemplateId}
                        />
                    </div>

                    {/* Body */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Corpo da Mensagem
                        </label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Digite a mensagem do email..."
                            rows={8}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono text-sm"
                            disabled={useTemplate && !selectedTemplateId}
                        />
                    </div>

                    {/* Variables Help */}
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-700 mb-2">Variáveis Disponíveis:</h4>
                        <div className="flex flex-wrap gap-2">
                            {['{{greeting}}', '{{nome}}', '{{exame}}', '{{clinica}}', '{{link_agendamento}}', '{{data_limite}}'].map(v => (
                                <button
                                    key={v}
                                    onClick={() => setBody(prev => prev + ' ' + v)}
                                    className="px-2 py-1 bg-white border border-blue-200 rounded text-xs text-blue-700 hover:bg-blue-100 transition-all font-mono"
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading || (!useTemplate && (!subject || !body))}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Icons.Loader2 size={16} className="animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Icons.Check size={16} />
                                Salvar Alterações
                            </>
                        )}
                    </button>
                </div>
            </div >
        </div >
    );
};

export default EditCampaignMessageModal;
