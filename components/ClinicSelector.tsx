import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Clinic, clinicService } from '../services/clinicService';

interface ClinicSelectorProps {
    selectedClinicId?: string;
    onSelect: (clinic: Clinic | null) => void;
    allowMultiple?: boolean;
}

export const ClinicSelector: React.FC<ClinicSelectorProps> = ({
    selectedClinicId,
    onSelect,
    allowMultiple = false
}) => {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        loadClinics();
    }, []);

    const loadClinics = async () => {
        try {
            setLoading(true);
            const data = await clinicService.getClinics();
            setClinics(data);
        } catch (error) {
            console.error('Erro ao carregar clínicas:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredClinics = clinics.filter(clinic =>
        clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getWorkingHoursDisplay = (clinic: Clinic) => {
        const days = [];
        if (clinic.working_hours.mon) days.push('Seg');
        if (clinic.working_hours.tue) days.push('Ter');
        if (clinic.working_hours.wed) days.push('Qua');
        if (clinic.working_hours.thu) days.push('Qui');
        if (clinic.working_hours.fri) days.push('Sex');
        if (clinic.working_hours.sat) days.push('Sáb');
        if (clinic.working_hours.sun) days.push('Dom');

        const firstDay = clinic.working_hours.mon || clinic.working_hours.tue || clinic.working_hours.wed;
        if (!firstDay) return 'Não configurado';

        return `${days.join(', ')} • ${firstDay.start} - ${firstDay.end}`;
    };

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nome, cidade ou endereço..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm font-medium"
                >
                    <Icons.Plus size={16} />
                    Nova Clínica
                </button>
            </div>

            {/* Clinic List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Icons.Loader2 size={32} className="text-indigo-600 animate-spin" />
                </div>
            ) : filteredClinics.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-12 text-center">
                    <Icons.MapPin size={48} className="text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                        {searchTerm ? 'Nenhuma clínica encontrada' : 'Nenhuma clínica cadastrada'}
                    </h3>
                    <p className="text-slate-600 mb-6">
                        {searchTerm
                            ? 'Tente buscar com outros termos'
                            : 'Adicione uma clínica para começar a agendar exames'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium"
                        >
                            Adicionar Clínica
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredClinics.map((clinic) => (
                        <div
                            key={clinic.id}
                            onClick={() => onSelect(clinic)}
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${selectedClinicId === clinic.id
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-900 mb-1">{clinic.name}</h4>
                                    <p className="text-sm text-slate-600 flex items-center gap-1">
                                        <Icons.MapPin size={14} />
                                        {clinic.city}, {clinic.state}
                                    </p>
                                </div>
                                {selectedClinicId === clinic.id && (
                                    <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                                        <Icons.Check size={14} />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                    <Icons.Phone size={14} />
                                    <span>{clinic.phone}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icons.Clock size={14} />
                                    <span>{getWorkingHoursDisplay(clinic)}</span>
                                </div>
                            </div>

                            {clinic.facilities && clinic.facilities.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {clinic.facilities.slice(0, 3).map((facility, index) => (
                                        <span key={index} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                                            {facility}
                                        </span>
                                    ))}
                                    {clinic.facilities.length > 3 && (
                                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                                            +{clinic.facilities.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}

                            {clinic.technical_responsible && (
                                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                                    <span className="font-medium">RT:</span> {clinic.technical_responsible.name}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add Modal - Simplified placeholder */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Nova Clínica</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <Icons.X size={20} />
                            </button>
                        </div>

                        <div className="text-center py-12">
                            <Icons.Info size={48} className="text-indigo-600 mx-auto mb-4" />
                            <p className="text-slate-600">
                                Para cadastrar uma nova clínica, utilize o módulo de Gestão de Clínicas no menu lateral.
                            </p>
                            <div className="mt-6">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                                >
                                    Entendi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
