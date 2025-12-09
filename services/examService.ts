import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface Exam {
  id: string;
  name: string;
  code: string;
  description?: string;
  duration_minutes: number;
  requires_fasting: boolean;
  preparation_instructions?: string;
  category?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const examService = {
  /**
   * Get all exams, optionally filtered by active status and category
   */
  async getExams(activeOnly: boolean = true, category?: string): Promise<Exam[]> {
    if (!isSupabaseConfigured()) {
      // Return mock data
      return [
        {
          id: '1',
          name: 'Exame Clínico Ocupacional',
          code: 'ASO',
          description: 'Avaliação médica completa incluindo anamnese e exame físico',
          duration_minutes: 30,
          requires_fasting: false,
          category: 'Clínico',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Audiometria',
          code: 'AUDIO',
          description: 'Exame de audição ocupacional',
          duration_minutes: 20,
          requires_fasting: false,
          category: 'Complementar',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: 'Hemograma Completo',
          code: 'HEMOGRAMA',
          description: 'Análise completa das células sanguíneas',
          duration_minutes: 5,
          requires_fasting: true,
          preparation_instructions: 'Jejum de 8 horas',
          category: 'Laboratorial',
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }

    let query = supabase.from('exams').select('*').order('name', { ascending: true });

    if (activeOnly) {
      query = query.eq('active', true);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Exam[];
  },

  /**
   * Get a single exam by ID
   */
  async getExam(id: string): Promise<Exam | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Exam;
  },

  /**
   * Get exam by code
   */
  async getExamByCode(code: string): Promise<Exam | null> {
    if (!isSupabaseConfigured()) return null;

    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('code', code)
      .single();

    if (error) throw error;
    return data as Exam;
  },

  /**
   * Create a new exam
   */
  async createExam(exam: Omit<Exam, 'id' | 'created_at' | 'updated_at'>): Promise<Exam> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
      .from('exams')
      .insert([exam])
      .select()
      .single();

    if (error) throw error;
    return data as Exam;
  },

  /**
   * Update an existing exam
   */
  async updateExam(id: string, updates: Partial<Omit<Exam, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('exams')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Delete an exam (soft delete by setting active = false)
   */
  async deleteExam(id: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
      .from('exams')
      .update({ active: false })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Get all unique categories
   */
  async getCategories(): Promise<string[]> {
    if (!isSupabaseConfigured()) {
      return ['Clínico', 'Complementar', 'Laboratorial', 'Imagem'];
    }

    const { data, error } = await supabase
      .from('exams')
      .select('category')
      .eq('active', true);

    if (error) throw error;

    const categories = Array.from(new Set((data as { category?: string }[])
      .map(e => e.category)
      .filter(Boolean))) as string[];

    return categories.sort();
  },

  /**
   * Get multiple exams by IDs
   */
  async getExamsByIds(ids: string[]): Promise<Exam[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .in('id', ids);

    if (error) throw error;
    return data as Exam[];
  },

  /**
   * Calculate total duration for a set of exams
   */
  async calculateTotalDuration(examIds: string[]): Promise<number> {
    const exams = await this.getExamsByIds(examIds);
    return exams.reduce((total, exam) => total + exam.duration_minutes, 0);
  }
};
