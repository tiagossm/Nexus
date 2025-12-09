import React from 'react';
import { EventType, UserProfile } from '../types';
import { Icons } from './Icons';

interface PublicProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  events: EventType[];
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({ isOpen, onClose, user, events }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-white overflow-y-auto animate-in slide-in-from-bottom-10 duration-300">
       {/* Top Bar simulating browser */}
       <div className="sticky top-0 z-10 bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 text-sm opacity-80">
              <Icons.Globe size={14} />
              <span>nexus.com/{user.name.toLowerCase().replace(/\s/g, '')}</span>
          </div>
          <button 
            onClick={onClose} 
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold transition-colors"
          >
              <Icons.X size={14} />
              Fechar Visualização
          </button>
       </div>

       <div className="min-h-screen bg-slate-50 pb-20">
          {/* Profile Header */}
          <div className="bg-white border-b border-slate-200 pt-12 pb-8 px-6 text-center">
              <div className="w-24 h-24 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold text-slate-500 border-4 border-white shadow-lg">
                  {user.avatarInitials}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{user.name}</h1>
              <p className="text-slate-500 max-w-lg mx-auto">
                  Bem-vindo à minha página de agendamento. Por favor, siga as instruções para adicionar um evento ao meu calendário.
              </p>
          </div>

          {/* Events Grid */}
          <div className="max-w-3xl mx-auto mt-12 px-6">
              <div className="grid gap-4">
                  {events.length === 0 ? (
                      <div className="text-center text-slate-400 py-10">Nenhum evento público disponível.</div>
                  ) : (
                      events.map(event => (
                          <div key={event.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex justify-between items-center">
                              <div className="flex items-start gap-4">
                                  <div className={`w-1.5 self-stretch rounded-full`} style={{ backgroundColor: event.color }}></div>
                                  <div>
                                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{event.title}</h3>
                                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                          <span className="flex items-center gap-1 font-medium"><Icons.Clock size={14} /> {event.duration} min</span>
                                          <span className="flex items-center gap-1"><Icons.MapPin size={14} /> {event.location}</span>
                                      </div>
                                  </div>
                              </div>
                              <Icons.ChevronRight className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                          </div>
                      ))
                  )}
              </div>
          </div>
          
          <div className="text-center mt-16">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Powered by Nexus</span>
          </div>
       </div>
    </div>
  );
};