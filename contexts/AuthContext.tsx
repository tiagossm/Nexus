import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

// Profile type matching our database schema
export interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
    company_id: string | null;
    role: 'super_admin' | 'org_admin' | 'manager' | 'user' | 'viewer';
    is_approved: boolean;
    is_active: boolean;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    loading: boolean;
    isAuthenticated: boolean;
    isApproved: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    hasRole: (roles: string[]) => boolean;
    isSuperAdmin: boolean;
    isOrgAdmin: boolean;
    isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch user profile from our profiles table
    const fetchProfile = async (userId: string) => {
        console.log('[Auth] fetchProfile called for:', userId);
        if (!isSupabaseConfigured()) return null;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                return null;
            }

            console.log('[Auth] fetchProfile result:', data);
            return data as UserProfile;
        } catch (err) {
            console.error('Error in fetchProfile:', err);
            return null;
        }
    };

    // Update last login time
    const updateLastLogin = async (userId: string) => {
        if (!isSupabaseConfigured()) return;

        await supabase
            .from('profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', userId);
    };

    // Refresh profile data
    const refreshProfile = async () => {
        if (user) {
            const profileData = await fetchProfile(user.id);
            setProfile(profileData);
        }
    };

    // Initialize auth state - SIMPLIFIED to prevent hanging
    useEffect(() => {
        console.log('[Auth] Initializing...');
        let mounted = true;

        if (!isSupabaseConfigured()) {
            console.log('[Auth] Supabase not configured, skipping auth');
            setLoading(false);
            return;
        }

        // If no auth event after 3s, explicitly call getSession to trigger it
        const timeoutId = setTimeout(async () => {
            if (mounted) {
                console.warn('[Auth] No auth event yet, calling getSession...');
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    console.log('[Auth] getSession result:', session ? 'has session' : 'no session');
                    // onAuthStateChange should fire after this, but if it doesn't:
                    if (!session) {
                        setLoading(false);
                    }
                } catch (err) {
                    console.error('[Auth] getSession error:', err);
                    setLoading(false);
                }
            }
        }, 3000);

        // Listen for auth changes - this is the ONLY mechanism we use
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            console.log('[Auth] State changed:', event);
            clearTimeout(timeoutId);

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                console.log('[Auth] User logged in:', session.user.email);

                // Fetch profile - simple, no timeout racing
                const profileData = await fetchProfile(session.user.id);
                console.log('[Auth] Profile:', profileData ? 'found' : 'not found');
                if (mounted) setProfile(profileData);

                if (event === 'SIGNED_IN') {
                    updateLastLogin(session.user.id);
                    // Clean OAuth hash from URL
                    if (window.location.hash.includes('access_token')) {
                        window.history.replaceState(null, '', window.location.pathname);
                    }
                }
            } else {
                setProfile(null);
            }

            // ALWAYS set loading to false after any auth event
            if (mounted) {
                console.log('[Auth] Setting loading to false after:', event);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    // Sign in with Google
    const signInWithGoogle = async () => {
        if (!isSupabaseConfigured()) return;

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });

        if (error) {
            console.error('Google sign in error:', error);
            throw error;
        }
    };

    // Sign in with email/password
    const signInWithEmail = async (email: string, password: string) => {
        if (!isSupabaseConfigured()) return { error: new Error('Supabase not configured') };

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        return { error: error ? new Error(error.message) : null };
    };

    // Sign up with email/password
    const signUpWithEmail = async (email: string, password: string, fullName: string) => {
        if (!isSupabaseConfigured()) return { error: new Error('Supabase not configured') };

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        return { error: error ? new Error(error.message) : null };
    };

    // Sign out
    const signOut = async () => {
        if (!isSupabaseConfigured()) return;

        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setSession(null);
    };

    // Check if user has any of the specified roles
    const hasRole = (roles: string[]): boolean => {
        if (!profile) return false;
        return roles.includes(profile.role);
    };

    const value: AuthContextType = {
        user,
        profile,
        session,
        loading,
        // User is authenticated if they have a valid session (profile is for permissions)
        isAuthenticated: !!user,
        isApproved: !!profile?.is_approved,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshProfile,
        hasRole,
        isSuperAdmin: profile?.role === 'super_admin',
        isOrgAdmin: hasRole(['super_admin', 'org_admin']),
        isManager: hasRole(['super_admin', 'org_admin', 'manager']),
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
