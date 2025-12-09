import React, { useState } from 'react';
import { Poll } from '../types';
import { Icons } from './Icons';

export const MeetingPolls: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('30');
  const [location, setLocation] = useState('Google Meet');

  const handleCreate = () => {
    const newPoll: Poll = {
      id: Date.now().toString(),
      title: title || 'Nova Votação',
      duration: parseInt(duration),
      location,
      status: 'pending',
      votes: 0,
      createdAt: new Date()
    };
    
    setPolls([newPoll, ...polls]);
    setIsCreating(false);
    setTitle('');
  };

  if (isCreating) {
    return (
      <div className="max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-800">Nova Votação de Horário</h2>
          <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600">
            <Icons.X size={20} />
          </button>
        </div>
        
        <div className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">O que é esta reunião?</label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ex: Planejamento Q3" 
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
               <label className="block text-sm font-semibold text-slate-700 mb-2">Duração</label>
               <select 
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none bg-white"
                >
                 <option value="15">15 min</option>
                 <option value="30">30 min</option>
                 <option value="45">45 min</option>
                 <option value="60">60 min</option>
               </select>
            </div>
            <div>
               <label className="block text-sm font-semibold text-slate-700 mb-2">Local</label>
               <select 
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none bg-white"
                >
                 <option value="Google Meet">Google Meet</option>
                 <option value="Zoom">Zoom</option>
                 <option value="Telefone">Telefone</option>
               </select>
            </div>
          </div>

          {/* Visual Simulation of Time Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Horários Propostos (Simulação)</label>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[1,2,3].map(i => (
                <div key={i} className="min-w-[140px] p-3 border border-indigo-100 bg-indigo-50/50 rounded-lg text-center cursor-pointer hover:border-indigo-300 transition-colors">
                   <div className="text-xs font-bold text-indigo-600 uppercase mb-1">Opção {i}</div>
                   <div className="font-bold text-slate-700">09:00 - 09:{duration}</div>
                </div>
              ))}
              <div className="min-w-[140px] p-3 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 hover:border-slate-400 transition-colors">
                <Icons.Plus size={18} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button onClick={handleCreate} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/20">Criar Votação</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {polls.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <Icons.BarChart2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Encontre o melhor horário</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            Crie uma votação com várias opções de horário e deixe seus convidados escolherem o que funciona melhor para todos.
          </p>
          <button 
            onClick={() => setIsCreating(true)}
            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all active:scale-95 flex items-center gap-2 mx-auto"
          >
            <Icons.Plus size={20} />
            Criar Votação
          </button>
        </div>
      ) : (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <h3 className="text-lg font-bold text-slate-800">Suas Votações</h3>
                 <button onClick={() => setIsCreating(true)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                    <Icons.Plus size={16} /> Nova
                 </button>
            </div>
            
            <div className="grid gap-4">
                {polls.map(poll => (
                    <div key={poll.id} className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-lg transition-all flex items-center justify-between group">
                        <div>
                            <h4 className="text-lg font-bold text-slate-900 mb-1">{poll.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1"><Icons.Clock size={14} /> {poll.duration} min</span>
                                <span className="flex items-center gap-1"><Icons.MapPin size={14} /> {poll.location}</span>
                                <span className="flex items-center gap-1"><Icons.Calendar size={14} /> Criado em {poll.createdAt.toLocaleDateString()}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <div className="text-center px-4 py-2 bg-slate-50 rounded-lg">
                                <div className="text-xl font-bold text-indigo-600">{poll.votes}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase">Votos</div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Copiar Link"><Icons.Copy size={18} /></button>
                                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Editar"><Icons.Settings size={18} /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

// Add MapPin to Icons if missing in previous context, adding minimal polyfill here or rely on existing icons
