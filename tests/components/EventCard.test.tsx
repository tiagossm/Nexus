import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventCard } from '../../components/EventCard';

const mockEvent = {
    id: '1',
    title: 'Test Event',
    duration: 30,
    location: 'Google Meet',
    type: 'One-on-One' as const,
    active: true,
    color: '#6366f1',
    url: 'https://test.com',
    description: 'Test description',
};

describe('EventCard', () => {
    it('should render event title', () => {
        render(
            <EventCard
                event={mockEvent}
                onToggle={() => { }}
                onOpenBooking={() => { }}
            />
        );

        expect(screen.getByText('Test Event')).toBeInTheDocument();
    });

    it('should show duration', () => {
        render(
            <EventCard
                event={mockEvent}
                onToggle={() => { }}
                onOpenBooking={() => { }}
            />
        );

        expect(screen.getByText('30 min')).toBeInTheDocument();
    });

    it('should show location', () => {
        render(
            <EventCard
                event={mockEvent}
                onToggle={() => { }}
                onOpenBooking={() => { }}
            />
        );

        expect(screen.getByText('Google Meet')).toBeInTheDocument();
    });
});
