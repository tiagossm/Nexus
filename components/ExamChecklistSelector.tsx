import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Exam, examService } from '../services/examService';

interface ExamChecklistSelectorProps {
    selectedExamIds: string[];
    onSelectionChange: (examIds: string[]) => void;
    highlightedExamIds?: string[];
}

export const ExamChecklistSelector: React.FC<ExamChecklistSelectorProps> = ({
    selectedExamIds,
    onSelectionChange,
    highlightedExamIds
}) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [examsData, categoriesData] = await Promise.all([
                examService.getExams(),
                examService.getCategories()
            ]);
            setExams(examsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Erro ao carregar exames:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredExams = exams.filter(exam => {
        const matchesSearch =
            exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exam.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (exam.description && exam.description.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory = selectedCategory === 'all' || exam.category === selectedCategory;

        return matchesSearch && matchesCategory;
    }).sort((a, b) => {
        // Sort highlighted exams first if prop is present
        if (highlightedExamIds) {
            const aHighlighted = highlightedExamIds.includes(a.id);
            const bHighlighted = highlightedExamIds.includes(b.id);
            if (aHighlighted && !bHighlighted) return -1;
            if (!aHighlighted && bHighlighted) return 1;
        }
        return 0;
    });

    const toggleExam = (examId: string) => {
        if (selectedExamIds.includes(examId)) {
            onSelectionChange(selectedExamIds.filter(id => id !== examId));
        } else {
            onSelectionChange([...selectedExamIds, examId]);
        }
    };

    const toggleAll = () => {
        if (selectedExamIds.length === filteredExams.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(filteredExams.map(e => e.id));
        }
    };

    const getTotalDuration = () => {
        const selectedExams = exams.filter(e => selectedExamIds.includes(e.id));
        return selectedExams.reduce((total, exam) => total + exam.duration_minutes, 0);
    };

    const groupedExams = filteredExams.reduce((acc, exam) => {
        const category = exam.category || 'Outros';
        if (!acc[category]) acc[category] = [];
        acc[category].push(exam);
        return acc;
    }, {} as Record<string, Exam[]>);

    return (
        <div className="space-y-4">
            {/* Header with search and filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar exames por nome ou código..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                </div>

                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                    <option value="all">Todas Categorias</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Selection Summary */}
            {selectedExamIds.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-700 font-medium">
                                <Icons.Check size={20} />
                                <span>{selectedExamIds.length} exame{selectedExamIds.length > 1 ? 's' : ''} selecionado{selectedExamIds.length > 1 ? 's' : ''}</span>
                            </div>
                            <div className="text-sm text-indigo-600 mt-1">
                                Duração total estimada: {getTotalDuration()} minutos
                            </div>
                        </div>
                        <button
                            onClick={() => onSelectionChange([])}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            Limpar Seleção
                        </button>
                    </div>
                </div>
            )}

            {/* Exam List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Icons.Loader2 size={32} className="text-indigo-600 animate-spin" />
                </div>
            ) : filteredExams.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-12 text-center">
                    <Icons.FileText size={48} className="text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                        Nenhum exame encontrado
                    </h3>
                    <p className="text-slate-600">
                        {searchTerm ? 'Tente buscar com outros termos' : 'Nenhum exame cadastrado'}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Select All */}
                    <div className="flex items-center justify-between py-3 border-b border-slate-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selectedExamIds.length === filteredExams.length && filteredExams.length > 0}
                                onChange={toggleAll}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="font-medium text-slate-700">
                                Selecionar Todos ({filteredExams.length})
                            </span>
                        </label>
                    </div>

                    {/* Grouped by Category */}
                    {Object.entries(groupedExams).map(([category, categoryExams]) => (
                        <div key={category}>
                            <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <div className="w-1 h-5 bg-indigo-600 rounded-full"></div>
                                {category}
                            </h4>

                            <div className="space-y-2">
                                {categoryExams.map((exam) => (
                                    <label
                                        key={exam.id}
                                        className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all ${selectedExamIds.includes(exam.id)
                                            ? 'bg-indigo-50 border-2 border-indigo-200'
                                            : 'bg-white border-2 border-slate-200 hover:border-indigo-200'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedExamIds.includes(exam.id)}
                                            onChange={() => toggleExam(exam.id)}
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 mt-0.5"
                                        />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-slate-900">{exam.name}</span>
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                                                    {exam.code}
                                                </span>
                                                {highlightedExamIds && highlightedExamIds.includes(exam.id) && (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                                                        <Icons.Check size={10} />
                                                        Disponível
                                                    </span>
                                                )}
                                            </div>

                                            {exam.description && (
                                                <p className="text-sm text-slate-600 mb-2">{exam.description}</p>
                                            )}

                                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                <div className="flex items-center gap-1">
                                                    <Icons.Clock size={12} />
                                                    <span>{exam.duration_minutes} min</span>
                                                </div>

                                                {exam.requires_fasting && (
                                                    <div className="flex items-center gap-1 text-orange-600">
                                                        <Icons.AlertTriangle size={12} />
                                                        <span>Requer jejum</span>
                                                    </div>
                                                )}

                                                {exam.preparation_instructions && (
                                                    <div className="flex items-center gap-1 text-indigo-600">
                                                        <Icons.Info size={12} />
                                                        <span>Com preparo</span>
                                                    </div>
                                                )}
                                            </div>

                                            {exam.preparation_instructions && selectedExamIds.includes(exam.id) && (
                                                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                                                    <strong>Preparo:</strong> {exam.preparation_instructions}
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
