import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import {
    AvailabilityRule,
    AvailabilityException,
    getAvailabilityRules,
    createAvailabilityRule,
    deleteAvailabilityRule,
    getAvailabilityExceptions,
    createAvailabilityException,
    deleteAvailabilityException
} from '../services/availabilityService';
import { toast } from 'sonner';

const DAYS_OF_WEEK = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda' },
    { value: 2, label: 'Terça' },
    { value: 3, label: 'Quarta' },
    { value: 4, label: 'Quinta' },
    { value: 5, label: 'Sexta' },
    { value: 6, label: 'Sábado' }
];

export const AvailabilitySettings: React.FC = () => {
    const [rules, setRules] = useState<AvailabilityRule[]>([]);
    const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Add form state
    const [newDayOfWeek, setNewDayOfWeek] = useState<number>(1);
    const [newStartTime, setNewStartTime] = useState('09:00');
    const [newEndTime, setNewEndTime] = useState('17:00');

    // Exception form state
    const [isAddingException, setIsAddingException] = useState(false);
    const [newExceptionDate, setNewExceptionDate] = useState('');
    const [newExceptionStart, setNewExceptionStart] = useState('09:00');
    const [newExceptionEnd, setNewExceptionEnd] = useState('17:00');
    const [isFullDayException, setIsFullDayException] = useState(true);
    const [newExceptionReason, setNewExceptionReason] = useState('');

    const handleAddException = async () => {
        if (!newExceptionDate) {
            toast.error('Selecione uma data');
            return;
        }

        try {
            await createAvailabilityException({
                exception_date: newExceptionDate,
                start_time: isFullDayException ? undefined : newExceptionStart,
                end_time: isFullDayException ? undefined : newExceptionEnd,
                is_available: false,
                reason: newExceptionReason
            });

            toast.success('Exceção adicionada!');
            setIsAddingException(false);
            setNewExceptionDate('');
            setNewExceptionReason('');
            loadAvailability();
        } catch (error) {
            console.error('Error creating exception:', error);
            toast.error('Erro ao adicionar exceção');
        }
    };

    const handleDeleteException = async (id: string) => {
        if (!confirm('Remover esta exceção?')) return;

        try {
            await deleteAvailabilityException(id);
            toast.success('Exceção removida');
            loadAvailability();
        } catch (error) {
            console.error('Error deleting exception:', error);
            toast.error('Erro ao remover exceção');
        }
    };

    useEffect(() => {
        loadAvailability();
    }, []);

    const loadAvailability = async () => {
        setIsLoading(true);
        try {
            const [rulesData, exceptionsData] = await Promise.all([
                getAvailabilityRules(),
                getAvailabilityExceptions()
            ]);
            setRules(rulesData);
            setExceptions(exceptionsData);
        } catch (error) {
            console.error('Error loading availability:', error);
            toast.error('Erro ao carregar disponibilidade');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddRule = async () => {
        try {
            await createAvailabilityRule({
                day_of_week: newDayOfWeek,
                start_time: newStartTime,
                end_time: newEndTime,
                is_available: true
            });

            toast.success('Horário adicionado!');
            setIsAdding(false);
            loadAvailability();
        } catch (error) {
            console.error('Error creating rule:', error);
            toast.error('Erro ao adicionar horário');
        }
    };

    const handleDeleteRule = async (id: string) => {
        if (!confirm('Remover este horário?')) return;

        try {
            await deleteAvailabilityRule(id);
            toast.success('Horário removido');
            loadAvailability();
        } catch (error) {
            console.error('Error deleting rule:', error);
            toast.error('Erro ao remover horário');
        }
    };

    const getDayLabel = (day: number) => {
        return DAYS_OF_WEEK.find(d => d.value === day)?.label || '';
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Gerenciar Disponibilidade</h2>
                <p className="text-slate-600">Configure os horários em que você está disponível para agendamentos.</p>
            </div>

            {/* Current Rules */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800">Horários Disponíveis</h3>
                        <button
                            onClick={() => setIsAdding(true)}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                        >
                            <Icons.Plus size={16} />
                            Adicionar Horário
                        </button>
                    </div>
                </div>

                {isAdding && (
                    <div className="p-6 border-b border-slate-100 bg-indigo-50/50">
                        <div className="grid grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Dia da Semana</label>
                                <select
                                    value={newDayOfWeek}
                                    onChange={(e) => setNewDayOfWeek(parseInt(e.target.value))}
                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                >
                                    {DAYS_OF_WEEK.map(day => (
                                        <option key={day.value} value={day.value}>{day.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Início</label>
                                <input
                                    type="time"
                                    value={newStartTime}
                                    onChange={(e) => setNewStartTime(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Fim</label>
                                <input
                                    type="time"
                                    value={newEndTime}
                                    onChange={(e) => setNewEndTime(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAddRule}
                                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
                                >
                                    Salvar
                                </button>
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="divide-y divide-slate-100">
                    {rules.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            Nenhum horário configurado. Adicione um horário para começar.
                        </div>
                    ) : (
                        rules.map((rule) => (
                            <div key={rule.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-6">
                                    <div className="w-32">
                                        <span className="font-bold text-slate-900">{getDayLabel(rule.day_of_week)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Icons.Clock size={16} className="text-slate-400" />
                                        <span className="font-medium">
                                            {rule.start_time} - {rule.end_time}
                                        </span>
                                    </div>
                                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                        Disponível
                                    </span>
                                </div>
                                <button
                                    onClick={() => rule.id && handleDeleteRule(rule.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Icons.Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Exceptions */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Exceções (Férias, Feriados)</h3>
                            <p className="text-sm text-slate-500 mt-1">Datas específicas em que você não estará disponível</p>
                        </div>
                        <button
                            onClick={() => setIsAddingException(true)}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                        >
                            <Icons.Plus size={16} />
                            Adicionar Exceção
                        </button>
                    </div>
                </div>

                {isAddingException && (
                    <div className="p-6 border-b border-slate-100 bg-indigo-50/50">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Data</label>
                                <input
                                    type="date"
                                    value={newExceptionDate}
                                    onChange={(e) => setNewExceptionDate(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Motivo (Opcional)</label>
                                <input
                                    type="text"
                                    value={newExceptionReason}
                                    onChange={(e) => setNewExceptionReason(e.target.value)}
                                    placeholder="Ex: Feriado, Consulta Médica..."
                                    className="w-full p-2 border border-slate-200 rounded-lg"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAddException}
                                    className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex-1"
                                >
                                    Salvar
                                </button>
                                <button
                                    onClick={() => setIsAddingException(false)}
                                    className="px-4 py-2 bg-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-300"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="fullDay"
                                checked={isFullDayException}
                                onChange={(e) => setIsFullDayException(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                            />
                            <label htmlFor="fullDay" className="text-sm text-slate-700 font-medium">Dia inteiro indisponível</label>
                        </div>
                        {!isFullDayException && (
                            <div className="grid grid-cols-2 gap-4 mt-4 w-1/2">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Início</label>
                                    <input
                                        type="time"
                                        value={newExceptionStart}
                                        onChange={(e) => setNewExceptionStart(e.target.value)}
                                        className="w-full p-2 border border-slate-200 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Fim</label>
                                    <input
                                        type="time"
                                        value={newExceptionEnd}
                                        onChange={(e) => setNewExceptionEnd(e.target.value)}
                                        className="w-full p-2 border border-slate-200 rounded-lg"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="divide-y divide-slate-100">
                    {exceptions.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            Nenhuma exceção configurada.
                        </div>
                    ) : (
                        exceptions.map((exception) => (
                            <div key={exception.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-6">
                                    <div className="w-32">
                                        <span className="font-bold text-slate-900">
                                            {new Date(exception.exception_date).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600">
                                        {exception.start_time ? (
                                            <>
                                                <Icons.Clock size={16} className="text-slate-400" />
                                                <span className="font-medium">
                                                    {exception.start_time.slice(0, 5)} - {exception.end_time?.slice(0, 5)}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                                Dia Inteiro
                                            </span>
                                        )}
                                    </div>
                                    {exception.reason && (
                                        <span className="text-slate-500 text-sm italic">
                                            - {exception.reason}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => exception.id && handleDeleteException(exception.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Icons.Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
