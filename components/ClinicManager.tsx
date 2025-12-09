import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Clinic, clinicService, TechnicalResponsible } from '../services/clinicService';
import { Exam, examService } from '../services/examService';
import { toast } from 'sonner';

export const ClinicManager: React.FC = () => {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [availableExams, setAvailableExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [cnpjLoading, setCnpjLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Partial<Clinic>>({
        name: '',
        corporate_name: '',
        cnpj: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        phone: '',
        email: '',
        capacity_per_hour: 4,
        working_hours: {
            mon: { start: '08:00', end: '17:00' },
            tue: { start: '08:00', end: '17:00' },
            wed: { start: '08:00', end: '17:00' },
            thu: { start: '08:00', end: '17:00' },
            fri: { start: '08:00', end: '17:00' },
            sat: { start: '08:00', end: '12:00' },
            sun: null
        },
        technical_responsible: {
            name: '',
            council_id: '',
            council_type: 'CRM',
            uf: ''
        },
        facilities: [],
        offered_exams: []
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [clinicsData, examsData] = await Promise.all([
                clinicService.getClinics(false),
                examService.getExams(true)
            ]);
            setClinics(clinicsData);
            setAvailableExams(examsData);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleCnpjBlur = async () => {
        const cnpj = formData.cnpj?.replace(/\D/g, '');
        if (!cnpj || cnpj.length !== 14) return;

        try {
            setCnpjLoading(true);
            const data = await clinicService.fetchCnpjData(cnpj);

            // Auto-fill form
            setFormData(prev => ({
                ...prev,
                corporate_name: data.razao_social,
                name: data.nome_fantasia || data.razao_social,
                zip_code: data.cep,
                address: `${data.logradouro}, ${data.numero}${data.complemento ? ' - ' + data.complemento : ''} - ${data.bairro}`,
                city: data.municipio,
                state: data.uf,
                phone: data.ddd_telefone_1,
                cnae_code: data.cnae_fiscal,
                cnae_description: data.cnae_fiscal_descricao
            }));

            toast.success('Dados da empresa carregados com sucesso!');

            // Suggest exams based on CNAE (8630-5/03 = Atividade médica ambulatorial restrita a consultas)
            // or if description contains "MEDICINA DO TRABALHO"
            const isOccupational =
                data.cnae_fiscal_descricao?.toLowerCase().includes('trabalho') ||
                data.cnae_fiscal_descricao?.toLowerCase().includes('ocupacional') ||
                data.cnae_fiscal === 8630503;

            if (isOccupational) {
                toast.info('Clínica Ocupacional detectada! Sugerindo exames...');
                // Pre-select common occupational exams
                const commonExams = availableExams
                    .filter(e => ['ASO', 'AUDIO', 'ACUIDADE', 'ESPIRO', 'ECG', 'EEG', 'RAIO-X'].some(code => e.code.includes(code)))
                    .map(e => e.id);

                setFormData(prev => ({
                    ...prev,
                    offered_exams: [...new Set([...(prev.offered_exams || []), ...commonExams])]
                }));
            }

        } catch (error) {
            console.error('Erro ao buscar CNPJ:', error);
            toast.error('Erro ao buscar dados do CNPJ. Verifique se o número está correto.');
        } finally {
            setCnpjLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            if (editingClinic) {
                await clinicService.updateClinic(editingClinic.id, formData);
                toast.success('Clínica atualizada com sucesso!');
            } else {
                await clinicService.createClinic({ ...formData, active: true } as any);
                toast.success('Clínica cadastrada com sucesso!');
            }
            await loadData();
            handleCloseModal();
        } catch (error) {
            console.error('Erro ao salvar clínica:', error);
            toast.error('Erro ao salvar clínica');
        }
    };

    const handleEdit = (clinic: Clinic) => {
        setEditingClinic(clinic);
        setFormData(clinic);
        setShowAddModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja desativar esta clínica?')) return;

        try {
            await clinicService.deleteClinic(id);
            toast.success('Clínica desativada com sucesso!');
            await loadData();
        } catch (error) {
            console.error('Erro ao desativar clínica:', error);
            toast.error('Erro ao desativar clínica');
        }
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingClinic(null);
        setFormData({
            name: '',
            corporate_name: '',
            cnpj: '',
            address: '',
            city: '',
            state: '',
            zip_code: '',
            phone: '',
            email: '',
            capacity_per_hour: 4,
            working_hours: {
                mon: { start: '08:00', end: '17:00' },
                tue: { start: '08:00', end: '17:00' },
                wed: { start: '08:00', end: '17:00' },
                thu: { start: '08:00', end: '17:00' },
                fri: { start: '08:00', end: '17:00' },
                sat: { start: '08:00', end: '12:00' },
                sun: null
            },
            technical_responsible: {
                name: '',
                council_id: '',
                council_type: 'CRM',
                uf: ''
            },
            facilities: [],
            offered_exams: []
        });
    };

    const toggleFacility = (facility: string) => {
        const current = formData.facilities || [];
        if (current.includes(facility)) {
            setFormData({ ...formData, facilities: current.filter(f => f !== facility) });
        } else {
            setFormData({ ...formData, facilities: [...current, facility] });
        }
    };

    const toggleExam = (examId: string) => {
        const current = formData.offered_exams || [];
        if (current.includes(examId)) {
            setFormData({ ...formData, offered_exams: current.filter(id => id !== examId) });
        } else {
            setFormData({ ...formData, offered_exams: [...current, examId] });
        }
    };

    const filteredClinics = clinics.filter(clinic =>
        clinic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.corporate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clinic.cnpj?.includes(searchTerm) ||
        clinic.city.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const FACILITIES_OPTIONS = [
        'Acessibilidade', 'Estacionamento', 'Wifi', 'Café', 'Sala de Espera VIP', 'Próximo ao Metrô'
    ];

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Gerenciar Clínicas</h2>
                    <p className="text-slate-600">Gestão completa da rede credenciada e unidades próprias.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                    <Icons.Plus size={20} />
                    Nova Clínica
                </button>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por nome, CNPJ, cidade..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Clinics List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Icons.Loader2 size={32} className="text-indigo-600 animate-spin" />
                </div>
            ) : filteredClinics.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
                    <Icons.MapPin size={48} className="text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                        {searchTerm ? 'Nenhuma clínica encontrada' : 'Nenhuma clínica cadastrada'}
                    </h3>
                    <p className="text-slate-600 mb-6">
                        {searchTerm
                            ? 'Tente buscar com outros termos'
                            : 'Cadastre sua primeira clínica para começar'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium"
                        >
                            Cadastrar Clínica
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClinics.map((clinic) => (
                        <div
                            key={clinic.id}
                            className={`bg-white border-2 rounded-xl p-6 transition-all flex flex-col ${clinic.active
                                    ? 'border-slate-200 hover:border-indigo-200 hover:shadow-lg'
                                    : 'border-red-200 bg-red-50/30'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg line-clamp-1">{clinic.name}</h3>
                                    {clinic.corporate_name && (
                                        <p className="text-xs text-slate-500 line-clamp-1">{clinic.corporate_name}</p>
                                    )}
                                </div>
                                {!clinic.active && (
                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                        Inativa
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3 text-sm mb-6 flex-1">
                                <div className="flex items-start gap-2 text-slate-600">
                                    <Icons.MapPin size={14} className="mt-0.5 flex-shrink-0" />
                                    <span className="line-clamp-2">{clinic.address}, {clinic.city} - {clinic.state}</span>
                                </div>

                                {clinic.cnpj && (
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Icons.FileText size={14} />
                                        <span className="font-mono text-xs">{clinic.cnpj}</span>
                                    </div>
                                )}

                                {clinic.phone && (
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Icons.Phone size={14} />
                                        <span>{clinic.phone}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 text-indigo-600 font-medium">
                                    <Icons.Users size={14} />
                                    <span>{clinic.capacity_per_hour} vagas/hora</span>
                                </div>

                                {clinic.offered_exams && clinic.offered_exams.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {clinic.offered_exams.slice(0, 3).map(examId => {
                                            const exam = availableExams.find(e => e.id === examId);
                                            return exam ? (
                                                <span key={examId} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                                                    {exam.code}
                                                </span>
                                            ) : null;
                                        })}
                                        {clinic.offered_exams.length > 3 && (
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                                                +{clinic.offered_exams.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-slate-100 mt-auto">
                                <button
                                    onClick={() => handleEdit(clinic)}
                                    className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(clinic.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <Icons.Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">
                                    {editingClinic ? 'Editar Clínica' : 'Nova Clínica'}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {editingClinic ? 'Atualize os dados da unidade' : 'Preencha os dados para cadastrar uma nova unidade'}
                                </p>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 hover:bg-slate-200 rounded-lg transition-all"
                            >
                                <Icons.X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left Column: Basic Info */}
                                <div className="space-y-6">
                                    <h4 className="font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <Icons.Building size={18} className="text-indigo-600" />
                                        Dados Cadastrais
                                    </h4>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            CNPJ (Busca Automática)
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={formData.cnpj}
                                                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                                                onBlur={handleCnpjBlur}
                                                placeholder="00.000.000/0000-00"
                                                className="w-full pl-4 pr-10 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                            />
                                            {cnpjLoading && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <Icons.Loader2 size={16} className="text-indigo-600 animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Digite o CNPJ e clique fora para buscar os dados automaticamente.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Razão Social
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.corporate_name}
                                            onChange={(e) => setFormData({ ...formData, corporate_name: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Nome Fantasia *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Telefone
                                            </label>
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100 pt-4">
                                        <Icons.MapPin size={18} className="text-indigo-600" />
                                        Endereço
                                    </h4>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            CEP
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.zip_code}
                                            onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Logradouro Completo
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Cidade
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.city}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Estado
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.state}
                                                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Operational & Exams */}
                                <div className="space-y-6">
                                    <h4 className="font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                                        <Icons.UserCheck size={18} className="text-indigo-600" />
                                        Responsável Técnico
                                    </h4>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Nome do Médico/Responsável
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.technical_responsible?.name}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    technical_responsible: { ...formData.technical_responsible!, name: e.target.value }
                                                })}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                Conselho (CRM/etc)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.technical_responsible?.council_id}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    technical_responsible: { ...formData.technical_responsible!, council_id: e.target.value }
                                                })}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100 pt-4">
                                        <Icons.CheckSquare size={18} className="text-indigo-600" />
                                        Facilidades & Capacidade
                                    </h4>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Capacidade (vagas/hora)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.capacity_per_hour}
                                            onChange={(e) => setFormData({ ...formData, capacity_per_hour: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            Facilidades Disponíveis
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {FACILITIES_OPTIONS.map(facility => (
                                                <button
                                                    key={facility}
                                                    onClick={() => toggleFacility(facility)}
                                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${formData.facilities?.includes(facility)
                                                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {facility}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100 pt-4">
                                        <Icons.FileText size={18} className="text-indigo-600" />
                                        Exames Realizados
                                    </h4>

                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 max-h-60 overflow-y-auto">
                                        <div className="flex flex-wrap gap-2">
                                            {availableExams.map(exam => (
                                                <button
                                                    key={exam.id}
                                                    onClick={() => toggleExam(exam.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${formData.offered_exams?.includes(exam.id)
                                                            ? 'bg-indigo-600 text-white shadow-md'
                                                            : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                                                        }`}
                                                >
                                                    {exam.code}
                                                    {formData.offered_exams?.includes(exam.id) && <Icons.Check size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                        {availableExams.length === 0 && (
                                            <p className="text-sm text-slate-500 text-center py-4">
                                                Nenhum exame cadastrado no sistema. Cadastre exames primeiro.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                            <button
                                onClick={handleCloseModal}
                                className="px-6 py-2.5 text-slate-700 hover:bg-slate-200 rounded-lg transition-all font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!formData.name || !formData.address || !formData.city}
                                className="px-8 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-indigo-600/20"
                            >
                                {editingClinic ? 'Salvar Alterações' : 'Cadastrar Clínica'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
