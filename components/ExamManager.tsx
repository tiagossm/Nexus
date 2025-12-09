import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Exam, examService } from '../services/examService';
import { toast } from 'sonner';

export const ExamManager: React.FC = () => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        duration_minutes: 15,
        requires_fasting: false,
        preparation_instructions: '',
        category: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [examsData, categoriesData] = await Promise.all([
                examService.getExams(false), // Get all including inactive
                examService.getCategories()
            ]);
            setExams(examsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Erro ao carregar exames:', error);
            toast.error('Erro ao carregar exames');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            if (editingExam) {
                await examService.updateExam(editingExam.id, formData);
                toast.success('Exame atualizado com sucesso!');
            } else {
                await examService.createExam({ ...formData, active: true } as any);
                toast.success('Exame cadastrado com sucesso!');
            }
            await loadData();
            handleCloseModal();
        } catch (error) {
            console.error('Erro ao salvar exame:', error);
            toast.error('Erro ao salvar exame');
        }
    };

    const handleEdit = (exam: Exam) => {
        setEditingExam(exam);
        setFormData({
            name: exam.name,
            code: exam.code,
            description: exam.description || '',
            duration_minutes: exam.duration_minutes,
            requires_fasting: exam.requires_fasting,
            preparation_instructions: exam.preparation_instructions || '',
            category: exam.category || ''
        });
        setShowAddModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja desativar este exame?')) return;

        try {
            await examService.deleteExam(id);
            toast.success('Exame desativado com sucesso!');
            await loadData();
        } catch (error) {
            console.error('Erro ao desativar exame:', error);
            toast.error('Erro ao desativar exame');
        }
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingExam(null);
        setFormData({
            name: '',
            code: '',
            description: '',
            duration_minutes: 15,
            requires_fasting: false,
            preparation_instructions: '',
            category: ''
        });
    };

    const filteredExams = exams.filter(exam => {
        const matchesSearch =
            exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exam.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || exam.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const groupedExams = filteredExams.reduce((acc, exam) => {
        const category = exam.category || 'Outros';
        if (!acc[category]) acc[category] = [];
        acc[category].push(exam);
        return acc;
    }, {} as Record<string, Exam[]>);

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Gerenciar Exames</h2>
                    <p className="text-slate-600">Cadastre e gerencie o catálogo de exames ocupacionais.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30"
                >
                    <Icons.Plus size={20} />
                    Novo Exame
                </button>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-3">
                <div className="relative flex-1">
                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar exames por nome ou código..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="all">Todas Categorias</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Exams List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Icons.Loader2 size={32} className="text-indigo-600 animate-spin" />
                </div>
            ) : filteredExams.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
                    <Icons.FileText size={48} className="text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                        {searchTerm ? 'Nenhum exame encontrado' : 'Nenhum exame cadastrado'}
                    </h3>
                    <p className="text-slate-600 mb-6">
                        {searchTerm
                            ? 'Tente buscar com outros termos'
                            : 'Cadastre o primeiro exame do catálogo'}
                    </p>
                    {!searchTerm && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium"
                        >
                            Cadastrar Exame
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedExams).map(([category, categoryExams]) => (
                        <div key={category}>
                            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
                                {category} ({categoryExams.length})
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {categoryExams.map((exam) => (
                                    <div
                                        key={exam.id}
                                        className={`bg-white border-2 rounded-xl p-4 transition-all ${exam.active
                                                ? 'border-slate-200 hover:border-indigo-200 hover:shadow-lg'
                                                : 'border-red-200 bg-red-50/30'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-slate-900">{exam.name}</h4>
                                                    {!exam.active && (
                                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                            Inativo
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                                    {exam.code}
                                                </span>
                                            </div>
                                        </div>

                                        {exam.description && (
                                            <p className="text-sm text-slate-600 mb-3 line-clamp-2">{exam.description}</p>
                                        )}

                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Icons.Clock size={14} className="text-slate-400" />
                                                <span className="text-slate-700">{exam.duration_minutes} minutos</span>
                                            </div>

                                            {exam.requires_fasting && (
                                                <div className="flex items-center gap-2 text-sm text-orange-600">
                                                    <Icons.AlertTriangle size={14} />
                                                    <span className="font-medium">Requer jejum</span>
                                                </div>
                                            )}

                                            {exam.preparation_instructions && (
                                                <div className="flex items-center gap-2 text-sm text-indigo-600">
                                                    <Icons.Info size={14} />
                                                    <span className="font-medium">Com preparo</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 pt-3 border-t border-slate-100">
                                            <button
                                                onClick={() => handleEdit(exam)}
                                                className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(exam.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Icons.Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">
                                {editingExam ? 'Editar Exame' : 'Novo Exame'}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <Icons.X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Nome do Exame *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Audiometria"
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Código *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        placeholder="AUDIO"
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Descrição
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Descrição detalhada do exame..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Duração (minutos) *
                                    </label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="120"
                                        value={formData.duration_minutes}
                                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Categoria *
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Clínico">Clínico</option>
                                        <option value="Complementar">Complementar</option>
                                        <option value="Laboratorial">Laboratorial</option>
                                        <option value="Imagem">Imagem</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="requiresFasting"
                                    checked={formData.requires_fasting}
                                    onChange={(e) => setFormData({ ...formData, requires_fasting: e.target.checked })}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                                />
                                <label htmlFor="requiresFasting" className="text-sm font-medium text-amber-900 cursor-pointer">
                                    Este exame requer jejum
                                </label>
                            </div>

                            {formData.requires_fasting && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Instruções de Preparo
                                    </label>
                                    <textarea
                                        value={formData.preparation_instructions}
                                        onChange={(e) => setFormData({ ...formData, preparation_instructions: e.target.value })}
                                        placeholder="Ex: Jejum de 8 horas. Pode beber água."
                                        rows={2}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!formData.name || !formData.code || !formData.category}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                {editingExam ? 'Salvar Alterações' : 'Cadastrar Exame'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
