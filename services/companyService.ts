import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Company } from '../types';

/**
 * List all active companies
 */
export async function listCompanies(): Promise<Company[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error listing companies:', error);
    throw error;
  }

  return data as Company[];
}

/**
 * Get a company by ID
 */
export async function getCompanyById(id: string): Promise<Company | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error getting company:', error);
    throw error;
  }

  return data as Company | null;
}

/**
 * Create a new company
 */
export async function createCompany(company: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('companies')
    .insert(company)
    .select()
    .single();

  if (error) {
    console.error('Error creating company:', error);
    throw error;
  }

  return data as Company;
}

/**
 * Update a company
 */
export async function updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('companies')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating company:', error);
    throw error;
  }

  return data as Company;
}

/**
 * Delete a company (soft delete - sets is_active to false)
 */
export async function deleteCompany(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('companies')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error deleting company:', error);
    throw error;
  }
}

export const companyService = {
  listCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany
};
