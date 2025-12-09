import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { listTemplates, deleteTemplate, duplicateTemplate } from '../services/messageTemplateService';
import type { MessageTemplate, MessageChannel } from '../types';
import { MessageTemplateEditorModal } from './MessageTemplateEditorModal';
import { toast } from 'sonner';

const CHANNEL_ICONS: Record<MessageChannel, React.ReactNode> = {
    email: <Icons.Mail size={18} />,
    whatsapp: <Icons.MessageSquare size={18} />,
    sms: <Icons.MessageSquare size={18} />,
};

const CHANNEL_COLORS: Record<MessageChannel, string> = {
    email: 'bg-blue-100 text-blue-700',
    whatsapp: 'bg-green-100 text-green-700',
    sms: 'bg-purple-100 text-purple-700',
};

export const MessageTemplateManager: React.FC = () => {
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [channelFilter, setChannelFilter] = useState<MessageChannel | 'all'>('all');
    const [showInactive, setShowInactive] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | undefined>();

    useEffect(() => {
        loadTemplates();
    }, [channelFilter, showInactive, searchTerm]);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const filters = {
                channel: channelFilter !== 'all' ? channelFilter : undefined,
                isActive: showInactive ? undefined : true,
                search: searchTerm || undefined,
            };
            const data = await listTemplates(filters);
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
            toast.error('Erro ao carregar templates');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (template: MessageTemplate) => {
        setEditingTemplate(template);
        setEditorOpen(true);
    };

    const handleCreate = () => {
        setEditingTemplate(undefined);
        setEditorOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o template "${name}"?`)) return;

        try {
            await deleteTemplate(id);
            toast.success('Template excluído com sucesso');
            loadTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
            toast.error('Erro ao excluir template');
        }
    };

    const handleDuplicate = async (id: string) => {
        try {
            await duplicateTemplate(id);
            toast.success('Template duplicado com sucesso');
            loadTemplates();
        } catch (error) {
            console.error('Error duplicating template:', error);
            toast.error('Erro ao duplicar template');
        }
    };

    const handleSaved = () => {
        setEditorOpen(false);
        setEditingTemplate(undefined);
        loadTemplates();
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Templates de Mensagens</h2>
                    <p className="text-slate-600 mt-1">Gerencie templates reutilizáveis para Email, WhatsApp e SMS</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                >
                    <Icons.Plus size={20} />
                    <span className="font-medium">Novo Template</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
                <div className="flex gap-3">
                    <select
                        value={channelFilter}
                        onChange={(e) => setChannelFilter(e.target.value as MessageChannel | 'all')}
                        className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Todos  os canais</option>
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="sms">SMS</option>
                    </select>
                    <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-700">Mostrar inativos</span>
                    </label>
                </div>
            </div>

            {/* Templates List */}
            {loading ? (
                <div className="text-center py-12">
                    <Icons.Loader2 className="animate-spin mx-auto text-indigo-600" size={40} />
                    <p className="text-slate-600 mt-4">Carregando templates...</p>
                </div>
            ) : templates.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-12 text-center">
                    <Icons.FileText className="mx-auto text-slate-400" size={48} />
                    <h3 className="text-lg font-semibold text-slate-900 mt-4">Nenhum template encontrado</h3>
                    <p className="text-slate-600 mt-2">
                        {searchTerm ? 'Tente ajustar seus filtros de busca' : 'Comece criando seu primeiro template'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={handleCreate}
                            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            Criar Template
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Nome
                                </th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Canal
                                </th>
                                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Preview
                                </th>
                                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    Ações
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {templates.map((template) => (
                                <tr key={template.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium text-slate-900">{template.name}</div>
                                            {template.description && (
                                                <div className="text-sm text-slate-500 mt-1">{template.description}</div>
                                            )}
                                            {template.tags && template.tags.length > 0 && (
                                                <div className="flex gap-1 mt-2">
                                                    {template.tags.map((tag) => (
                                                        <span
                                                            key={tag}
                                                            className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${CHANNEL_COLORS[template.channel]
                                                }`}
                                        >
                                            {CHANNEL_ICONS[template.channel]}
                                            {template.channel === 'email'
                                                ? 'Email'
                                                : template.channel === 'whatsapp'
                                                    ? 'WhatsApp'
                                                    : 'SMS'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-600 line-clamp-2 max-w-md">
                                            {template.subject && <strong>{template.subject}: </strong>}
                                            {template.body.substring(0, 100)}
                                            {template.body.length > 100 && '...'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {template.is_active ? (
                                            <span className="inline-flex items-center gap-1 text-green-700 text-sm font-medium">
                                                <Icons.Check size={16} />
                                                Ativo
                                            </span>
                                        ) : (
                                            <span className="text-slate-500 text-sm">Inativo</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(template)}
                                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Icons.Edit size={18} className="text-slate-600" />
                                            </button>
                                            <button
                                                onClick={() => handleDuplicate(template.id)}
                                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                title="Duplicar"
                                            >
                                                <Icons.Copy size={18} className="text-slate-600" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(template.id, template.name)}
                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Icons.Trash2 size={18} className="text-red-600" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Editor Modal */}
            {editorOpen && (
                <MessageTemplateEditorModal
                    template={editingTemplate}
                    onClose={() => {
                        setEditorOpen(false);
                        setEditingTemplate(undefined);
                    }}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
};
