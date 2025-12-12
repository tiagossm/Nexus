import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { campaignBookingService, CampaignBooking } from '../services/campaignBookingService';
import { getAvailableSlots } from '../services/availabilityService';
import { toast } from 'sonner';

interface MyBookingsPageProps {
    accessCode: string;
}

type ViewState = 'loading' | 'details' | 'reschedule' | 'cancelled' | 'error';

export const MyBookingsPage: React.FC<MyBookingsPageProps> = ({ accessCode }) => {
    const [viewState, setViewState] = useState<ViewState>('loading');
    const [booking, setBooking] = useState<CampaignBooking | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Reschedule state
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [timeSlots, setTimeSlots] = useState<string[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

    // Cancel confirmation
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    // Load booking data on mount
    useEffect(() => {
        loadBooking();
    }, [accessCode]);

    const loadBooking = async () => {
        try {
            setViewState('loading');
            const data = await campaignBookingService.getBookingByAccessCode(accessCode);

            if (!data) {
                setError('Agendamento não encontrado. Verifique se o link está correto.');
                setViewState('error');
                return;
            }

            if (data.status === 'cancelled') {
                setBooking(data);
                setViewState('cancelled');
                return;
            }

            setBooking(data);
            setViewState('details');
        } catch (err: any) {
            console.error('Error loading booking:', err);
            setError(err.message || 'Erro ao carregar agendamento.');
            setViewState('error');
        }
    };

    // Load available slots when date changes for rescheduling
    useEffect(() => {
        if (selectedDate && viewState === 'reschedule' && booking) {
            loadAvailableSlots();
        }
    }, [selectedDate, viewState]);

    const loadAvailableSlots = async () => {
        if (!selectedDate || !booking) return;

        setIsLoadingSlots(true);
        try {
            // Get all slots for the campaign
            const campaign = booking.campaign as any;
            const customAvailability = campaign?.custom_availability;

            // Get available slots using the availability service
            const slots = await getAvailableSlots(
                booking.campaign_id,
                selectedDate,
                booking.duration_minutes || 30,
                customAvailability,
                booking.campaign_id
            );

            // Filter out already booked slots (excluding current booking)
            const bookedTimes = await campaignBookingService.getAvailableSlotsForReschedule(accessCode, selectedDate);
            const availableSlots = slots.filter(slot => !bookedTimes.includes(slot));

            setTimeSlots(availableSlots);
        } catch (error) {
            console.error('Error loading slots:', error);
            setTimeSlots([]);
        } finally {
            setIsLoadingSlots(false);
        }
    };

    const handleCancel = async () => {
        if (!booking) return;

        setIsProcessing(true);
        try {
            await campaignBookingService.cancelBookingByAccessCode(accessCode, cancelReason);
            toast.success('Agendamento cancelado com sucesso.');
            setShowCancelConfirm(false);
            await loadBooking();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao cancelar agendamento.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReschedule = async () => {
        if (!booking || !selectedDate || !selectedTime) return;

        setIsProcessing(true);
        try {
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const newStartTime = new Date(selectedDate);
            newStartTime.setHours(hours, minutes, 0, 0);

            const newEndTime = new Date(newStartTime);
            newEndTime.setMinutes(newEndTime.getMinutes() + (booking.duration_minutes || 30));

            await campaignBookingService.rescheduleBookingByAccessCode(accessCode, newStartTime, newEndTime);
            toast.success('Agendamento remarcado com sucesso!');
            setViewState('details');
            setSelectedDate(null);
            setSelectedTime(null);
            await loadBooking();
        } catch (err: any) {
            toast.error(err.message || 'Erro ao remarcar agendamento.');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Calendar helpers
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const startDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    const handleDateClick = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        if (newDate < new Date(new Date().setHours(0, 0, 0, 0))) return;
        setSelectedDate(newDate);
        setSelectedTime(null);
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    // Render Loading State
    if (viewState === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Carregando seu agendamento...</p>
                </div>
            </div>
        );
    }

    // Render Error State
    if (viewState === 'error') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.AlertCircle size={32} className="text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Ops!</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <a
                        href="/"
                        className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all"
                    >
                        Voltar ao início
                    </a>
                </div>
            </div>
        );
    }

    // Render Cancelled State
    if (viewState === 'cancelled' && booking) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.XCircle size={32} className="text-slate-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Agendamento Cancelado</h2>
                    <p className="text-slate-600 mb-4">
                        Este agendamento foi cancelado em {formatDate(booking.updated_at)}.
                    </p>
                    {booking.cancellation_reason && (
                        <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg mb-6">
                            <strong>Motivo:</strong> {booking.cancellation_reason}
                        </p>
                    )}
                    <p className="text-slate-500 text-sm">
                        Para fazer um novo agendamento, utilize o link original recebido por email.
                    </p>
                </div>
            </div>
        );
    }

    // Render Reschedule View
    if (viewState === 'reschedule' && booking) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                        <button
                            onClick={() => setViewState('details')}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4 transition-colors"
                        >
                            <Icons.ChevronLeft size={18} />
                            Voltar
                        </button>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Remarcar Agendamento</h1>
                        <p className="text-slate-600">Escolha uma nova data e horário para seu atendimento.</p>
                    </div>

                    {/* Calendar & Slots */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Calendar Grid */}
                            <div className="flex-1">
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
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Time Slots */}
                            <div className="w-full md:w-48 border-l border-slate-100 pl-0 md:pl-8 flex flex-col min-h-[300px]">
                                <h4 className="text-sm font-bold text-slate-900 mb-4 sticky top-0 bg-white py-2">
                                    {selectedDate ? (
                                        selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric' })
                                    ) : (
                                        <span className="text-slate-400">Selecione um dia</span>
                                    )}
                                </h4>

                                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
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
                                            Nenhum horário disponível neste dia
                                        </div>
                                    ) : (
                                        timeSlots.map((time) => (
                                            <button
                                                key={time}
                                                onClick={() => setSelectedTime(time)}
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

                        {/* Confirm Button */}
                        {selectedDate && selectedTime && (
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <div className="bg-indigo-50 p-4 rounded-lg mb-4 flex items-center gap-3">
                                    <Icons.CalendarDays className="text-indigo-600" size={24} />
                                    <div>
                                        <p className="font-bold text-indigo-900">
                                            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </p>
                                        <p className="text-indigo-700">{selectedTime}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleReschedule}
                                    disabled={isProcessing}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl py-3 font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Remarcando...
                                        </>
                                    ) : (
                                        <>
                                            <Icons.Check size={20} />
                                            Confirmar Nova Data
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Render Details View (default)
    if (viewState === 'details' && booking) {
        const startDate = new Date(booking.start_time);
        const endDate = new Date(booking.end_time);

        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
                <div className="max-w-lg mx-auto">
                    {/* Header */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
                        <div className="flex items-center justify-center mb-6">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                                <Icons.Calendar size={40} className="text-green-600" />
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
                            Seu Agendamento
                        </h1>
                        <p className="text-slate-500 text-center mb-8">
                            {(booking.campaign as any)?.title || 'Consulta'}
                        </p>

                        {/* Booking Details */}
                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                                <Icons.CalendarDays className="text-indigo-600 mt-0.5" size={24} />
                                <div>
                                    <p className="font-bold text-slate-900">{formatDate(booking.start_time)}</p>
                                    <p className="text-slate-600">
                                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                                <Icons.User className="text-indigo-600 mt-0.5" size={24} />
                                <div>
                                    <p className="font-bold text-slate-900">{booking.client_name}</p>
                                    <p className="text-slate-600">{booking.client_email}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                <Icons.Clock className="text-indigo-600" size={24} />
                                <div>
                                    <p className="font-bold text-slate-900">{booking.duration_minutes || 30} minutos</p>
                                    <p className="text-slate-600">Duração do atendimento</p>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center justify-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                                <Icons.CheckCircle className="text-green-600" size={20} />
                                <span className="font-bold text-green-700">Confirmado</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-3">
                        <button
                            onClick={() => setViewState('reschedule')}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                        >
                            <Icons.RefreshCw size={20} />
                            Remarcar Agendamento
                        </button>

                        <button
                            onClick={() => setShowCancelConfirm(true)}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-red-600 border-2 border-red-200 rounded-xl font-bold hover:bg-red-50 hover:border-red-300 transition-all"
                        >
                            <Icons.XCircle size={20} />
                            Cancelar Agendamento
                        </button>
                    </div>

                    {/* Cancel Confirmation Modal */}
                    {showCancelConfirm && (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Icons.AlertTriangle size={32} className="text-red-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 text-center mb-2">
                                    Cancelar Agendamento?
                                </h3>
                                <p className="text-slate-600 text-center mb-6">
                                    Esta ação não pode ser desfeita. Você precisará fazer um novo agendamento se mudar de ideia.
                                </p>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Motivo do cancelamento (opcional)
                                    </label>
                                    <textarea
                                        value={cancelReason}
                                        onChange={(e) => setCancelReason(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none transition-all resize-none"
                                        rows={3}
                                        placeholder="Ex: Imprevisto de última hora..."
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowCancelConfirm(false)}
                                        className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-all"
                                    >
                                        Voltar
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        disabled={isProcessing}
                                        className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Icons.XCircle size={18} />
                                                Confirmar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
};
