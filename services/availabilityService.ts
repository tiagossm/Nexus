// ============================================
// Availability Service - Gerencia disponibilidade e conflitos
// ============================================

import { supabase, isSupabaseConfigured } from './supabaseClient';

// Types
export interface AvailabilityRule {
    id?: string;
    user_id?: string;
    day_of_week: number; // 0=Domingo, 6=Sábado
    start_time: string; // HH:MM
    end_time: string;
    is_available: boolean;
}

export interface AvailabilityException {
    id?: string;
    user_id?: string;
    exception_date: string; // YYYY-MM-DD
    start_time?: string;
    end_time?: string;
    is_available: boolean;
    reason?: string;
}

export interface SlotAvailability {
    date: Date;
    time: string;
    available: boolean;
    reason?: string; // "Conflito", "Fora do horário", "Limite atingido"
}

// --- AVAILABILITY RULES ---

export const getAvailabilityRules = async (): Promise<AvailabilityRule[]> => {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('is_available', true)
        .order('day_of_week', { ascending: true });

    if (error) throw error;
    return data as AvailabilityRule[];
};

export const createAvailabilityRule = async (rule: AvailabilityRule): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
        .from('availability_rules')
        .insert([rule]);

    if (error) throw error;
};

export const deleteAvailabilityRule = async (id: string): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
        .from('availability_rules')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- AVAILABILITY EXCEPTIONS ---

export const getAvailabilityExceptions = async (): Promise<AvailabilityException[]> => {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
        .from('availability_exceptions')
        .select('*')
        .order('exception_date', { ascending: true });

    if (error) throw error;
    return data as AvailabilityException[];
};

export const createAvailabilityException = async (exception: AvailabilityException): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
        .from('availability_exceptions')
        .insert([exception]);

    if (error) throw error;
};

export const deleteAvailabilityException = async (id: string): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
        .from('availability_exceptions')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- SLOT VALIDATION ---

/**
 * Verifica se um slot está disponível usando a função PostgreSQL
 */
export const checkSlotAvailability = async (
    eventId: string,
    startTime: Date,
    endTime: Date
): Promise<boolean> => {
    if (!isSupabaseConfigured()) return true; // Demo mode

    try {
        const { data, error } = await supabase.rpc('is_slot_available', {
            p_event_id: eventId,
            p_start_time: startTime.toISOString(),
            p_end_time: endTime.toISOString()
        });

        if (error) throw error;
        return data as boolean;
    } catch (err) {
        console.error('Error checking slot availability:', err);
        return false; // Fail-safe: bloqueia em caso de erro
    }
};

/**
 * Verifica se um slot está disponível para uma campanha específica
 * Checa a tabela campaign_bookings para conflitos, respeitando a capacidade da campanha.
 */
export const checkCampaignSlotAvailability = async (
    campaignId: string,
    startTime: Date,
    endTime: Date,
    capacity: number = 1
): Promise<boolean> => {
    if (!isSupabaseConfigured()) return true; // Demo mode

    try {
        // Count existing bookings for this exact slot
        const { count, error } = await supabase
            .from('campaign_bookings')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaignId)
            .neq('status', 'cancelled')
            .eq('start_time', startTime.toISOString()); // Strict match for slot logic

        if (error) throw error;
        
        // If count is less than capacity, it's available
        return (count || 0) < capacity;
    } catch (err) {
        console.error('Error checking campaign slot availability:', err);
        return false; // Fail-safe: bloqueia em caso de erro
    }
};

/**
 * Gera slots disponíveis para um evento em uma data específica
 */
