import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { EventType, CampaignField } from '../types';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import { createBooking, updateContactByEmail } from '../services/supabaseService';
import { getAvailableSlots, checkSlotAvailability, checkCampaignSlotAvailability } from '../services/availabilityService';
import { campaignBookingService } from '../services/campaignBookingService';
import { TimezoneSelector } from './TimezoneSelector';
import { format, toZonedTime } from 'date-fns-tz';
import { campaignService } from '../services/campaignService';

interface BookingModalProps {
    event: EventType | null;
    onClose: () => void;
    prefillData?: { name: string; email: string } | null;
    recipientId?: string; // Campaign recipient ID for tracking
    campaignId?: string;  // Campaign ID for campaign-based bookings
    contactId?: string;   // Contact ID from campaign
    customFields?: CampaignField[]; // Fields configured in campaign
}

export const BookingModal: React.FC<BookingModalProps> = ({ event, onClose, prefillData, recipientId, campaignId, contactId, customFields = [] }) => {
    // DEBUG: Log received configuration
    useEffect(() => {
        if (event) {
            console.log('📅 BookingModal initialized with event:', event.title);
            console.log('🔧 Custom Availability Rules:', event.custom_availability);
            console.log('👥 Custom Fields:', customFields);
            if (event.custom_availability?.time_slots) {
                console.log('🕒 Time Slots Config:', event.custom_availability.time_slots);
            }
        }
    }, [event]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [viewState, setViewState] = useState<'calendar' | 'form' | 'success'>('calendar');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeSlots, setTimeSlots] = useState<string[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    // Timezone State
    const [selectedTimezone, setSelectedTimezone] = useState(
        Intl.DateTimeFormat().resolvedOptions().timeZone
    );

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [isIdentityLocked, setIsIdentityLocked] = useState(false);

    // Apply prefill data if available
    useEffect(() => {
        if (prefillData) {
            setName(prefillData.name);
            setEmail(prefillData.email);
            if (recipientId) {
                setIsIdentityLocked(true); // Lock identity if coming from a personal link
            }
        } else {
            setName('');
            setEmail('');
            setIsIdentityLocked(false);
        }
    }, [prefillData, event, recipientId]);

    // Load available slots when date changes
    useEffect(() => {
        if (selectedDate && event) {
            loadAvailableSlots();
        }
    }, [selectedDate, event, selectedTimezone]); // Reload when timezone changes

    const loadAvailableSlots = async () => {
        if (!selectedDate || !event) return;

        setIsLoadingSlots(true);
        try {
            // 1. Get slots in HOST timezone (assumed local/UTC for now, ideally stored in DB)
            // For now, availabilityService returns slots in local server time (which matches DB rules)
            // Pass campaignId for real-time filtering
            const slots = await getAvailableSlots(event.id, selectedDate, event.duration, event.custom_availability, campaignId);

            // 2. Convert slots to CLIENT timezone if needed
            // NOTE: This is a simplification. Ideally getAvailableSlots should accept a timezone.
            // For this MVP, we assume availability rules are in "Host Local Time" and we show them as is,
            // but we should display the conversion.

            // Since our availability system is simple (TIME columns without timezone), 
            // we will treat the returned slots as "Host Time".
            // If we want to support full timezone conversion, we need to know Host Timezone.
            // Let's assume Host is 'America/Sao_Paulo' for this demo.

            setTimeSlots(slots);

            if (selectedTime && !slots.includes(selectedTime)) {
                // Keep selected time if valid, otherwise clear it logic is slightly different here
                // If user selected a time, and now it's gone (e.g. re-fetch), clear it
                // BUT, to avoid UX flickering when switching back from form:
                // We should only clear if we are in 'calendar' view, or if we want strict real-time check.
            }
        } catch (error) {
            console.error('Error loading slots:', error);
            setTimeSlots([]);
        } finally {
            setIsLoadingSlots(false);
        }
    };

    // Calendar Generation Logic
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

    if (!event) return null;

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const startDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    const handleDateClick = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        if (newDate < new Date(new Date().setHours(0, 0, 0, 0))) return;
        setSelectedDate(newDate);
        setSelectedTime(null);
    };

    const handleConfirmBooking = async () => {
        // Validate required fields
        if (!selectedDate || !selectedTime || !name || !email) return;

        // Validate custom fields
        const missingFields = customFields.filter(f => f.required && !formData[f.name]);
        if (missingFields.length > 0) {
            alert(`Por favor preencha os campos obrigatórios: ${missingFields.map(f => f.label).join(', ')}`);
            return;
        }

        setIsSubmitting(true);

        try {
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const startDateTime = new Date(selectedDate);
            startDateTime.setHours(hours, minutes, 0, 0);

            const endDateTime = new Date(startDateTime);
            endDateTime.setMinutes(endDateTime.getMinutes() + event.duration);

            // Calculate capacity for this slot
            let slotCapacity = 1;
            if (event.custom_availability && event.custom_availability.time_slots) {
                const dayOfWeek = startDateTime.getDay();
                const timeStr = selectedTime; // HH:MM

                // Find matching rule
                const rule = event.custom_availability.time_slots.find((r: any) => {
                    // Check if rule applies to this day (if rules iterate days) 
                    // OR if structure is list of TimeSlot objects that might have 'days' or generic.
                    // Based on availabilityService, structure seems to be simple list of slots
                    // But availabilityService logic maps them to days.
                    // Let's assume time_slots are generic for the allowed weekdays.

                    // Simple check: start <= time < end
                    return r.start <= timeStr && r.end > timeStr;
                    // Note: Ideally strict check with weekday if structure allows multiple daily schedules
                });

                if (rule && rule.slots_per_hour) {
                    slotCapacity = rule.slots_per_hour;
                }
            }

            // Check availability based on booking type
            let isAvailable: boolean;
            if (campaignId) {
                isAvailable = await checkCampaignSlotAvailability(campaignId, startDateTime, endDateTime, slotCapacity);
            } else {
                isAvailable = await checkSlotAvailability(event.id, startDateTime, endDateTime);
            }

            if (!isAvailable) {
                alert('Este horário acabou de ser reservado. Por favor, escolha outro.');
                await loadAvailableSlots();
                setSelectedTime(null);
                setViewState('calendar'); // Go back to calendar
                setIsSubmitting(false);
                return;
            }

            if (isSupabaseConfigured()) {
                // If this is a campaign booking, use campaign_bookings table
                if (campaignId) {
                    const booking = await campaignBookingService.createBooking({
                        campaign_id: campaignId,
                        recipient_id: recipientId,
                        contact_id: contactId,
                        client_name: name,
                        client_email: email,
                        client_cpf: formData['cpf'], // Explicitly map CPF
                        start_time: startDateTime.toISOString(),
                        end_time: endDateTime.toISOString(),
                        duration_minutes: event.duration,
                        status: 'confirmed',
                        notes: Object.entries(formData)
                            .filter(([key]) => key !== 'cpf') // Don't duplicate CPF in notes
                            .map(([key, value]) => {
                                const field = customFields.find(f => f.name === key);
                                return `${field?.label || key}: ${value}`;
                            })
                            .join('\n')
                    });
                    console.log('✅ Campaign booking created successfully');

                    // Sync with Google Calendar (Async)
                    supabase.functions.invoke('manage-calendar-event', {
                        body: {
                            action: 'create_event',
                            campaign_id: campaignId,
                            booking_id: booking.id,
                            booking_details: {
                                client_name: name,
                                client_email: email,
                                start_time: startDateTime.toISOString(),
                                end_time: endDateTime.toISOString()
                            }
                        }
                    }).then(({ data, error }) => {
                        if (error) console.error('Failed to sync with Google Calendar:', error);
                        else console.log('✅ Synced with Google Calendar:', data);
                    });

                } else {
                    // Legacy booking for non-campaign events
                    await createBooking({
                        event_id: event.id,
                        client_name: name,
                        client_email: email,
                        start_time: startDateTime.toISOString(),
                        end_time: endDateTime.toISOString()
                    });
                }

                await updateContactByEmail(email, { status: 'Agendado' });
            } else {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            setViewState('success');
        } catch (error: any) {
            console.error('Error booking:', error);

            // Provide more helpful error messages
            let errorMessage = 'Erro ao realizar agendamento. Tente novamente.';

            if (error?.code === '23503') {
                // Foreign key violation - event doesn't exist
                errorMessage = 'O tipo de evento selecionado não está mais disponível. Por favor, recarregue a página.';
            } else if (error?.code === '23505' || error?.status === 409) {
                // Unique constraint violation or conflict
                errorMessage = 'Este horário acabou de ser reservado. Por favor, escolha outro.';
                await loadAvailableSlots();
                setSelectedTime(null);
                setViewState('calendar'); // Go back to calendar
            } else if (error?.message) {
                errorMessage = `Erro: ${error.message}`;
            }

            alert(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    // Calculate display time range
    const getFormattedTimeRange = () => {
        if (!selectedTime || !selectedDate) return '';
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const startDate = new Date(selectedDate);
        startDate.setHours(hours, minutes);

        const endDate = new Date(startDate);
        endDate.setMinutes(minutes + event.duration);

        return `${selectedTime} - ${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row">
                {/* Left Panel: Event Details */}
                <div className="w-full md:w-1/3 bg-slate-50 p-6 border-r border-slate-100 flex flex-col">
                    <button onClick={onClose} className="self-start p-2 hover:bg-slate-200 rounded-full mb-4 transition-colors">
                        <Icons.X size={20} className="text-slate-500" />
                    </button>

                    <div className="flex-1">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-sm" style={{ backgroundColor: `${event.color}20` }}>
                            <Icons.Video size={24} style={{ color: event.color }} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">{event.title}</h2>
                        <div className="space-y-3 text-slate-600">
                            <div className="flex items-center gap-2">
                                <Icons.Clock size={16} />
                                <span className="text-sm font-medium">{event.duration} min</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Icons.Video size={16} />
                                <span className="text-sm font-medium">{event.location}</span>
                            </div>
                        </div>
                        <p className="mt-6 text-sm text-slate-500 leading-relaxed">
                            {event.description}
                        </p>
                    </div>

                    {/* Timezone Selector in Sidebar */}
                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Fuso Horário
                        </label>
                        <TimezoneSelector
                            selectedTimezone={selectedTimezone}
                            onTimezoneChange={setSelectedTimezone}
                        />
                    </div>
                </div>

                {/* Right Panel: Calendar & Form */}
                <div className="w-full md:w-2/3 p-6 md:p-8 overflow-y-auto">
                    {viewState === 'success' ? (
                        <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                                <Icons.Check size={40} strokeWidth={3} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Agendamento Confirmado!</h3>
                            <p className="text-slate-600 mb-4 max-w-xs mx-auto">
                                Enviamos um e-mail de confirmação para <strong>{email}</strong> com todos os detalhes.
                            </p>

                            {/* Show booking details */}
                            <div className="bg-indigo-50 p-6 rounded-xl mb-6 text-left max-w-sm w-full">
                                <div className="flex items-center gap-3 mb-3">
                                    <Icons.CalendarDays className="text-indigo-600" size={24} />
                                    <div>
                                        <p className="font-bold text-indigo-900">
                                            {selectedDate?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </p>
                                        <p className="text-indigo-700">{getFormattedTimeRange()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600">
                                    <Icons.Clock size={18} />
                                    <span className="text-sm">{event.duration} minutos</span>
                                </div>
                            </div>

                            <p className="text-sm text-slate-500">
                                Verifique seu e-mail para mais informações.
                            </p>
                        </div>
                    ) : viewState === 'form' ? (
                        <div className="max-w-md mx-auto animate-in slide-in-from-right duration-300">
                            <button
                                onClick={() => setViewState('calendar')}
                                className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors"
                            >
                                <Icons.ChevronLeft size={18} />
                                Voltar para calendário
                            </button>

                            <h3 className="text-xl font-bold text-slate-900 mb-6">Seus dados</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="Ex: João Silva"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isIdentityLocked}
                                        title={isIdentityLocked ? "Email vinculado ao convite recebido" : ""}
                                        className={`w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none transition-all 
                                            ${isIdentityLocked
                                                ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                                                : "bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            }`}
                                        placeholder="Ex: joao@empresa.com"
                                    />
                                    {isIdentityLocked && (
                                        <div className="flex flex-col mt-1 gap-1">
                                            <p className="text-xs text-amber-600 flex items-center gap-1 font-medium bg-amber-50 p-2 rounded border border-amber-100">
                                                <Icons.Lock size={12} />
                                                Email confirmado pelo convite (não pode ser alterado).
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Custom Fields Render */}
                                {customFields.map((field) => (
                                    <div key={field.name}>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            {field.label} {field.required && '*'}
                                        </label>
                                        <input
                                            type={field.type === 'phone' || field.type === 'tel' ? 'tel' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                            value={formData[field.name] || ''}
                                            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                            placeholder={field.placeholder}
                                            required={field.required}
                                        />
                                    </div>
                                ))}

                                <div className="pt-4">
                                    <div className="bg-indigo-50 p-4 rounded-lg mb-6 flex gap-3">
                                        <Icons.CalendarDays className="text-indigo-600 shrink-0" size={20} />
                                        <div>
                                            <p className="font-bold text-indigo-900">
                                                {selectedDate?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </p>
                                            <p className="text-indigo-700">{getFormattedTimeRange()}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleConfirmBooking}
                                        disabled={!name || !email || isSubmitting}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl py-3 font-bold shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Confirmando...
                                            </>
                                        ) : (
                                            'Confirmar Agendamento'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full animate-in slide-in-from-left duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-slate-900">Selecione uma data</h3>
                                <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                                    <button onClick={prevMonth} className="p-1 hover:bg-white rounded-md shadow-sm transition-all text-slate-600">
                                        <Icons.ChevronLeft size={18} />
                                    </button>
                                    <span className="text-sm font-bold text-slate-700 px-2 min-w-[100px] text-center">
                                        {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                    </span>
                                    <button onClick={nextMonth} className="p-1 hover:bg-white rounded-md shadow-sm transition-all text-slate-600">
                                        <Icons.ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-0">
                                {/* Calendar Grid */}
                                <div className="flex-1">
                                    <div className="grid grid-cols-7 mb-2">
                                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                                            <div key={i} className="text-center text-xs font-bold text-slate-400 py-2">
                                                {d}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {Array.from({ length: startDay }).map((_, i) => (
                                            <div key={`empty-${i}`} />
                                        ))}
                                        {Array.from({ length: daysInMonth }).map((_, i) => {
                                            const day = i + 1;
                                            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                                            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                                            const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentMonth.getMonth();
                                            const isToday = date.toDateString() === new Date().toDateString();

                                            return (
                                                <button
                                                    key={day}
                                                    onClick={() => !isPast && handleDateClick(day)}
                                                    disabled={isPast}
                                                    className={`
                                                        aspect-square rounded-full flex items-center justify-center text-sm font-medium transition-all relative
                                                        ${isSelected
                                                            ? 'bg-indigo-600 text-white shadow-md scale-105'
                                                            : isPast
                                                                ? 'text-slate-300 cursor-not-allowed'
                                                                : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                                                        }
                                                        ${isToday && !isSelected ? 'text-indigo-600 font-bold bg-indigo-50' : ''}
                                                    `}
                                                >
                                                    {day}
                                                    {isToday && !isSelected && (
                                                        <div className="absolute bottom-1 w-1 h-1 bg-indigo-600 rounded-full" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Time Slots */}
                                <div className="w-full md:w-48 border-l border-slate-100 pl-0 md:pl-8 flex flex-col min-h-[300px]">
                                    {console.log('🖼️ Render Right Panel:', { selectedDate, isLoadingSlots, timeSlots: timeSlots.length })}
                                    <h4 className="text-sm font-bold text-slate-900 mb-4 sticky top-0 bg-white py-2">
                                        {selectedDate ? (
                                            selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })
                                        ) : (
                                            <span className="text-slate-400">Selecione um dia</span>
                                        )}
                                    </h4>

                                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                        {isLoadingSlots ? (
                                            <div className="flex justify-center py-8">
                                                <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                            </div>
                                        ) : !selectedDate ? (
                                            <div className="text-center py-8 text-slate-400 text-sm">
                                                <Icons.Calendar size={32} className="mx-auto mb-2 opacity-20" />
                                                Escolha uma data para ver os horários
                                            </div>
                                        ) : timeSlots.length === 0 ? (
                                            <div className="text-center py-8 text-slate-400 text-sm">
                                                Nenhum horário disponível
                                            </div>
                                        ) : (
                                            timeSlots.map((time) => (
                                                <button
                                                    key={time}
                                                    onClick={() => {
                                                        setSelectedTime(time);
                                                        setViewState('form');
                                                    }}
                                                    className={`w-full py-2.5 px-4 rounded-lg text-sm font-bold border transition-all ${selectedTime === time
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                        : 'bg-white text-indigo-600 border-indigo-200 hover:border-indigo-600 hover:bg-indigo-50'
                                                        }`}
                                                >
                                                    {time}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};