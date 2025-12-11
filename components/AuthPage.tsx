import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from './Icons';
import { toast } from 'sonner';

type AuthMode = 'login' | 'signup' | 'forgot';

export const AuthPage: React.FC = () => {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (mode === 'login') {
                const { error } = await signInWithEmail(email, password);
                if (error) {
                    toast.error(error.message);
                }
            } else if (mode === 'signup') {
                if (!fullName.trim()) {
                    toast.error('Por favor, informe seu nome completo');
                    setIsSubmitting(false);
                    return;
                }
                const { error } = await signUpWithEmail(email, password, fullName);
                if (error) {
                    toast.error(error.message);
                } else {
                    toast.success('Cadastro realizado! Aguarde a aprovação do administrador.');
                    setMode('login');
                }
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao processar solicitação');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
        } catch (err: any) {
            toast.error('Erro ao conectar com Google');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Icons.Calendar className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Nexus Agenda</h1>
                    <p className="text-slate-600 mt-2">Sistema de Agendamento Corporativo</p>
                </div>

                {/* Auth Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">
                        {mode === 'login' && 'Entrar'}
                        {mode === 'signup' && 'Criar Conta'}
                        {mode === 'forgot' && 'Recuperar Senha'}
                    </h2>

                    {/* Google Sign In */}
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-all mb-6"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span className="font-medium text-slate-700">Continuar com Google</span>
                    </button>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-slate-500">ou</span>
                        </div>
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        {mode === 'signup' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Nome Completo
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Seu nome completo"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>

                        {mode !== 'forgot' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Senha
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    {mode === 'login' && 'Entrar'}
                                    {mode === 'signup' && 'Criar Conta'}
                                    {mode === 'forgot' && 'Enviar Link'}
                                </>
                            )}
                        </button>
                    </form>

                    {/* Mode Toggle */}
                    <div className="mt-6 text-center text-sm">
                        {mode === 'login' && (
                            <>
                                <button
                                    onClick={() => setMode('forgot')}
                                    className="text-indigo-600 hover:underline"
                                >
                                    Esqueceu a senha?
                                </button>
                                <span className="text-slate-400 mx-2">•</span>
                                <button
                                    onClick={() => setMode('signup')}
                                    className="text-indigo-600 hover:underline"
                                >
                                    Criar conta
                                </button>
                            </>
                        )}
                        {mode === 'signup' && (
                            <button
                                onClick={() => setMode('login')}
                                className="text-indigo-600 hover:underline"
                            >
                                Já tem uma conta? Entrar
                            </button>
                        )}
                        {mode === 'forgot' && (
                            <button
                                onClick={() => setMode('login')}
                                className="text-indigo-600 hover:underline"
                            >
                                Voltar para login
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-slate-500 mt-6">
                    Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.
                </p>
            </div>
        </div>
    );
};

export default AuthPage;
