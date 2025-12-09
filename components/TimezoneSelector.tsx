import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';

interface TimezoneSelectorProps {
    selectedTimezone: string;
    onTimezoneChange: (timezone: string) => void;
}

export const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
    selectedTimezone,
    onTimezoneChange,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Lista de timezones comuns (pode ser expandida)
    const commonTimezones = [
        'America/Sao_Paulo',
        'America/New_York',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'Australia/Sydney',
        'UTC'
    ];

    // Tenta pegar todos os timezones suportados pelo navegador
    const allTimezones = Intl.supportedValuesOf
        ? Intl.supportedValuesOf('timeZone')
        : commonTimezones;

    const filteredTimezones = allTimezones.filter(tz =>
        tz.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 transition-colors bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 hover:border-indigo-200"
            >
                <Icons.Globe size={14} />
                <span>{selectedTimezone.replace(/_/g, ' ')}</span>
                <Icons.ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-64 max-h-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden flex flex-col">
                        <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                            <div className="relative">
                                <Icons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar cidade..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 p-1">
                            {filteredTimezones.map((tz) => (
                                <button
                                    key={tz}
                                    onClick={() => {
                                        onTimezoneChange(tz);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${selectedTimezone === tz
                                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                                            : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {tz.replace(/_/g, ' ')}
                                </button>
                            ))}
                            {filteredTimezones.length === 0 && (
                                <div className="p-4 text-center text-xs text-slate-400">
                                    Nenhum fuso encontrado
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
