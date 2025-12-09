import { describe, it, expect, vi } from 'vitest';
import { getEvents, createEvent, updateEventStatus } from '../../services/supabaseService';

// Mock Supabase client
vi.mock('../../services/supabaseClient', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
            update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
            })),
        })),
    },
    isSupabaseConfigured: vi.fn(() => true),
}));

describe('supabaseService', () => {
    describe('getEvents', () => {
        it('should return empty array when no events', async () => {
            const events = await getEvents();
            expect(Array.isArray(events)).toBe(true);
        });
    });

    describe('createEvent', () => {
        it('should create event without throwing', async () => {
            const mockEvent = {
                id: '1',
                title: 'Test Event',
                duration: 30,
                location: 'Google Meet',
                type: 'One-on-One' as const,
                active: true,
                color: '#6366f1',
                url: 'https://test.com',
            };

            await expect(createEvent(mockEvent)).resolves.not.toThrow();
        });
    });

    describe('updateEventStatus', () => {
        it('should update event status without throwing', async () => {
            await expect(updateEventStatus('1', false)).resolves.not.toThrow();
        });
    });
});
