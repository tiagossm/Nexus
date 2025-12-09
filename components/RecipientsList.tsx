import React, { useState, useMemo } from 'react';
import { Icons } from './Icons';
import { CampaignRecipient } from '../services/campaignService';
import * as campaignRecipientService from '../services/campaignRecipientService';
import { toast } from 'sonner';

interface RecipientsListProps {
    recipients: CampaignRecipient[];
    onRemove: (recipientId: string) => void;
    onResend: (recipientId: string) => void;
    onBulkRemove: (recipientIds: string[]) => void;
    onBulkResend: (recipientIds: string[]) => void;
    onAddRecipients: () => void;
    onRefresh: () => void;
    sending?: boolean;
}

type StatusFilter = 'all' | 'pending' | 'sent' | 'opened' | 'clicked' | 'booked';

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'Pendente', color: 'text-amber-700', bg: 'bg-amber-100' },
    sent: { label: 'Enviado', color: 'text-blue-700', bg: 'bg-blue-100' },
    opened: { label: 'Aberto', color: 'text-purple-700', bg: 'bg-purple-100' },
    clicked: { label: 'Clicou', color: 'text-indigo-700', bg: 'bg-indigo-100' },
    booked: { label: 'Agendado', color: 'text-green-700', bg: 'bg-green-100' }
};

export const RecipientsList: React.FC<RecipientsListProps> = ({
    recipients,
    onRemove,
    onResend,
    onBulkRemove,
    onBulkResend,
    onAddRecipients,
    onRefresh,
    sending = false
}) => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showConfirmRemove, setShowConfirmRemove] = useState<string | null>(null);

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

    // Status counts
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: recipients.length };
        recipients.forEach(r => {
            counts[r.status] = (counts[r.status] || 0) + 1;
        });
        return counts;
    }, [recipients]);

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
            onRemove(recipientId);
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
            onBulkRemove(Array.from(selectedIds));
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
            onRefresh();
            setSelectedIds(new Set());
        } catch (error) {
            console.error('Erro ao resetar:', error);
            toast.error('Erro ao resetar destinatários');
        }
    };

    return (
        <div className="space-y-4">
            {/* Header with counts */}
            <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Icons.Users size={18} className="text-indigo-600" />
                    Destinatários ({recipients.length})
                </h4>
                <button
                    onClick={onAddRecipients}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-sm font-medium flex items-center gap-1"
                >
                    <Icons.Plus size={14} />
                    Adicionar
                </button>
            </div>

            {/* Status filter tabs */}
            <div className="flex flex-wrap gap-2">
                {(['all', 'pending', 'sent', 'opened', 'clicked', 'booked'] as StatusFilter[]).map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${statusFilter === status
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        {status === 'all' ? 'Todos' : statusLabels[status]?.label || status}
                        <span className="ml-1 opacity-75">({statusCounts[status] || 0})</span>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome ou email..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
            </div>

            {/* Bulk actions */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <span className="text-sm text-indigo-700 font-medium">
                        {selectedIds.size} selecionado(s)
                    </span>
                    <div className="flex-1" />
                    <button
                        onClick={handleBulkReset}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-all flex items-center gap-1"
                    >
                        <Icons.RefreshCw size={12} />
                        Resetar p/ Reenvio
                    </button>
                    <button
                        onClick={handleBulkRemove}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-all flex items-center gap-1"
                    >
                        <Icons.Trash2 size={12} />
                        Remover
                    </button>
                </div>
            )}

            {/* Recipients list */}
            <div className="bg-slate-50 rounded-lg border border-slate-200 max-h-[400px] overflow-y-auto">
                {/* Select all header */}
                {filteredRecipients.length > 0 && (
                    <div className="p-2 border-b border-slate-200 bg-slate-100 sticky top-0 z-10">
                        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedIds.size === filteredRecipients.length && filteredRecipients.length > 0}
                                onChange={selectAll}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            Selecionar todos ({filteredRecipients.length})
                        </label>
                    </div>
                )}

                {filteredRecipients.map((recipient) => {
                    const contact = recipient.contact || (recipient as any).contacts;
                    const statusInfo = statusLabels[recipient.status] || { label: recipient.status, color: 'text-slate-600', bg: 'bg-slate-100' };

                    return (
                        <div
                            key={recipient.id}
                            className={`p-3 border-b border-slate-200 last:border-b-0 flex items-center gap-3 hover:bg-slate-100 transition-all ${selectedIds.has(recipient.id) ? 'bg-indigo-50' : ''
                                }`}
                        >
                            {/* Checkbox */}
                            <input
                                type="checkbox"
                                checked={selectedIds.has(recipient.id)}
                                onChange={() => toggleSelection(recipient.id)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />

                            {/* Avatar */}
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                                {contact?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900 truncate">
                                    {contact?.name || 'Sem nome'}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                    {contact?.email || 'Sem email'}
                                </div>
                            </div>

                            {/* Status */}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                                {statusInfo.label}
                            </span>

                            {/* Invite count */}
                            {recipient.invite_count > 0 && (
                                <span className="text-xs text-slate-400" title="Convites enviados">
                                    {recipient.invite_count}x
                                </span>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                                {recipient.status !== 'booked' && (
                                    <button
                                        onClick={() => onResend(recipient.id)}
                                        disabled={sending}
                                        className="p-1.5 hover:bg-slate-200 rounded text-slate-500 hover:text-indigo-600 transition-all disabled:opacity-50"
                                        title="Reenviar convite"
                                    >
                                        <Icons.RefreshCw size={14} />
                                    </button>
                                )}

                                {showConfirmRemove === recipient.id ? (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleRemove(recipient.id)}
                                            className="p-1 bg-red-600 text-white rounded text-xs"
                                            title="Confirmar remoção"
                                        >
                                            <Icons.Check size={12} />
                                        </button>
                                        <button
                                            onClick={() => setShowConfirmRemove(null)}
                                            className="p-1 bg-slate-300 text-slate-700 rounded text-xs"
                                            title="Cancelar"
                                        >
                                            <Icons.X size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowConfirmRemove(recipient.id)}
                                        className="p-1.5 hover:bg-red-100 rounded text-slate-400 hover:text-red-600 transition-all"
                                        title="Remover da campanha"
                                    >
                                        <Icons.Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {filteredRecipients.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                        {recipients.length === 0 ? (
                            <>
                                <Icons.Users size={32} className="mx-auto mb-2 opacity-50" />
                                <p>Nenhum destinatário adicionado</p>
                                <button
                                    onClick={onAddRecipients}
                                    className="mt-2 text-indigo-600 hover:underline text-sm"
                                >
                                    Adicionar destinatários
                                </button>
                            </>
                        ) : (
                            <>
                                <Icons.Search size={32} className="mx-auto mb-2 opacity-50" />
                                <p>Nenhum resultado encontrado</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipientsList;
