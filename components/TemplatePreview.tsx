import React, { useMemo } from 'react';
import { Icons } from './Icons';
import { MessageChannel } from '../types';
import { renderTemplate, getSampleData } from '../services/messageTemplateService';

interface TemplatePreviewProps {
    subject?: string;
    body: string;
    channel: MessageChannel;
    variables?: Record<string, any>;
    className?: string;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
    subject,
    body,
    channel,
    variables,
    className = ''
}) => {
    // Usar variáveis fornecidas ou dados de exemplo
    const previewData = useMemo(() => {
        return variables || getSampleData();
    }, [variables]);

    // Renderizar template com variáveis
    const rendered = useMemo(() => {
        return renderTemplate(
            {
                id: 'preview',
                name: 'Preview',
                channel,
                subject: subject || '',
                body,
                is_active: true,
                created_by: 'preview',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            previewData
        );
    }, [subject, body, channel, previewData]);

    return (
        <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden ${className}`}>
            {/* Header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icons.Eye size={18} className="text-indigo-600" />
                    <h4 className="font-bold text-slate-900">Preview</h4>
                    <span className="text-xs text-slate-500">
                        {channel === 'email' ? '📧 Email' : channel === 'whatsapp' ? '💬 WhatsApp' : '📱 SMS'}
                    </span>
                </div>
                <div className="text-xs text-slate-500">
                    Dados de exemplo
                </div>
            </div>

            {/* Preview Content */}
            <div className="p-4">
                {channel === 'email' ? (
                    <EmailPreview subject={rendered.subject} body={rendered.body} htmlBody={rendered.html_body} />
                ) : channel === 'whatsapp' ? (
                    <WhatsAppPreview body={rendered.body} />
                ) : (
                    <SMSPreview body={rendered.body} />
                )}
            </div>

            {/* Sample Data Info */}
            <div className="px-4 py-3 bg-indigo-50 border-t border-indigo-100">
                <div className="flex items-start gap-2 text-xs text-indigo-700">
                    <Icons.Info size={14} className="mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold mb-1">Dados de exemplo usados:</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-indigo-600">
                            <div><strong>Nome:</strong> {previewData.contact.name}</div>
                            <div><strong>Email:</strong> {previewData.contact.email}</div>
                            <div><strong>Telefone:</strong> {previewData.contact.phone}</div>
                            <div><strong>Clínica:</strong> {previewData.clinic.name}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Email Preview Component
const EmailPreview: React.FC<{ subject?: string; body: string; htmlBody?: string }> = ({
    subject,
    body,
    htmlBody
}) => {
    return (
        <div className="space-y-4">
            {/* Email Header */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                    <div className="text-xs text-slate-500 mb-1">Assunto:</div>
                    <div className="font-semibold text-slate-900">{subject || '(Sem assunto)'}</div>
                </div>
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                    <div className="text-xs text-slate-500">De: sua-empresa@nexusagenda.com</div>
                    <div className="text-xs text-slate-500">Para: joao.silva@email.com</div>
                </div>
            </div>

            {/* Email Body */}
            <div className="border border-slate-200 rounded-lg p-4 bg-white min-h-[200px]">
                {htmlBody ? (
                    <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: htmlBody }}
                    />
                ) : (
                    <div className="whitespace-pre-wrap text-slate-700 text-sm leading-relaxed">
                        {body}
                    </div>
                )}
            </div>
        </div>
    );
};

// WhatsApp Preview Component
const WhatsAppPreview: React.FC<{ body: string }> = ({ body }) => {
    return (
        <div className="max-w-sm mx-auto">
            {/* WhatsApp-style bubble */}
            <div className="bg-[#E7FFDB] rounded-lg rounded-br-none p-3 shadow-sm border border-[#D9FDD3]">
                <div className="whitespace-pre-wrap text-slate-800 text-sm leading-relaxed">
                    {body}
                </div>
                <div className="flex items-center justify-end gap-1 mt-2">
                    <span className="text-xs text-slate-500">14:30</span>
                    <Icons.Check size={14} className="text-blue-500" />
                    <Icons.Check size={14} className="text-blue-500 -ml-2" />
                </div>
            </div>

            {/* WhatsApp info */}
            <div className="mt-3 text-center text-xs text-slate-500">
                Mensagem será enviada via WhatsApp Business API
            </div>
        </div>
    );
};

// SMS Preview Component
const SMSPreview: React.FC<{ body: string }> = ({ body }) => {
    const charCount = body.length;
    const messageCount = Math.ceil(charCount / 160);

    return (
        <div className="max-w-sm mx-auto">
            {/* SMS-style bubble */}
            <div className="bg-blue-500 text-white rounded-lg rounded-br-none p-3 shadow-sm">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {body}
                </div>
            </div>

            {/* SMS info */}
            <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Caracteres:</span>
                    <span className={`font-semibold ${charCount > 160 ? 'text-orange-600' : 'text-slate-700'}`}>
                        {charCount} / 160
                    </span>
                </div>
                {messageCount > 1 && (
                    <div className="flex items-center gap-2 text-xs text-orange-600">
                        <Icons.AlertCircle size={14} />
                        <span>Será dividido em {messageCount} mensagens</span>
                    </div>
                )}
            </div>
        </div>
    );
};
