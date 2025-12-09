import React, { useState } from 'react';
import { Icons } from './Icons';
import { Campaign, campaignService } from '../services/campaignService';
import { AvailabilityGridEditor } from './AvailabilityGridEditor';
import { toast } from 'sonner';

interface CampaignScheduleModalProps {
    campaign: Campaign;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const CampaignScheduleModal: React.FC<CampaignScheduleModalProps> = ({
    campaign,
    isOpen,
    onClose,
    onUpdate
}) => {
    const [availability, setAvailability] = useState(campaign.custom_availability || {
        weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
        time_slots: [{ start: '08:00', end: '17:00', slots_per_hour: 4 }],
        blocked_dates: [],
        special_dates: {},
    });
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        try {
            setLoading(true);
            await campaignService.updateCampaign(campaign.id, {
                custom_availability: availability
            });
            toast.success('Grade de horários atualizada com sucesso!');
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Erro ao atualizar grade:', error);
            toast.error('Erro ao salvar alterações.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Gerenciar Grade de Horários</h2>
                        <p className="text-sm text-slate-600 mt-1">Edite a disponibilidade específica para esta campanha.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                        <Icons.X size={20} className="text-slate-600" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <AvailabilityGridEditor
                        value={availability}
                        onChange={setAvailability}
                    />
                </div>

                <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                    >
                        {loading ? (
                            <>
                                <Icons.Loader2 size={16} className="animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Icons.Save size={16} />
                                Salvar Alterações
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
