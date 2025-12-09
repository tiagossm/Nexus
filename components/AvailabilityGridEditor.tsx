import React, { useState } from 'react';
import { Icons } from './Icons';

interface TimeSlot {
    start: string;
    end: string;
    slots_per_hour?: number;
}

interface AvailabilityConfig {
    weekdays?: string[];
    time_slots?: TimeSlot[];
    blocked_dates?: string[];
    special_dates?: Record<string, { start: string; end: string }>;
}

interface AvailabilityGridEditorProps {
    value: AvailabilityConfig;
    onChange: (config: AvailabilityConfig) => void;
}

const WEEKDAYS = [
    { key: 'mon', label: 'Seg' },
    { key: 'tue', label: 'Ter' },
    { key: 'wed', label: 'Qua' },
    { key: 'thu', label: 'Qui' },
    { key: 'fri', label: 'Sex' },
    { key: 'sat', label: 'Sáb' },
    { key: 'sun', label: 'Dom' }
];

export const AvailabilityGridEditor: React.FC<AvailabilityGridEditorProps> = ({
    value,
    onChange
}) => {
    const [newBlockedDate, setNewBlockedDate] = useState('');

    const toggleWeekday = (day: string) => {
        const weekdays = value.weekdays || [];
        if (weekdays.includes(day)) {
            onChange({ ...value, weekdays: weekdays.filter(d => d !== day) });
        } else {
            onChange({ ...value, weekdays: [...weekdays, day] });
        }
    };

    const addTimeSlot = () => {
        const timeSlots = value.time_slots || [];
        onChange({
            ...value,
            time_slots: [...timeSlots, { start: '09:00', end: '17:00', slots_per_hour: 4 }]
        });
    };

    const updateTimeSlot = (index: number, updates: Partial<TimeSlot>) => {
        const timeSlots = [...(value.time_slots || [])];
        timeSlots[index] = { ...timeSlots[index], ...updates };
        onChange({ ...value, time_slots: timeSlots });
    };

    const removeTimeSlot = (index: number) => {
        const timeSlots = value.time_slots || [];
        onChange({ ...value, time_slots: timeSlots.filter((_, i) => i !== index) });
    };

    const addBlockedDate = () => {
        if (!newBlockedDate) return;
        const blockedDates = value.blocked_dates || [];
        if (!blockedDates.includes(newBlockedDate)) {
            onChange({ ...value, blocked_dates: [...blockedDates, newBlockedDate] });
            setNewBlockedDate('');
        }
    };

    const removeBlockedDate = (date: string) => {
        const blockedDates = value.blocked_dates || [];
        onChange({ ...value, blocked_dates: blockedDates.filter(d => d !== date) });
    };

    return (
        <div className="space-y-6">
            {/* Weekdays Selection */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                    Dias da Semana Disponíveis
                </label>
                <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => (
                        <button
                            key={day.key}
                            onClick={() => toggleWeekday(day.key)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${(value.weekdays || []).includes(day.key)
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {day.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Time Slots */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-700">
                        Horários de Atendimento
                    </label>
                    <button
                        onClick={addTimeSlot}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                    >
                        <Icons.Plus size={16} />
                        Adicionar Horário
                    </button>
                </div>

                {(value.time_slots || []).length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                        <Icons.Clock size={32} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">
                            Nenhum horário configurado. Clique para adicionar.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {value.time_slots.map((slot, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <div className="flex-1 grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-600 mb-1">Início</label>
                                        <input
                                            type="time"
                                            value={slot.start}
                                            onChange={(e) => updateTimeSlot(index, { start: e.target.value })}
                                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-slate-600 mb-1">Fim</label>
                                        <input
                                            type="time"
                                            value={slot.end}
                                            onChange={(e) => updateTimeSlot(index, { end: e.target.value })}
                                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-slate-600 mb-1">Vagas/hora</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={slot.slots_per_hour || 4}
                                            onChange={(e) => updateTimeSlot(index, { slots_per_hour: parseInt(e.target.value) })}
                                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => removeTimeSlot(index)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <Icons.Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Blocked Dates */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                    Datas Bloqueadas (Feriados, Manutenção)
                </label>

                <div className="flex gap-2 mb-3">
                    <input
                        type="date"
                        value={newBlockedDate}
                        onChange={(e) => setNewBlockedDate(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        onClick={addBlockedDate}
                        disabled={!newBlockedDate}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                    >
                        Adicionar
                    </button>
                </div>

                {(value.blocked_dates || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {value.blocked_dates.map((date) => (
                            <div
                                key={date}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-sm"
                            >
                                <Icons.Calendar size={14} className="text-red-600" />
                                <span className="text-red-700 font-medium">
                                    {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </span>
                                <button
                                    onClick={() => removeBlockedDate(date)}
                                    className="text-red-600 hover:text-red-700"
                                >
                                    <Icons.X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Summary */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                    <Icons.Info size={16} />
                    Resumo da Disponibilidade
                </h4>
                <div className="text-sm text-indigo-700 space-y-1">
                    <div>
                        • <strong>{(value.weekdays || []).length}</strong> dias da semana ativos
                    </div>
                    <div>
                        • <strong>{(value.time_slots || []).length}</strong> horário{(value.time_slots || []).length !== 1 ? 's' : ''} configurado{(value.time_slots || []).length !== 1 ? 's' : ''}
                    </div>
                    <div>
                        • <strong>{(value.blocked_dates || []).length}</strong> data{(value.blocked_dates || []).length !== 1 ? 's' : ''} bloqueada{(value.blocked_dates || []).length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>
        </div>
    );
};
