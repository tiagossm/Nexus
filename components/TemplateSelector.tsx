import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { MessageTemplate, MessageChannel } from '../types';
import { listTemplates } from '../services/messageTemplateService';

interface TemplateSelectorProps {
    channel: MessageChannel;
    selectedTemplateId?: string;
    onSelect: (template: MessageTemplate | null) => void;
    onUseTemplate: (subject: string, body: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
    channel,
    selectedTemplateId,
    onSelect,
    onUseTemplate
}) => {
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, [channel]);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await listTemplates({ channel, isActive: true });
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (template: MessageTemplate) => {
        onSelect(template);
        onUseTemplate(template.subject || '', template.body);
        setIsOpen(false);
    };

    const handleClear = () => {
        onSelect(null);
        setIsOpen(false);
    };

    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

    return (
        <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">
                Template
            </label>

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-300 rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <span className={`block truncate ${!selectedTemplate ? 'text-slate-500' : 'text-slate-900'}`}>
                        {selectedTemplate ? selectedTemplate.name : 'Selecione um template ou crie do zero'}
                    </span>
                    <Icons.ChevronDown size={16} className="text-slate-400" />
                </button>

                {isOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                        <div className="p-2 border-b border-slate-100">
                            <button
                                onClick={handleClear}
                                className="w-full text-left px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-md transition-colors flex items-center gap-2"
                            >
                                <Icons.Plus size={16} />
                                <span className="font-medium">Criar sem template (do zero)</span>
                            </button>
                        </div>

                        {loading ? (
                            <div className="px-4 py-2 text-slate-500 text-center">Carregando...</div>
                        ) : templates.length === 0 ? (
                            <div className="px-4 py-2 text-slate-500 text-center">Nenhum template encontrado</div>
                        ) : (
                            templates.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => handleSelect(template)}
                                    className={`w-full text-left px-4 py-2 hover:bg-indigo-50 transition-colors ${selectedTemplateId === template.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-900'}`}
                                >
                                    <div className="font-medium">{template.name}</div>
                                    <div className="text-xs text-slate-500 truncate mt-0.5">
                                        {template.subject ? `${template.subject} - ` : ''}{template.body}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {selectedTemplate && (
                <div className="mt-1 text-xs text-indigo-600 flex items-center gap-1">
                    <Icons.Check size={12} />
                    Template carregado. Você pode editar o conteúdo abaixo.
                </div>
            )}
        </div>
    );
};
