import React, { useState } from 'react';
import { Icons } from './Icons';
import { toast } from 'sonner';

interface IdentityGateProps {
    recipientEmail: string | undefined;
    onVerified: () => void;
}

export const IdentityGate: React.FC<IdentityGateProps> = ({ recipientEmail, onVerified }) => {
    const [emailInput, setEmailInput] = useState('');
    const [error, setError] = useState(false);

    const handleVerify = (e: React.FormEvent) => {
        e.preventDefault();

        if (!recipientEmail) {
            // Fallback if no recipient (should not happen in this flow)
            onVerified();
            return;
        }

        if (emailInput.toLowerCase().trim() === recipientEmail.toLowerCase().trim()) {
            onVerified();
        } else {
            setError(true);
            toast.error('O e-mail informado não corresponde ao convite.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 border border-slate-100">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icons.Lock size={32} className="text-indigo-600" />
                </div>

                <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
                    Confirme sua identidade
                </h2>
                <p className="text-slate-500 text-center mb-8">
                    Para acessar este agendamento exclusivo, por favor confirme seu e-mail.
                </p>

                <form onSubmit={handleVerify} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Seu E-mail
                        </label>
                        <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => {
                                setEmailInput(e.target.value);
                                setError(false);
                            }}
                            className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-indigo-200'} focus:ring-4 focus:border-transparent outline-none transition-all`}
                            placeholder="exemplo@empresa.com.br"
                            autoFocus
                        />
                        {error && (
                            <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                                <Icons.AlertCircle size={14} />
                                E-mail incorreto. Tente novamente.
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                    >
                        <Icons.CheckCircle size={20} />
                        Acessar Agendamento
                    </button>

                    <p className="text-xs text-slate-400 text-center mt-4">
                        Este link é pessoal e intransferível.
                    </p>
                </form>
            </div>
        </div>
    );
};
