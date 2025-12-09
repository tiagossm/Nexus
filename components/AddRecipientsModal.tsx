import React, { useState } from 'react';
import { Icons } from './Icons';
import { toast } from 'sonner';
import { ContactSelector } from './ContactSelector';
import * as campaignRecipientService from '../services/campaignRecipientService';

interface AddRecipientsModalProps {
    campaignId: string;
    onClose: () => void;
}

/**
 * Modal used after creating a campaign to add recipients (contacts) to it.
 * It reuses the existing ContactSelector component for selecting contacts.
 */
export const AddRecipientsModal: React.FC<AddRecipientsModalProps> = ({ campaignId, onClose }) => {
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        if (!campaignId) return;
        try {
            setLoading(true);
            await campaignRecipientService.addRecipientsToCampaign(campaignId, contacts);
            toast.success('Destinatários adicionados com sucesso!');
            onClose();
        } catch (error) {
            console.error('Erro ao adicionar destinatários:', error);
            toast.error('Falha ao adicionar destinatários');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Adicionar Destinatários</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                        <Icons.X size={20} className="text-slate-600" />
                    </button>
                </div>
                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
                    <ContactSelector onContactsSelected={setContacts} initialContacts={contacts} />
                </div>
                {/* Footer */}
                <div className="p-4 border-t border-slate-200 flex justify-end space-x-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={contacts.length === 0 || loading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Adicionando...' : 'Adicionar Destinatários'}
                    </button>
                </div>
            </div>
        </div>
    );
};


