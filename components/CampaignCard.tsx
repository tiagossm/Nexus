
import React, { useState, useRef, useEffect } from 'react';
import { Campaign } from '../services/campaignService';
import { Icons } from './Icons';

interface CampaignCardProps {
    campaign: Campaign;
    onEdit: (campaign: Campaign) => void;
    onDelete: (campaign: Campaign) => void;
    onViewDetails: (campaign: Campaign) => void;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({
    campaign,
    onEdit,
    onDelete,
    onViewDetails
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const getStatusColor = (status: Campaign['status']) => {
        const colors = {
            draft: 'bg-slate-100 text-slate-700 border-slate-200',
            scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
            active: 'bg-green-50 text-green-700 border-green-200',
            completed: 'bg-gray-50 text-gray-700 border-gray-200',
            archived: 'bg-red-50 text-red-700 border-red-200'
        };
        return colors[status] || colors.draft;
    };

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('campaignId', campaign.id);
        e.dataTransfer.effectAllowed = 'move';
        // Add a ghost image or styling here if needed
    };

    return (
        <div
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group relative cursor-grab active:cursor-grabbing"
            draggable
            onDragStart={handleDragStart}
        >
            <div className="flex items-start justify-between mb-3">
                <div
                    className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(campaign.status)}`}
                >
                    {campaign.status === 'draft' && 'Rascunho'}
                    {campaign.status === 'scheduled' && 'Agendada'}
                    {campaign.status === 'active' && 'Ativa'}
                    {campaign.status === 'completed' && 'Concluída'}
                    {campaign.status === 'archived' && 'Arquivada'}
                </div>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                        <Icons.MoreVertical size={16} />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(false);
                                    onViewDetails(campaign);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                                <Icons.Eye size={16} className="text-slate-400" />
                                Ver Detalhes
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(false);
                                    onEdit(campaign);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                                <Icons.Edit size={16} className="text-slate-400" />
                                Editar
                            </button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(false);
                                    onDelete(campaign);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                            >
                                <Icons.Trash2 size={16} className="text-red-400" />
                                Excluir
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <h3
                className="font-bold text-slate-900 mb-2 hover:text-indigo-600 cursor-pointer transition-colors"
                onClick={() => onViewDetails(campaign)}
            >
                {campaign.title}
            </h3>

            {campaign.description && (
                <p className="text-xs text-slate-500 mb-4 line-clamp-2 min-h-[2.5em]">
                    {campaign.description}
                </p>
            )}

            <div className="flex items-center gap-3 text-xs text-slate-500 pt-3 border-t border-slate-100 mt-auto">
                <div className="flex items-center gap-1.5" title="Data de Criação">
                    <Icons.Calendar size={14} className="text-slate-400" />
                    <span>{new Date(campaign.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                {campaign.start_date && (
                    <div className="flex items-center gap-1.5" title="Data de Início">
                        <Icons.Clock size={14} className="text-slate-400" />
                        <span>{new Date(campaign.start_date).toLocaleDateString('pt-BR')}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
