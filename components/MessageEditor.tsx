import React, { useState, useRef } from 'react';
import { Icons } from './Icons';
import { MessageChannel } from '../types';
import { VariablePicker } from './VariablePicker';
import { TemplatePreview } from './TemplatePreview';
import { RichTextEditor } from './RichTextEditor';
import { validateTemplate } from '../utils/TemplateValidator';

interface MessageEditorProps {
    channel: MessageChannel;
    subject: string;
    body: string;
    onChange: (subject: string, body: string) => void;
    placeholder?: string;
    showPreview?: boolean;
    showVariablePicker?: boolean;
    enableRichText?: boolean; // Novo: habilitar editor WYSIWYG
}

export const MessageEditor: React.FC<MessageEditorProps> = ({
    channel,
    subject,
    body,
    onChange,
    placeholder,
    showPreview = true,
    showVariablePicker = true,
    enableRichText = true // Padrão: habilitado
}) => {
    const [showVariablePanel, setShowVariablePanel] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const subjectRef = useRef<HTMLInputElement>(null);

    // Validação em tempo real
    const validation = validateTemplate(body, channel, subject);

    const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(subject, e.target.value);
    };

    const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value, body);
    };

    const insertVariableInBody = (variableText: string) => {
        if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            const newBody = body.substring(0, start) + variableText + body.substring(end);

            onChange(subject, newBody);

            // Restore cursor position after update
            setTimeout(() => {
                if (textareaRef.current) {
                    const newCursorPos = start + variableText.length;
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            }, 0);
        } else {
            onChange(subject, body + variableText);
        }
    };

    const insertVariableInSubject = (variableText: string) => {
        if (subjectRef.current) {
            const start = subjectRef.current.selectionStart || subject.length;
            const end = subjectRef.current.selectionEnd || subject.length;
            const newSubject = subject.substring(0, start) + variableText + subject.substring(end);

            onChange(newSubject, body);

            setTimeout(() => {
                if (subjectRef.current) {
                    const newCursorPos = start + variableText.length;
                    subjectRef.current.focus();
                    subjectRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            }, 0);
        } else {
            onChange(subject + variableText, body);
        }
    };

    const getChannelLabel = () => {
        switch (channel) {
            case 'email': return 'Email';
            case 'whatsapp': return 'WhatsApp';
            case 'sms': return 'SMS';
            default: return '';
        }
    };

    const getMaxLength = () => {
        if (channel === 'sms') return 160;
        return undefined;
    };

    const maxLength = getMaxLength();
    const isOverLimit = maxLength && body.length > maxLength;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Editor Column */}
            <div className={showVariablePicker ? "lg:col-span-2" : "lg:col-span-3"}>
                <div className="space-y-4">
                    {/* Editor */}
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        {/* Header / Toolbar */}
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Editor de {getChannelLabel()}
                            </div>
                            {showVariablePicker && (
                                <button
                                    type="button"
                                    onClick={() => setShowVariablePanel(!showVariablePanel)}
                                    className={`lg:hidden flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${showVariablePanel
                                        ? 'text-indigo-700 bg-indigo-100'
                                        : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                        }`}
                                >
                                    <Icons.Code size={14} />
                                    {showVariablePanel ? 'Ocultar' : 'Variáveis'}
                                </button>
                            )}
                        </div>

                        <div className="p-4 space-y-4">
                            {channel === 'email' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Assunto *
                                    </label>
                                    <input
                                        ref={subjectRef}
                                        type="text"
                                        value={subject}
                                        onChange={handleSubjectChange}
                                        placeholder="Assunto do email..."
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Mensagem *
                                </label>
                                <div className="relative">
                                    <textarea
                                        ref={textareaRef}
                                        value={body}
                                        onChange={handleBodyChange}
                                        placeholder={placeholder || "Digite sua mensagem aqui..."}
                                        rows={channel === 'email' ? 10 : 6}
                                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono text-sm ${isOverLimit ? 'border-red-300 focus:ring-red-200' : 'border-slate-300'
                                            }`}
                                    />
                                    {maxLength && (
                                        <div className={`absolute bottom-2 right-2 text-xs ${isOverLimit ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                                            {body.length}/{maxLength}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Validation Messages */}
                    {!validation.valid && validation.errors && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <Icons.AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="font-semibold text-red-900 text-sm mb-1">Erros encontrados:</div>
                                    <ul className="text-sm text-red-700 space-y-1">
                                        {validation.errors.map((error, index) => (
                                            <li key={index}>• {error}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {validation.warnings && validation.warnings.length > 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <Icons.AlertCircle size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="font-semibold text-orange-900 text-sm mb-1">Avisos:</div>
                                    <ul className="text-sm text-orange-700 space-y-1">
                                        {validation.warnings.map((warning, index) => (
                                            <li key={index}>• {warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preview */}
                    {showPreview && (
                        <TemplatePreview
                            subject={subject}
                            body={body}
                            channel={channel}
                        />
                    )}
                </div>
            </div>

            {/* Variable Picker Column */}
            {showVariablePicker && (
                <div className={`${showVariablePanel ? 'block' : 'hidden lg:block'}`}>
                    <div className="sticky top-4 max-h-[calc(100vh-2rem)]">
                        <VariablePicker
                            channel={channel}
                            onInsert={(variable) => {
                                // Inserir no body por padrão, ou no subject se estiver focado
                                if (document.activeElement === subjectRef.current) {
                                    insertVariableInSubject(variable);
                                } else {
                                    insertVariableInBody(variable);
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
