import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from './Icons';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
    requireApproval?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles,
    requireApproval = true,
}) => {
    const { isAuthenticated, isApproved, profile, loading, hasRole } = useAuth();

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Carregando...</p>
                </div>
            </div>
        );
    }

    // Not authenticated - this case is handled by App.tsx redirecting to AuthPage
    if (!isAuthenticated) {
        return null;
    }

    // Awaiting approval
    if (requireApproval && !isApproved) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.Clock className="w-8 h-8 text-amber-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Aguardando Aprovação</h2>
                    <p className="text-slate-600 mb-4">
                        Sua conta foi criada com sucesso! Um administrador precisa aprovar seu acesso antes que você possa utilizar o sistema.
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                        <p><strong>Email:</strong> {profile?.email}</p>
                        <p><strong>Status:</strong> Pendente de aprovação</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-4">
                        Você receberá um email quando sua conta for aprovada.
                    </p>
                </div>
            </div>
        );
    }

    // Account deactivated
    if (profile && !profile.is_active) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-pink-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Conta Desativada</h2>
                    <p className="text-slate-600">
                        Sua conta foi desativada. Entre em contato com o administrador para mais informações.
                    </p>
                </div>
            </div>
        );
    }

    // Role check
    if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-gray-50 p-4">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.Lock className="w-8 h-8 text-slate-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Restrito</h2>
                    <p className="text-slate-600">
                        Você não possui permissão para acessar esta área. Entre em contato com um administrador caso precise de acesso.
                    </p>
                    <div className="mt-4 text-sm text-slate-500">
                        <p>Seu perfil: <span className="font-medium capitalize">{profile?.role}</span></p>
                    </div>
                </div>
            </div>
        );
    }

    // All checks passed, render children
    return <>{children}</>;
};

export default ProtectedRoute;
