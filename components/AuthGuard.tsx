import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthPage } from './AuthPage';
import { ProtectedRoute } from './ProtectedRoute';

interface AuthGuardProps {
    children: React.ReactNode;
}

/**
 * AuthGuard handles authentication state without breaking React hooks order.
 * This component is separate from App to ensure App's hooks always run in the same order.
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
    const { isAuthenticated, isApproved, loading: authLoading } = useAuth();

    // Check if we're on a public route that doesn't require auth
    const isPublicRoute = () => {
        const path = window.location.pathname;
        // Public booking pages don't require authentication
        if (path.startsWith('/book/')) return true;
        return false;
    };

    // PUBLIC ROUTES - Bypass auth completely
    if (isPublicRoute()) {
        return <>{children}</>;
    }

    // AUTH LOADING STATE
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Carregando...</p>
                </div>
            </div>
        );
    }

    // NOT AUTHENTICATED - Show login page
    if (!isAuthenticated) {
        return <AuthPage />;
    }

    // AWAITING APPROVAL - Show pending state  
    if (!isApproved) {
        return (
            <ProtectedRoute requireApproval={true}>
                <div />
            </ProtectedRoute>
        );
    }

    // Authenticated and approved - render children
    return <>{children}</>;
};

export default AuthGuard;

