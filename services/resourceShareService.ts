import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface ResourceShare {
    id: string;
    resource_type: 'event' | 'campaign' | 'contact' | 'template' | 'booking';
    resource_id: string;
    shared_with_user_id?: string;
    shared_with_company_id?: string;
    permission: 'view' | 'edit' | 'admin';
    shared_by: string;
    created_at: string;
    expires_at?: string;
}

export interface ShareInput {
    resource_type: ResourceShare['resource_type'];
    resource_id: string;
    shared_with_user_id?: string;
    shared_with_company_id?: string;
    permission?: 'view' | 'edit' | 'admin';
    expires_at?: string;
}

// Get all shares for a specific resource
export const getSharesForResource = async (
    resourceType: string,
    resourceId: string
): Promise<ResourceShare[]> => {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
        .from('resource_shares')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId);

    if (error) throw error;
    return data as ResourceShare[];
};

// Get all resources shared with the current user
export const getSharedWithMe = async (
    resourceType?: string
): Promise<ResourceShare[]> => {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
        .from('resource_shares')
        .select('*')
        .order('created_at', { ascending: false });

    if (resourceType) {
        query = query.eq('resource_type', resourceType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as ResourceShare[];
};

// Share a resource with a user
export const shareResource = async (share: ShareInput): Promise<ResourceShare | null> => {
    if (!isSupabaseConfigured()) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('resource_shares')
        .insert([{
            ...share,
            shared_by: user.id,
            permission: share.permission || 'view'
        }])
        .select()
        .single();

    if (error) throw error;
    return data as ResourceShare;
};

// Remove a share
export const removeShare = async (shareId: string): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
        .from('resource_shares')
        .delete()
        .eq('id', shareId);

    if (error) throw error;
};

// Check if current user has access to a resource
export const hasAccessToResource = async (
    resourceType: string,
    resourceId: string,
    requiredPermission: 'view' | 'edit' | 'admin' = 'view'
): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const permissionHierarchy = ['view', 'edit', 'admin'];
    const requiredLevel = permissionHierarchy.indexOf(requiredPermission);

    const { data, error } = await supabase
        .from('resource_shares')
        .select('permission')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .eq('shared_with_user_id', user.id)
        .single();

    if (error || !data) return false;

    const userLevel = permissionHierarchy.indexOf(data.permission);
    return userLevel >= requiredLevel;
};

// Get users available for sharing (from same company or all if super_admin)
export const getUsersForSharing = async (): Promise<Array<{ id: string; email: string; full_name: string | null }>> => {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('is_active', true);

    if (error) throw error;
    return data || [];
};
