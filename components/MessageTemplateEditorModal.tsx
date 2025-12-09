import React, { useState } from 'react';
import { Icons } from './Icons';
import { createTemplate, updateTemplate, renderTemplate, getSampleData } from '../services/messageTemplateService';
import type { MessageTemplate, MessageChannel, TEMPLATE_VARIABLES } from '../types';
import { TEMPLATE_VARIABLES as VARS } from '../types';
import { toast } from 'sonner';

interface MessageTemplateEditorModalProps {
    template?: MessageTemplate;
    onClose: () => void;
    onSaved: () => void;
}

export const MessageTemplateEditorModal: React.FC<MessageTemplateEditorModalProps> = ({
    template,
    onClose,
    onSaved,
}) => {
    const isEditing = !!template;
    const [name, setName] = useState(template?.name || '');
    const [description, setDescription] = useState(template?.description || '');
    const [channel, setChannel] = useState<MessageChannel>(template?.channel || 'email');
    const [category, setCategory] = useState(template?.category || '');
    const [subject, setSubject] = useState(template?.subject || '');
    const [body, setBody] = useState(template?.body || '');
    const [isActive, setIsActive] = useState(template?.is_active ?? true);
    const [tags, setTags] = useState<string[]>(template?.tags || []);
    const [tagInput, setTagInput] = useState('');
    const [showVariables, setShowVariables] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Nome do template é obrigatório');
            return;
        }
        if (!body.trim()) {
            toast.error('Corpo da mensagem é obrigatório');
            return;
        }
        if (channel === 'email' && !subject.trim()) {
            toast.error('Assunto é obrigatório para templates de email');
            return;
        }

        try {
            setSaving(true);
            const data = {
                name,
                description,
                channel,
                category,
                subject: channel === 'email' ? subject : undefined,
                body,
                is_active: isActive,
                tags,
                created_by: 'default_user',
            };

            if (isEditing) {
                await updateTemplate(template.id, data);
                toast.success('Template atualizado com sucesso');
            } else {
                await createTemplate(data as any);
                toast.success('Template criado com sucesso');
            }

            onSaved();
        } catch (error: any) {
            console.error('Error saving template:', error);
            if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
                toast.error('Já existe um template com esse nome para este canal');
            } else {
                toast.error('Erro ao salvar template');
            }
        } finally {
            setSaving(false);
        }
    };

    const insertVariable = (variable: string) => {
        const textarea = document.getElementById('template-body') as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            const newText = text.substring(0, start) + `{{${variable}}}` + text.substring(end);
            setBody(newText);
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
            }, 0);
        }
        setShowVariables(false);
    };

    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter((t) => t !== tag));
    };

    const getPreview = () => {
        const sampleData = getSampleData();
        const mockTemplate = { ...template, subject, body } as MessageTemplate;
        return renderTemplate(mockTemplate, sampleData);
    };

    const preview = showPreview ? getPreview() : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-900">
                        {isEditing ? 'Editar Template' : 'Novo Template'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <Icons.X size={20} className="text-slate-600" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Editor */}
                    <div className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nome do Template <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Ex: Confirmação de Exame"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Breve descrição do template"
                            />
                        </div>

                        {/* Channel */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Canal <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-3">
                                {(['email', 'whatsapp', 'sms'] as MessageChannel[]).map((ch) => (
                                    <label
                                        key={ch}
                                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg cursor-pointer transition-all ${channel === ch
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                                : 'border-slate-300 hover:border-slate-400'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="channel"
                                            value={ch}
                                            checked={channel === ch}
                                            onChange={(e) => setChannel(e.target.value as MessageChannel)}
                                            className="sr-only"
                                        />
                                        <span className="font-medium capitalize">{ch}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                            <input
                                type="text"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Ex: confirmacao, lembrete, follow-up"
                            />
                        </div>

                        {/* Subject (Email only) */}
                        {channel === 'email' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Assunto <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Ex: Confirmação - {{exam.name}}"
                                />
                            </div>
                        )}

                        {/* Body */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-700">
                                    Mensagem <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowVariables(!showVariables)}
                                        className="flex items-center gap-1 px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
                                    >
                                        <Icons.Code size={14} />
                                        Variáveis
                                    </button>
                                    {showVariables && (
                                        <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                                            {VARS.map((v) => (
                                                <button
                                                    key={v.key}
                                                    onClick={() => insertVariable(v.key)}
                                                    className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-sm border-b border-slate-100 last:border-0"
                                                >
                                                    <div className="font-medium text-slate-900">{v.label}</div>
                                                    <div className="text-xs text-slate-500">{`{{${v.key}}}`}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <textarea
                                id="template-body"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                rows={10}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                                placeholder="Digite a mensagem aqui. Use variáveis como {{contact.name}}"
                            />
                            <div className="text-xs text-slate-500 mt-1">{body.length} caracteres</div>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Adicionar tag"
                                />
                                <button
                                    onClick={addTag}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                                >
                                    Adicionar
                                </button>
                            </div>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                                        >
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="hover:text-indigo-900">
                                                <Icons.X size={14} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Active Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-700 font-medium">Template ativo</span>
                        </label>
                    </div>

                    {/* Right Column - Preview */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">Preview</h3>
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                {showPreview ? 'Ocultar' : 'Mostrar'}
                            </button>
                        </div>

                        {showPreview && preview && (
                            <div className="border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
                                {channel === 'email' && preview.subject && (
                                    <div className="mb-4 pb-4 border-b border-slate-300">
                                        <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Assunto</div>
                                        <div className="text-slate-900 font-medium">{preview.subject}</div>
                                    </div>
                                )}
                                <div className="text-xs text-slate-500 font-semibold uppercase mb-2">Mensagem</div>
                                <div className="text-slate-800 whitespace-pre-wrap">{preview.body}</div>
                            </div>
                        )}

                        {showPreview && (
                            <div className="text-xs text-slate-500 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                💡 <strong>Preview usa dados de exemplo.</strong> Os valores reais serão substituídos ao enviar.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {saving && <Icons.Loader2 size={16} className="animate-spin" />}
                        {saving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar Template'}
                    </button>
                </div>
            </div>
        </div>
    );
};
