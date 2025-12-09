import React, { useState } from 'react';
import { EventType } from '../types';
import { Icons } from './Icons';

interface EventCardProps {
  event: EventType;
  onToggle: (id: string, newStatus: boolean) => void;
  onOpenBooking: (event: EventType) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onToggle, onOpenBooking }) => {
  const TypeIcon = event.type === 'Group' ? Icons.Users : Icons.User;
  const isActive = event.active;
  const [isCopied, setIsCopied] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const handleCopyLink = async () => {
    try {
      // Fallback for demo purposes if url is '...'
      const urlToShare = event.url === '...' || !event.url
        ? `https://nexus.com/${event.title.toLowerCase().replace(/\s/g, '-')}`
        : event.url;

      await navigator.clipboard.writeText(urlToShare);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleShare = async () => {
    const urlToShare = event.url === '...' || !event.url
      ? `https://nexus.com/${event.title.toLowerCase().replace(/\s/g, '-')}`
      : event.url;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description || `Agende um horário para ${event.title}`,
          url: urlToShare,
        });
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default checkbox behavior

    if (isActive) {
      // If currently active, we are trying to deactivate -> show confirm
      setShowDeactivateConfirm(true);
    } else {
      // If currently inactive, just activate immediately
      onToggle(event.id, true);
    }
  };

  const confirmDeactivate = () => {
    onToggle(event.id, false);
    setShowDeactivateConfirm(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 hover:border-indigo-100 shadow-sm hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300 flex flex-col h-full group overflow-hidden relative">

      {/* Deactivation Confirmation Overlay */}
      {showDeactivateConfirm && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
            <Icons.Zap size={24} />
          </div>
          <h4 className="text-lg font-bold text-slate-800 mb-1">Tem certeza?</h4>
          <p className="text-sm text-slate-500 mb-6">Deseja desativar este evento? As pessoas não poderão mais agendá-lo.</p>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setShowDeactivateConfirm(false)}
              className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDeactivate}
              className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors text-sm shadow-md shadow-red-200"
            >
              Desativar
            </button>
          </div>
        </div>
      )}

      <div className={`p-6 flex flex-col h-full transition-opacity duration-300 ${!isActive ? 'opacity-60 grayscale-[0.5]' : ''}`}>
        <div className="flex justify-between items-start mb-4">
          {/* Type Badge with Color */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
            style={{ backgroundColor: `${event.color}15`, color: event.color }}
          >
            <TypeIcon size={12} strokeWidth={3} />
            {event.type === 'One-on-One' ? '1:1' : 'Grupo'}
          </div>

          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              aria-label={`Configurações do evento ${event.title}`}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Icons.Settings size={16} />
            </button>
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-800 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
          {event.title}
        </h3>

        {/* Meta Details */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mb-4">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
            <Icons.Clock size={14} className="text-slate-400" />
            <span className="font-medium">{event.duration} min</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="font-medium">{event.location}</span>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-slate-500 mb-5 line-clamp-2 leading-relaxed border-l-2 border-slate-100 pl-3 italic">
            "{event.description}"
          </p>
        )}

        <div className="mt-auto space-y-3">
          {/* Action: View Booking Page */}
          <button
            onClick={() => onOpenBooking(event)}
            aria-label={`Ver página de agendamento para ${event.title}`}
            className="w-full py-2 rounded-lg border border-indigo-100 text-indigo-600 font-medium text-sm hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center justify-center gap-2 group/btn"
          >
            <Icons.Globe size={16} />
            Ver página de agendamento
            <Icons.ExternalLink size={14} className="opacity-0 group-hover/btn:opacity-100 transition-opacity" />
          </button>

          <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
            <button
              onClick={handleCopyLink}
              aria-label="Copiar link do evento"
              className="text-slate-500 text-xs font-semibold hover:text-indigo-600 flex items-center gap-1 group/link transition-all min-w-[100px]"
            >
              {isCopied ? (
                <>
                  <Icons.Check size={14} className="text-green-600" />
                  <span className="text-green-600">Copiado!</span>
                </>
              ) : (
                <>
                  <Icons.Link size={14} />
                  Copiar link
                </>
              )}
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleClick}
                role="switch"
                aria-checked={isActive}
                aria-label={`${isActive ? 'Desativar' : 'Ativar'} evento ${event.title}`}
                className="relative inline-flex items-center cursor-pointer scale-75 origin-right"
              >
                <div className={`w-9 h-5 rounded-full transition-colors duration-200 ease-in-out ${isActive ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                <div className={`absolute left-[2px] top-[2px] bg-white border border-gray-300 rounded-full h-4 w-4 transition-transform duration-200 ease-in-out ${isActive ? 'translate-x-4 border-white' : 'translate-x-0'}`}></div>
              </button>

              <button
                onClick={handleShare}
                aria-label={`Compartilhar evento ${event.title}`}
                className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 hover:bg-indigo-50 rounded-full"
                title="Compartilhar"
              >
                <Icons.Share2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};