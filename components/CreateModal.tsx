import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { generateEventDetails } from '../services/geminiService';
import { EventType } from '../types';
import { useRateLimit } from '../hooks/useRateLimit';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEvent: (event: EventType) => void;
}

export const CreateModal: React.FC<CreateModalProps> = ({ isOpen, onClose, onAddEvent }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rate limiting: máximo 10 chamadas por minuto
  const { checkLimit, isLimited, remainingCalls } = useRateLimit({
    maxCalls: 10,
    windowMs: 60000, // 1 minuto
  });

  // Focus management
  useEffect(() => {
    if (isOpen) {
      const previousFocus = document.activeElement as HTMLElement;
      // Focar no textarea quando abrir
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);

      return () => {
        previousFocus?.focus();
      };
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSmartCreate = async () => {
    if (!prompt.trim()) {
      setError('Por favor, descreva a reunião que deseja criar.');
      return;
    }

    // Verificar rate limiting
    if (!checkLimit()) {
      setError('Muitas requisições. Aguarde um momento antes de tentar novamente.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const result = await generateEventDetails(prompt);

      // Create a new event object from AI result
      const newEvent: EventType = {
        id: Date.now().toString(),
        title: result.title,
        duration: result.duration,
        location: result.location,
        description: result.description,
        type: 'One-on-One',
        active: true,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16), // Random color
        url: `https://calendly.com/user/${result.title.toLowerCase().replace(/\s/g, '-')}`
      };

      onAddEvent(newEvent);
      setPrompt('');
      setError(null);
      onClose();
    } catch (e) {
      console.error("Failed to generate", e);
      setError(e instanceof Error ? e.message : 'Erro ao gerar evento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div ref={modalRef} className="bg-white w-[500px] rounded-xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 id="modal-title" className="text-xl font-semibold flex items-center gap-2">
            <Icons.Sparkles className="text-blue-600 fill-blue-100" />
            Criação Inteligente de Evento
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icons.Plus className="rotate-45" size={24} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Descreva a reunião que deseja criar e nossa IA definirá o título, duração e local para você.
          </p>

          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="ex: Uma chamada de revisão de orçamento de 45 minutos com a equipe de marketing no Zoom."
            className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-32 text-sm"
          />

          {/* Error Message */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <Icons.Zap className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Rate Limit Info */}
          {isLimited && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <Icons.Zap className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-sm text-amber-700">
                Limite de requisições atingido. Aguarde um momento.
              </p>
            </div>
          )}

          {!isLimited && remainingCalls <= 3 && remainingCalls > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              {remainingCalls} {remainingCalls === 1 ? 'requisição restante' : 'requisições restantes'} neste minuto
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-full"
            >
              Cancelar
            </button>
            <button
              onClick={handleSmartCreate}
              disabled={isLoading || !prompt || isLimited}
              className={`px-6 py-2 text-sm font-medium text-white rounded-full flex items-center gap-2 transition-all
                ${isLoading || !prompt || isLimited ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
              `}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Icons.Sparkles size={16} />
                  Gerar Evento
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};