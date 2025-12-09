
import React, { useState } from 'react';
import { Campaign } from '../services/campaignService';
import { CampaignCard } from './CampaignCard';
import { Icons } from './Icons';

interface CampaignKanbanBoardProps {
    campaigns: Campaign[];
    loading: boolean;
    onEdit: (campaign: Campaign) => void;
    onDelete: (campaign: Campaign) => void;
    onViewDetails: (campaign: Campaign) => void;
    onStatusChange: (campaignId: string, newStatus: Campaign['status']) => void;
}

const Column: React.FC<{
    title: string;
    icon: React.ReactNode;
    count: number;
    color: string;
    status: Campaign['status'];
    children: React.ReactNode;
    onDrop: (campaignId: string, status: Campaign['status']) => void;
}> = ({ title, icon, count, color, status, children, onDrop }) => {
    const [isOver, setIsOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsOver(true);
    };

    const handleDragLeave = () => {
        setIsOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsOver(false);
        const campaignId = e.dataTransfer.getData('campaignId');
        if (campaignId) {
            onDrop(campaignId, status);
        }
    };

    return (
        <div
            className={`flex-1 min-w-[300px] flex flex-col h-full max-h-full transition-colors duration-200 rounded-lg ${isOver ? 'bg-indigo-50 ring-2 ring-indigo-200' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <div className={`p-3 rounded-lg ${color} mb-3 flex items-center justify-between sticky top-0 bg-opacity-95 backdrop-blur-sm z-10`}>
                <div className="flex items-center gap-2 font-semibold">
                    {icon}
                    {title}
                </div>
                <span className="bg-white/50 px-2 py-0.5 rounded text-xs font-bold">
                    {count}
                </span>
            </div>
            <div className="space-y-3 overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent flex-1">
                {children}
            </div>
        </div>
    );
};

export const CampaignKanbanBoard: React.FC<CampaignKanbanBoardProps> = ({
    campaigns,
    loading,
    onEdit,
    onDelete,
    onViewDetails,
    onStatusChange
}) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
                <Icons.Loader2 className="animate-spin" />
                Carregando quadro...
            </div>
        );
    }

    const columns: { id: Campaign['status']; title: string; icon: React.ReactNode; color: string; items: Campaign[] }[] = [
        {
            id: 'draft',
            title: 'Rascunho',
            icon: <Icons.FileText size={18} />,
            color: 'bg-slate-100 text-slate-700',
            items: campaigns.filter(c => c.status === 'draft')
        },
        {
            id: 'scheduled',
            title: 'Agendadas',
            icon: <Icons.CalendarDays size={18} />,
            color: 'bg-blue-100 text-blue-700',
            items: campaigns.filter(c => c.status === 'scheduled')
        },
        {
            id: 'active',
            title: 'Em Andamento',
            icon: <Icons.Zap size={18} />,
            color: 'bg-green-100 text-green-700',
            items: campaigns.filter(c => c.status === 'active')
        },
        {
            id: 'completed',
            title: 'Concluídas',
            icon: <Icons.CheckSquare size={18} />,
            color: 'bg-gray-100 text-gray-700',
            items: campaigns.filter(c => c.status === 'completed' || c.status === 'archived')
        }
    ];

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)] items-start">
            {columns.map(column => (
                <Column
                    key={column.id}
                    title={column.title}
                    icon={column.icon}
                    count={column.items.length}
                    color={column.color}
                    status={column.id}
                    onDrop={onStatusChange}
                >
                    {column.items.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-lg">
                            <p className="text-xs text-slate-400">Vazio</p>
                        </div>
                    ) : (
                        column.items.map(campaign => (
                            <CampaignCard
                                key={campaign.id}
                                campaign={campaign}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onViewDetails={onViewDetails}
                            />
                        ))
                    )}
                </Column>
            ))}
        </div>
    );
};
