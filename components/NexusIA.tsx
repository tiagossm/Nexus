import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { generateResponse } from '../services/geminiService';

// Contexto do Sistema (Extraído do README)
const SYSTEM_CONTEXT = `
# Nexus Agenda - Manual do Sistema
O Nexus Agenda é um sistema de agendamento moderno com IA (Google Gemini) e Supabase.
Funcionalidades principais:
- Agendamento de reuniões (Google Meet, Zoom).
- Gestão de contatos.
- Campanhas de email (integração Gmail).
- Templates de mensagens.
- Gestão de Clínicas, Exames e Empresas.
- Configuração de disponibilidade.
- Rate limits na IA (10 req/min).

Arquitetura:
- Frontend: React 19.2, TailwindCSS, Vite.
- Backend: Supabase (Postgres, Edge Functions).
- Auth: Supabase Auth.
- IA: Google Gemini 2.5 Flash via @google/genai SDK.

Segurança:
- Credenciais em .env.local (nunca no git).
- RLS no banco de dados.
`;

type ChatMode = 'manual' | 'csv-formatter';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    isCode?: boolean;
}

export const NexusIA: React.FC = () => {
    const [mode, setMode] = useState<ChatMode>('manual');
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Olá! Sou a Nexus IA. Como posso ajudar com o sistema hoje?' }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            let systemInstruction = '';
            let refinedPrompt = input;

            if (mode === 'manual') {
                systemInstruction = `Você é um especialista no sistema Nexus Agenda. Use o seguinte contexto para responder dúvidas:\n\n${SYSTEM_CONTEXT}\n\nResponda de forma concisa e amigável em Português.`;
            } else if (mode === 'csv-formatter') {
                systemInstruction = "Você é um formatador de dados experiente. Sua única tarefa é receber listas desorganizadas e transformá-las em um CSV válido com cabeçalhos apropriados. NÃO explique nada, APENAS retorne o código CSV.";
                refinedPrompt = `Formate a seguinte lista para CSV:\n${input}`;
            }

            const response = await generateResponse(refinedPrompt, systemInstruction);

            const isCodeBlock = mode === 'csv-formatter' || response.includes('```');

            setMessages(prev => [...prev, { role: 'assistant', content: response, isCode: isCodeBlock }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, tive um erro ao processar sua solicitação.' }]);
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = (content: string) => {
        // Remove markdown code blocks if present
        const cleanContent = content.replace(/```csv/g, '').replace(/```/g, '').trim();
        const blob = new Blob([cleanContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dados_importacao.csv';
        a.click();
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md">
                        <Icons.Sparkles size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800">Nexus IA</h2>
                        <p className="text-xs text-slate-500">Seu assistente inteligente</p>
                    </div>
                </div>

                <div className="flex bg-slate-200 p-1 rounded-lg">
                    <button
                        onClick={() => { setMode('manual'); setMessages([{ role: 'assistant', content: 'Modo Manual ativado. Pergunte sobre o sistema!' }]); }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'manual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Manual do Sistema
                    </button>
                    <button
                        onClick={() => { setMode('csv-formatter'); setMessages([{ role: 'assistant', content: 'Modo CSV ativado. Cole sua lista de dados aqui.' }]); }}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'csv-formatter' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Formatador CSV
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                            }`}>
                            {msg.isCode ? (
                                <div className="relative group">
                                    <pre className="text-xs font-mono bg-slate-900 text-slate-50 p-3 rounded-lg overflow-x-auto my-2">
                                        {msg.content.replace(/```csv/g, '').replace(/```/g, '')}
                                    </pre>
                                    {mode === 'csv-formatter' && (
                                        <button
                                            onClick={() => downloadCSV(msg.content)}
                                            className="mt-2 w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Icons.DownloadCloud size={14} /> Baixar CSV
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={mode === 'manual' ? "Como adiciono um contato?" : "Cole sua lista aqui (ex: João, joao@email.com)..."}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Icons.Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
