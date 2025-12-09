import React, { useState, useEffect, useMemo } from 'react';
import { Icons } from './Icons';
import { Booking, EventType } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { campaignBookingService, CampaignBooking } from '../services/campaignBookingService';
import { campaignService, Campaign } from '../services/campaignService';
import { toast } from 'sonner';

interface CalendarViewProps {
    events?: EventType[];
}

type ViewMode = 'week' | 'day' | 'list';

interface TimeSlot {
    hour: number;
    minute: number;
    label: string;
}

interface BookingWithEvent extends Booking {
    events?: EventType;
}

// Generate time slots from 7:00 to 19:00 (30 min intervals)
const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 7; hour < 19; hour++) {
        slots.push({ hour, minute: 0, label: `${hour.toString().padStart(2, '0')}:00` });
        slots.push({ hour, minute: 30, label: `${hour.toString().padStart(2, '0')}:30` });
    }
    return slots;
};

const TIME_SLOTS = generateTimeSlots();
const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const SLOT_HEIGHT = 40;

export const CalendarView: React.FC<CalendarViewProps> = ({ events = [] }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [bookings, setBookings] = useState<CampaignBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<CampaignBooking | null>(null);
    const [showBlockModal, setShowBlockModal] = useState(false);
    const [blockSlot, setBlockSlot] = useState<{ date: Date; time: string } | null>(null);

    // Campaign filter
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');

    // Load campaigns for filter
    useEffect(() => {
        const loadCampaigns = async () => {
            try {
                const data = await campaignService.getCampaigns();
                setCampaigns(data);
            } catch (err) {
                console.error('Error loading campaigns:', err);
            }
        };
        loadCampaigns();
    }, []);

    const weekStart = useMemo(() => {
        const d = new Date(currentDate);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    }, [currentDate]);

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            return d;
        });
    }, [weekStart]);

    useEffect(() => {
        loadBookings();
    }, [weekStart, viewMode, selectedCampaignId]);

    const loadBookings = async () => {
        setLoading(true);
        try {
            if (!isSupabaseConfigured()) {
                // Demo data
                const today = new Date();
                setBookings([
                    {
                        id: '1',
                        campaign_id: 'demo',
                        client_name: 'João Silva',
                        client_email: 'joao@example.com',
                        start_time: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0).toISOString(),
                        end_time: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30).toISOString(),
                        duration_minutes: 30,
                        status: 'confirmed',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        campaign: { id: 'demo', title: 'Teste Ergométrico' }
                    } as CampaignBooking
                ]);
                return;
            }

            const endDate = new Date(weekStart);
            endDate.setDate(endDate.getDate() + 7);

            const data = await campaignBookingService.getBookingsInRange(
                weekStart,
                endDate,
                selectedCampaignId !== 'all' ? selectedCampaignId : undefined
            );

            setBookings(data || []);
        } catch (err) {
            console.error('Error loading bookings:', err);
            toast.error('Erro ao carregar agendamentos');
        } finally {
            setLoading(false);
        }
    };

    const goToToday = () => setCurrentDate(new Date());
    const goToPrev = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 1));
        setCurrentDate(d);
    };
    const goToNext = () => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 1));
        setCurrentDate(d);
    };

    const getBookingStyle = (booking: CampaignBooking) => {
        const start = new Date(booking.start_time);
        const end = new Date(booking.end_time);
        const startMinutes = (start.getHours() - 7) * 60 + start.getMinutes();
        const endMinutes = (end.getHours() - 7) * 60 + end.getMinutes();
        const duration = endMinutes - startMinutes;
        const top = (startMinutes / 30) * SLOT_HEIGHT;
        const height = Math.max((duration / 30) * SLOT_HEIGHT - 4, SLOT_HEIGHT - 4);
        // Generate color based on campaign_id hash
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
        const colorIndex = booking.campaign_id ? Math.abs(booking.campaign_id.charCodeAt(0)) % colors.length : 0;
        return { top: `${top}px`, height: `${height}px`, backgroundColor: colors[colorIndex] };
    };

    const getBookingsForDay = (date: Date) => {
        return bookings.filter(b => new Date(b.start_time).toDateString() === date.toDateString());
    };

    const handleSlotClick = (date: Date, time: string) => {
        setBlockSlot({ date, time });
        setShowBlockModal(true);
    };

    const handleCancelBooking = async (bookingId: string) => {
        if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
        try {
            if (isSupabaseConfigured()) {
                await campaignBookingService.cancelBooking(bookingId, 'Cancelado pelo admin');
            }
            setBookings(prev => prev.filter(b => b.id !== bookingId));
            setSelectedBooking(null);
            toast.success('Agendamento cancelado!');
        } catch (err) {
            console.error('Error canceling booking:', err);
            toast.error('Erro ao cancelar');
        }
    };

    const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={goToPrev} className="p-2 hover:bg-slate-100 rounded-lg">
                        <Icons.ChevronLeft size={20} />
                    </button>
                    <button onClick={goToNext} className="p-2 hover:bg-slate-100 rounded-lg">
                        <Icons.ChevronRight size={20} />
                    </button>
                    <button onClick={goToToday} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">
                        Hoje
                    </button>
                    <h2 className="text-xl font-bold text-slate-900">
                        {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    {/* Campaign Filter */}
                    <select
                        value={selectedCampaignId}
                        onChange={(e) => setSelectedCampaignId(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[200px]"
                    >
                        <option value="all">Todas as Campanhas</option>
                        {campaigns.map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                    </select>

                    <button onClick={loadBookings} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Atualizar">
                        <Icons.RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}>
                            <Icons.List size={16} className="inline mr-1" />Lista
                        </button>
                        <button onClick={() => setViewMode('day')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'day' ? 'bg-white shadow text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}>
                            Dia
                        </button>
                        <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'week' ? 'bg-white shadow text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}>
                            Semana
                        </button>
                    </div>
                </div>
            </div>

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <div className="flex-1 overflow-auto p-6">
                    <div className="max-w-4xl mx-auto">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            </div>
                        ) : bookings.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Icons.CalendarDays size={32} className="text-slate-300" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900">Nenhum agendamento</h3>
                                <p className="text-slate-500 mt-1">Não há agendamentos para o período selecionado.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {bookings.map(booking => {
                                    const startDate = new Date(booking.start_time);
                                    const endTime = new Date(booking.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                    return (
                                        <div key={booking.id} className="bg-white border border-slate-200 rounded-xl p-5 flex items-start gap-5 hover:shadow-md transition-shadow group">
                                            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 bg-indigo-50">
                                                <span className="text-xs font-bold text-indigo-600">{startDate.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}</span>
                                                <span className="text-xl font-bold text-indigo-600">{startDate.getDate()}</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-lg">{booking.campaign?.title || 'Agendamento'}</h3>
                                                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1 font-medium">
                                                            <span className="capitalize">{startDate.toLocaleDateString('pt-BR', { weekday: 'long' })}</span>
                                                            <span>•</span>
                                                            <span>{startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {endTime}</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleCancelBooking(booking.id!)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Cancelar">
                                                        <Icons.Trash2 size={18} />
                                                    </button>
                                                </div>
                                                <div className="mt-3 flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-indigo-600">{booking.client_name.charAt(0).toUpperCase()}</div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700">{booking.client_name}</p>
                                                        <p className="text-xs text-slate-500">{booking.client_email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CALENDAR VIEW (Day/Week) */}
            {viewMode !== 'list' && (
                <div className="flex-1 overflow-auto">
                    <div className="flex">
                        <div className="w-16 flex-shrink-0 border-r border-slate-200 bg-slate-50">
                            <div className="h-12 border-b border-slate-200" />
                            {TIME_SLOTS.map((slot, i) => (
                                <div key={i} className="text-xs text-slate-400 text-right pr-2 font-medium" style={{ height: SLOT_HEIGHT }}>
                                    {slot.minute === 0 ? slot.label : ''}
                                </div>
                            ))}
                        </div>
                        <div className={`flex-1 grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-1'}`}>
                            {(viewMode === 'week' ? weekDays : [currentDate]).map((day, dayIndex) => {
                                const dayBookings = getBookingsForDay(day);
                                const todayFlag = isToday(day);
                                return (
                                    <div key={dayIndex} className="border-r border-slate-200 last:border-r-0">
                                        <div className={`h-12 border-b border-slate-200 flex flex-col items-center justify-center sticky top-0 z-5 ${todayFlag ? 'bg-indigo-50' : 'bg-white'}`}>
                                            <span className="text-xs text-slate-400 uppercase">{DAYS_OF_WEEK[day.getDay()]}</span>
                                            <span className={`text-lg font-bold ${todayFlag ? 'w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center' : 'text-slate-900'}`}>{day.getDate()}</span>
                                        </div>
                                        <div className="relative">
                                            {TIME_SLOTS.map((slot, slotIndex) => (
                                                <div key={slotIndex} className={`border-b border-slate-100 hover:bg-indigo-50/50 cursor-pointer transition-colors ${slot.minute === 0 ? 'border-slate-200' : ''}`} style={{ height: SLOT_HEIGHT }} onClick={() => handleSlotClick(day, slot.label)} />
                                            ))}
                                            {dayBookings.map(booking => (
                                                <div key={booking.id} className="absolute left-1 right-1 rounded-md px-2 py-1 text-white text-xs font-medium overflow-hidden cursor-pointer hover:opacity-90 transition-opacity shadow-sm" style={getBookingStyle(booking)} onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }}>
                                                    <div className="font-semibold truncate">{booking.client_name}</div>
                                                    <div className="opacity-80 truncate text-[10px]">{new Date(booking.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {booking.campaign?.title || 'Agendamento'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Booking Details Popover */}
            {selectedBooking && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setSelectedBooking(null)}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-3 h-full rounded-full mr-3" style={{ backgroundColor: selectedBooking.events?.color || '#6366f1' }} />
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-slate-900">{selectedBooking.events?.title || 'Agendamento'}</h3>
                                <p className="text-sm text-slate-500">{new Date(selectedBooking.start_time).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                            </div>
                            <button onClick={() => setSelectedBooking(null)} className="p-1 hover:bg-slate-100 rounded"><Icons.X size={20} /></button>
                        </div>
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 text-slate-600"><Icons.Clock size={18} /><span>{new Date(selectedBooking.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedBooking.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
                            <div className="flex items-center gap-3 text-slate-600"><Icons.User size={18} /><span>{selectedBooking.client_name}</span></div>
                            <div className="flex items-center gap-3 text-slate-600"><Icons.Mail size={18} /><span>{selectedBooking.client_email}</span></div>
                            {selectedBooking.events?.location && (<div className="flex items-center gap-3 text-slate-600"><Icons.MapPin size={18} /><span>{selectedBooking.events.location}</span></div>)}
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => handleCancelBooking(selectedBooking.id!)} className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-all">Cancelar</button>
                            <button onClick={() => setSelectedBooking(null)} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Block Time Modal */}
            {showBlockModal && blockSlot && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowBlockModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm m-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Ações para este horário</h3>
                        <p className="text-sm text-slate-500 mb-6">{blockSlot.date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às {blockSlot.time}</p>
                        <div className="space-y-3">
                            <button onClick={() => { toast.success('Funcionalidade de bloquear horário em desenvolvimento'); setShowBlockModal(false); }} className="w-full px-4 py-3 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-3">
                                <Icons.XCircle size={20} className="text-red-500" />Bloquear este horário
                            </button>
                            <button onClick={() => { toast.success('Funcionalidade de agendamento manual em desenvolvimento'); setShowBlockModal(false); }} className="w-full px-4 py-3 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-3">
                                <Icons.Calendar size={20} className="text-indigo-500" />Criar agendamento manual
                            </button>
                        </div>
                        <button onClick={() => setShowBlockModal(false)} className="mt-4 w-full px-4 py-2 text-slate-500 hover:text-slate-700 text-sm">Cancelar</button>
                    </div>
                </div>
            )}
        </div>
    );
};
