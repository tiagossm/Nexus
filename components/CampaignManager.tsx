import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { campaignService, Campaign } from '../services/campaignService';
import { getEvents } from '../services/supabaseService';
import { CreateCampaignModal } from './CreateCampaignModal';
import { CampaignDetailsModal } from './CampaignDetailsModal';
import { CampaignKanbanBoard } from './CampaignKanbanBoard';
import { EventType } from '../types';
import { toast } from 'sonner';

export const CampaignManager: React.FC = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [events, setEvents] = useState<EventType[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<Campaign['status'] | 'all'>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [campaignToEdit, setCampaignToEdit] = useState<Campaign | null>(null);

    useEffect(() => {
        loadData();
    }, [filter]);

    const loadData = async () => {
        try {
            setLoading(true);
            const filterStatus = filter === 'all' ? undefined : filter;
            const [campaignsData, eventsData] = await Promise.all([
                campaignService.getCampaigns(filterStatus),
                getEvents()
            ]);
            setCampaigns(campaignsData);
            setEvents(eventsData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (campaign: Campaign) => {
        if (confirm('Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.')) {
            try {
                setLoading(true);
                await campaignService.deleteCampaign(campaign.id);
                toast.success('Campanha excluída com sucesso');
                loadData();
            } catch (error) {
                console.error('Erro ao excluir campanha:', error);
                toast.error('Erro ao excluir campanha');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleStatusChange = async (campaignId: string, newStatus: Campaign['status']) => {
        try {
            // Optimistic update (optional, but good for UX) or just loading
            setLoading(true);
            await campaignService.updateCampaign(campaignId, { status: newStatus });
            toast.success(`Campanha movida para ${newStatus === 'draft' ? 'Rascunho' : newStatus === 'scheduled' ? 'Agendadas' : newStatus === 'active' ? 'Ativas' : 'Concluídas'}`);
            loadData();
        } catch (error) {
            console.error('Erro ao mover campanha:', error);
            toast.error('Erro ao atualizar status da campanha');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto h-full flex flex-col">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">Campanhas</h2>
                    <p className="text-slate-600 text-sm">Gerencie o fluxo de suas campanhas e convocações.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30 font-medium text-sm"
                >
                    <Icons.Plus size={18} />
                    Nova Campanha
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-hidden">
                <CampaignKanbanBoard
                    campaigns={campaigns}
                    loading={loading}
                    onEdit={(campaign) => {
                        setCampaignToEdit(campaign);
                        setShowCreateModal(true);
                    }}
                    onDelete={handleDelete}
                    onViewDetails={(campaign) => setSelectedCampaign(campaign)}
                    onStatusChange={handleStatusChange}
                />
            </div>

            {/* Create Campaign Modal */}
            <CreateCampaignModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    loadData();
                    setCampaignToEdit(null);
                }}
                events={events}
                campaignToEdit={campaignToEdit}
            />

            {/* Campaign Details Modal */}
            <CampaignDetailsModal
                isOpen={!!selectedCampaign}
                onClose={() => setSelectedCampaign(null)}
                campaign={selectedCampaign}
                onEdit={(campaign) => {
                    setSelectedCampaign(null);
                    setCampaignToEdit(campaign);
                    setShowCreateModal(true);
                }}
            />
        </div>
    );
};
