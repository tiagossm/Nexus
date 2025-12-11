import { supabase, isSupabaseConfigured } from './supabaseClient';
import { EventType, Contact, Booking, SingleUseLink, Poll } from '../types';

// --- EVENTS ---

export const getEvents = async (): Promise<EventType[]> => {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as EventType[];
};

export const createEvent = async (event: EventType): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    // Get current user for ownership
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('events')
        .insert([{
            id: event.id,
            title: event.title,
            duration: event.duration,
            location: event.location,
            type: event.type,
            active: event.active,
            color: event.color,
            url: event.url,
            description: event.description,
            owner_id: user.id // Add ownership
        }]);

    if (error) throw error;
};

export const updateEventStatus = async (id: string, active: boolean): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
        .from('events')
        .update({ active })
        .eq('id', id);

    if (error) throw error;
};

// --- CONTACTS ---

export const getContacts = async (): Promise<Contact[]> => {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Contact[];
};

export const createContact = async (contact: Partial<Contact>): Promise<Contact | null> => {
    if (!isSupabaseConfigured()) return null;

    // Get current user for ownership
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('contacts')
        .insert([{ ...contact, owner_id: user.id }])
        .select()
        .single();

    if (error) throw error;
    return data as Contact;
};

export const updateContact = async (id: string, updates: Partial<Contact>): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id);

    if (error) throw error;
};

export const updateContactByEmail = async (email: string, updates: Partial<Contact>): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('email', email);

    if (error) throw error;
};

export const upsertContacts = async (contacts: Partial<Contact>[]): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    // Get current user for ownership
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Add owner_id to each contact
    const contactsWithOwner = contacts.map(c => ({ ...c, owner_id: user.id }));

    const { error } = await supabase
        .from('contacts')
        .upsert(contactsWithOwner, { onConflict: 'email' });

    if (error) throw error;
};

// --- BOOKINGS ---

export const createBooking = async (booking: Partial<Booking>): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
        .from('bookings')
        .insert([booking]);

    if (error) throw error;
};

// --- SINGLE USE LINKS ---

export const getSingleUseLinks = async (): Promise<SingleUseLink[]> => {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
        .from('single_use_links')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((link: any) => ({
        ...link,
        createdAt: new Date(link.created_at),
        eventId: link.event_id,
        eventTitle: link.event_title
    })) as SingleUseLink[];
};

export const createSingleUseLink = async (link: SingleUseLink): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
        .from('single_use_links')
        .insert([{
            id: link.id,
            event_id: link.eventId,
            event_title: link.eventTitle,
            url: link.url,
            active: link.active,
            created_at: link.createdAt.toISOString()
        }]);

    if (error) throw error;
};

// --- POLLS ---

export const getPolls = async (): Promise<Poll[]> => {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((poll: any) => ({
        ...poll,
        createdAt: new Date(poll.created_at)
    })) as Poll[];
};

export const createPoll = async (poll: Poll): Promise<void> => {
    if (!isSupabaseConfigured()) return;

    const { error } = await supabase
        .from('polls')
        .insert([{
            id: poll.id,
            title: poll.title,
            duration: poll.duration,
            location: poll.location,
            status: poll.status,
            votes: poll.votes,
            created_at: poll.createdAt.toISOString()
        }]);

    if (error) throw error;
};
