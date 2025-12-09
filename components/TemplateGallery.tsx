import React, { useState, useMemo } from 'react';
import { Icons } from './Icons';
import { MessageChannel } from '../types';
import {
    getLibraryTemplates,
    getTemplatesByChannel,
    searchTemplates,
    TemplateLibraryItem
} from '../services/templateLibraryService';

interface TemplateGalleryProps {
    channel?: MessageChannel;
    onSelect: (template: TemplateLibraryItem) => void;
    onClose: () => void;
}

const CHANNEL_ICONS = {
    email: '📧',
    whatsapp: '💬',
    sms: '📱'
};

const CHANNEL_LABELS = {
    email: 'Email',
    whatsapp: 'WhatsApp',
    sms: 'SMS'
};

const CATEGORY_LABELS = {
    formal: 'Formal',
    friendly: 'Amigável',
    urgent: 'Urgente',
    reminder: 'Lembrete',
    confirmation: 'Confirmação'
};

const CATEGORY_COLORS = {
    formal: 'bg-blue-100 text-blue-700',
    friendly: 'bg-green-100 text-green-700',
    urgent: 'bg-red-100 text-red-700',
    reminder: 'bg-orange-100 text-orange-700',
    confirmation: 'bg-purple-100 text-purple-700'
};

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
    channel,
    onSelect,
    onClose
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedChannel, setSelectedChannel] = useState<MessageChannel | 'all'>(channel || 'all');
    const [previewTemplate, setPreviewTemplate] = useState<TemplateLibraryItem | null>(null);

    const templates = useMemo(() => {
        let filtered = searchTerm
            ? searchTemplates(searchTerm)
            : getLibraryTemplates();

        if (selectedChannel !== 'all') {
            filtered = filtered.filter(t => t.channel === selectedChannel);
        }

        return filtered;
    }, [searchTerm, selectedChannel]);

    const handleSelectTemplate = (template: TemplateLibraryItem) => {
        onSelect(template);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Icons.FileText size={24} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Biblioteca de Templates</h2>
                            <p className="text-sm text-slate-500">Escolha um template pronto para começar</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <Icons.X size={20} className="text-slate-600" />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-6 py-4 border-b border-slate-200 space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Channel Filter */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedChannel('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedChannel === 'all'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            Todos
                        </button>
                        {(['email', 'whatsapp', 'sms'] as MessageChannel[]).map(ch => (
                            <button
                                key={ch}
                                onClick={() => setSelectedChannel(ch)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedChannel === ch
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                            >
                                {CHANNEL_ICONS[ch]} {CHANNEL_LABELS[ch]}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Templates Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    {templates.length === 0 ? (
                        <div className="text-center py-12">
                            <Icons.Search size={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-500 text-lg font-medium">Nenhum template encontrado</p>
                            <p className="text-slate-400 text-sm mt-1">Tente ajustar os filtros ou busca</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map(template => (
                                <TemplateCard
                                    key={template.id}
                                    template={template}
                                    onSelect={() => handleSelectTemplate(template)}
                                    onPreview={() => setPreviewTemplate(template)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                            <strong>{templates.length}</strong> template{templates.length !== 1 ? 's' : ''} disponível{templates.length !== 1 ? 'is' : ''}
                        </div>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {previewTemplate && (
                <TemplatePreviewModal
                    template={previewTemplate}
                    onClose={() => setPreviewTemplate(null)}
                    onUse={() => handleSelectTemplate(previewTemplate)}
                />
            )}
        </div>
    );
};

// Template Card Component
interface TemplateCardProps {
    template: TemplateLibraryItem;
    onSelect: () => void;
    onPreview: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect, onPreview }) => {
    return (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-all group">
            {/* Header */}
            <div className="p-4 border-b border-slate-100">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{CHANNEL_ICONS[template.channel]}</span>
                        <div>
                            <h3 className="font-semibold text-slate-900">{template.name}</h3>
                            <p className="text-xs text-slate-500">{CHANNEL_LABELS[template.channel]}</p>
                        </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${CATEGORY_COLORS[template.category]}`}>
                        {CATEGORY_LABELS[template.category]}
                    </span>
                </div>
                <p className="text-sm text-slate-600">{template.description}</p>
            </div>

            {/* Preview */}
            <div className="p-4 bg-slate-50">
                <div className="text-xs text-slate-700 line-clamp-3 font-mono bg-white p-2 rounded border border-slate-200">
                    {template.preview}
                </div>
            </div>

            {/* Actions */}
            <div className="p-3 flex gap-2">
                <button
                    onClick={onPreview}
                    className="flex-1 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                    <Icons.Eye size={14} className="inline mr-1" />
                    Preview
                </button>
                <button
                    onClick={onSelect}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                    <Icons.Check size={14} className="inline mr-1" />
                    Usar
                </button>
            </div>

            {/* Tags */}
            <div className="px-4 pb-3 flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    );
};

// Template Preview Modal
interface TemplatePreviewModalProps {
    template: TemplateLibraryItem;
    onClose: () => void;
    onUse: () => void;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({ template, onClose, onUse }) => {
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{CHANNEL_ICONS[template.channel]}</span>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">{template.name}</h3>
                            <p className="text-sm text-slate-500">{template.description}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
                        <Icons.X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {template.subject && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Assunto:</label>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-sm">
                                {template.subject}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Mensagem:</label>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-sm whitespace-pre-wrap">
                            {template.body}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Tags:</label>
                        <div className="flex flex-wrap gap-2">
                            {template.tags.map(tag => (
                                <span key={tag} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={onUse}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors font-medium"
                    >
                        <Icons.Check size={16} className="inline mr-2" />
                        Usar Este Template
                    </button>
                </div>
            </div>
        </div>
    );
};
