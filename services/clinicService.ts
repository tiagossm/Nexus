import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface TechnicalResponsible {
  name: string;
  council_id: string; // CRM, COREN, etc.
  council_type: string;
  uf: string;
}

export interface Clinic {
  id: string;
  name: string; // Nome Fantasia
  corporate_name?: string; // Razão Social
  cnpj?: string;
  cnae_code?: string;
  cnae_description?: string;
  address: string;
  city: string;
  state: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  capacity_per_hour: number;
  working_hours: {
    mon?: { start: string; end: string } | null;
    tue?: { start: string; end: string } | null;
    wed?: { start: string; end: string } | null;
    thu?: { start: string; end: string } | null;
    fri?: { start: string; end: string } | null;
    sat?: { start: string; end: string } | null;
    sun?: { start: string; end: string } | null;
  };
  technical_responsible?: TechnicalResponsible;
  facilities?: string[];
  offered_exams?: string[]; // IDs of exams
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const clinicService = {
  /**
   * Fetch CNPJ data from BrasilAPI
   */
  async fetchCnpjData(cnpj: string): Promise<any> {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) throw new Error('CNPJ inválido');

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) throw new Error('Erro ao consultar CNPJ');
      return await response.json();
    } catch (error) {
      console.error('BrasilAPI Error:', error);
      throw error;
    }
  },

  /**
   * Get all clinics
   */
  async getClinics(activeOnly: boolean = true): Promise<Clinic[]> {
    if (!isSupabaseConfigured()) {
      // Return mock data with new fields
      return [
        {
          id: '1',
          name: 'Clínica Centro',
          corporate_name: 'Centro Médico Ltda',
          cnpj: '12.345.678/0001-90',
          address: 'Av. Paulista, 1000',
          city: 'São Paulo',
          state: 'SP',
          zip_code: '01310-100',
          phone: '(11) 3000-0000',
          email: 'centro@clinica.com',
          capacity_per_hour: 4,
          working_hours: {
            mon: { start: '08:00', end: '18:00' },
            tue: { start: '08:00', end: '18:00' },
            wed: { start: '08:00', end: '18:00' },
            thu: { start: '08:00', end: '18:00' },
            fri: { start: '08:00', end: '18:00' },
            sat: { start: '08:00', end: '12:00' },
            sun: null
          },
          technical_responsible: {
            name: 'Dr. João Silva',
            council_id: '123456',
            council_type: 'CRM',
            uf: 'SP'
          },
          facilities: ['Acessibilidade', 'Ar Condicionado', 'Wifi'],
          offered_exams: ['1', '2'],
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }

    let query = supabase.from('clinics').select('*').order('name', { ascending: true });

    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Clinic[];
  },

  /**
   * Get a single clinic by ID
   */
  async getClinic(id: string): Promise<Clinic | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Clinic;
  },

  /**
   * Create a new clinic
   */
  async createClinic(clinic: Omit<Clinic, 'id' | 'created_at' | 'updated_at'>): Promise<Clinic> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('clinics')
      .insert([clinic])
      .select()
      .single();

    if (error) throw error;
    return data as Clinic;
  },

  /**
   * Update an existing clinic
   */
  async updateClinic(id: string, updates: Partial<Omit<Clinic, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('clinics')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Delete a clinic (soft delete)
   */
  async deleteClinic(id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('clinics')
      .update({ active: false })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get clinics by city
   */
  async getClinicsByCity(city: string): Promise<Clinic[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('city', city)
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Clinic[];
  }
};