export const getAvailableSlots = async (
    eventId: string,
    date: Date,
    eventDuration: number,
    customAvailability?: any,
    campaignId?: string
): Promise<string[]> => {
    if (!isSupabaseConfigured()) {
        // Demo mode: retorna slots fixos
        return generateDemoSlots(eventDuration);
    }

    const dayOfWeek = date.getDay();
    const dateString = date.toISOString().split('T')[0];

    try {
        let rules: AvailabilityRule[] = [];
        let capacity = 1;

        // 1. Determine Rules Source (Global vs Custom)
        if (customAvailability) {
            // Check blocked dates
            if (customAvailability.blocked_dates?.includes(dateString)) {
                return [];
            }

            // Check weekdays
            const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const dayKey = dayMap[dayOfWeek];
            if (!customAvailability.weekdays?.includes(dayKey)) {
                return [];
            }
            
            // Check capacity setting (slots_per_hour used as capacity)
            // Note: Use slots_per_hour from the FIRST time slot rule as a general campaign setting if not defined globally
            // Or better, check if slots_per_hour is defined in the rule itself
            
            // Convert custom time_slots to AvailabilityRule format
            if (customAvailability.time_slots) {
                rules = customAvailability.time_slots.map((slot: any) => ({
                    day_of_week: dayOfWeek,
                    start_time: slot.start,
                    end_time: slot.end,
                    is_available: true,
                    slots_per_hour: slot.slots_per_hour // Preserve this property
                }));
            }
        } else {
            // Global rules (Legacy logic)
            // ... (omitted for brevity, legacy flow usually implies capacity 1)
            const { data: dbRules, error: rulesError } = await supabase
                .from('availability_rules')
                .select('*')
                .eq('day_of_week', dayOfWeek)
                .eq('is_available', true);

            if (rulesError) throw rulesError;
            if (!dbRules || dbRules.length === 0) return []; 
            rules = dbRules as AvailabilityRule[];
            
            // ... Check exceptions ...
             const { data: exceptions, error: exceptionsError } = await supabase
                .from('availability_exceptions')
                .select('*')
                .eq('exception_date', dateString);

            if (exceptionsError) throw exceptionsError;
            const dayBlocked = exceptions?.some(e => e.is_available === false && !e.start_time);
            if (dayBlocked) return [];
        }

        // 3. Buscar horários JÁ AGENDADOS para esta campanha/dia
        let bookedCounts: Record<string, number> = {};
        
        if (campaignId) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const { data: bookings } = await supabase
              .from('campaign_bookings')
              .select('start_time')
              .eq('campaign_id', campaignId)
              .neq('status', 'cancelled')
              .gte('start_time', startOfDay.toISOString())
              .lte('start_time', endOfDay.toISOString());
            
            // Count bookings per slot
            (bookings || []).forEach(b => {
                 const d = new Date(b.start_time);
                 const timeKey = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                 bookedCounts[timeKey] = (bookedCounts[timeKey] || 0) + 1;
            });
        }

        // 4. Gerar slots a partir das regras
        const availableSlots: string[] = [];
        const now = new Date(); 
        const isToday = dateString === now.toISOString().split('T')[0];
        
        // DEBUG: Check what we are filtering
        if (campaignId) {
             console.log('[Availability] Booked Counts:', bookedCounts);
        }

        console.log('🔍 Processing rules:', JSON.stringify(rules, null, 2));


        for (const rule of rules) {
             // If slots_per_hour is set, use it as CAPACITY.
             const ruleCapacity = (rule as any).slots_per_hour && (rule as any).slots_per_hour > 0 
                ? (rule as any).slots_per_hour 
                : 1;

             // Generate slots based on duration (Interval = Duration)
             // We do NOT use slots_per_hour for frequency anymore based on user feedback.
             const slots = generateSlotsFromRule({ ...rule, slots_per_hour: undefined } as any, eventDuration);

            // Validar cada slot
            for (const timeString of slots) {
                // If today, filter out past times
                if (isToday) {
                    const [h, m] = timeString.split(':').map(Number);
                    if (h < now.getHours() || (h === now.getHours() && m < now.getMinutes())) {
                        continue; 
                    }
                }

                // CHECK CAPACITY
                const currentBookings = bookedCounts[timeString] || 0;
                if (currentBookings >= ruleCapacity) {
                    continue; // Slot is full
                }

                availableSlots.push(timeString);
            }
        }
        
        // Remove duplicates and sort
        return [...new Set(availableSlots)].sort();
        
    } catch (err) {
        console.error('Error getting available slots:', err);
        return [];
    }
};

// --- HELPERS ---

function generateSlotsFromRule(rule: AvailabilityRule & { slots_per_hour?: number }, duration: number): string[] {
    const slots: string[] = [];
    const [startHour, startMin] = rule.start_time.split(':').map(Number);
    const [endHour, endMin] = rule.end_time.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Use duration as step 
    // (If user wants higher frequency like 10min slots for 30min events, we'd need another config 'interval')
    let step = duration;
    
    // DEBUG LOG for Step Calculation
    // console.log(`[Slot Gen] Duration: ${duration}m, Step: ${step}m`);
    
    // Legacy support: if someone actually wanted frequency based on slots_per_hour, 
    // it's now disabled here to favor Capacity logic.
    // If we need both, we need separate fields. For now, matching user request "9 vagas às 8h".
    
    while (currentMinutes + duration <= endMinutes) {
        const hours = Math.floor(currentMinutes / 60);
        const minutes = currentMinutes % 60;
        slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
        
        currentMinutes += step;
    }

    return slots;
}

function generateDemoSlots(duration: number): string[] {
    const slots: string[] = [];
    let currentMinutes = 9 * 60; // 9:00
    const endMinutes = 17 * 60; // 17:00

    while (currentMinutes + duration <= endMinutes) {
        const hours = Math.floor(currentMinutes / 60);
        const minutes = currentMinutes % 60;
        slots.push(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
        currentMinutes += duration; // Demo always uses duration
    }

    return slots;
}
