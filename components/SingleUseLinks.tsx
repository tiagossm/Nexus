import React, { useState } from 'react';
import { EventType, SingleUseLink } from '../types';
import { Icons } from './Icons';

interface SingleUseLinksProps {
  events: EventType[];
}

export const SingleUseLinks: React.FC<SingleUseLinksProps> = ({ events }) => {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [generatedLinks, setGeneratedLinks] = useState<SingleUseLink[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!selectedEventId) return;

    const event = events.find(e => e.id === selectedEventId);
    if (!event) return;

    const uniqueId = Math.random().toString(36).substring(2, 10);
    const newLink: SingleUseLink = {
      id: Date.now().toString(),
      eventId: event.id,
      eventTitle: event.title,
      url: `https://nexus.com/d/${uniqueId}`, // Simulated disposable URL
      createdAt: new Date(),
      active: true
    };

    setGeneratedLinks([newLink, ...generatedLinks]);
    setSelectedEventId('');
  };

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-4xl">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Gerar link de uso único</h2>
        <p className="text-sm text-slate-500 mb-6">
          Crie um link que expira automaticamente após o convidado agendar a reunião. Ideal para oferecer horários exclusivos.
        </p>

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
              Selecione o tipo de evento
            </label>
            <div className="relative">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full p-3 pl-4 bg-slate-50 border border-slate-200 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-700 font-medium transition-all"
              >
                <option value="" disabled>Escolha um evento...</option>
                {events.map(evt => (
                  <option key={evt.id} value={evt.id}>{evt.title} ({evt.duration} min)</option>
                ))}
              </select>
              <Icons.ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={!selectedEventId}
            className={`
              px-6 py-3 rounded-xl font-bold text-white transition-all flex items-center gap-2 shadow-lg
              ${!selectedEventId 
                ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30 active:scale-95'}
            `}
          >
            <Icons.Sparkles size={18} />
            Gerar Link
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-1">Links Ativos</h3>
        
        {generatedLinks.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Icons.Link size={20} />
            </div>
            <p className="text-slate-500 font-medium">Nenhum link gerado ainda.</p>
          </div>
        ) : (
          generatedLinks.map(link => (
            <div key={link.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-800">{link.eventTitle}</span>
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">Ativo</span>
                </div>
                <p className="text-xs text-slate-400">Criado em {link.createdAt.toLocaleDateString()} às {link.createdAt.toLocaleTimeString()}</p>
              </div>

              <div className="flex items-center gap-4">
                <code className="text-sm bg-slate-50 px-3 py-1.5 rounded-lg text-slate-600 border border-slate-100 select-all">
                  {link.url}
                </code>
                <button
                  onClick={() => handleCopy(link.id, link.url)}
                  className={`p-2 rounded-lg transition-colors ${
                    copiedId === link.id 
                      ? 'bg-green-100 text-green-600' 
                      : 'hover:bg-indigo-50 text-slate-400 hover:text-indigo-600'
                  }`}
                >
                  {copiedId === link.id ? <Icons.Check size={18} /> : <Icons.Copy size={18} />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};