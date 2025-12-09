import React, { useState, useMemo } from 'react';
import { Icons } from './Icons';
import { MessageChannel } from '../types';
import {
    getAvailableVariables,
    getVariablesByCategory,
    searchVariables,
    VariableDefinition
} from '../utils/TemplateValidator';
import { toast } from 'sonner';

interface VariablePickerProps {
    onInsert: (variable: string) => void;
    channel: MessageChannel;
    compact?: boolean;
}

const CATEGORY_ICONS = {
    contact: Icons.User,
    clinic: Icons.Building,
    exam: Icons.FileText,
    system: Icons.Settings
};

const CATEGORY_LABELS = {
    contact: 'Contato',
    clinic: 'Clínica',
    exam: 'Exame',
    system: 'Sistema'
};

const CATEGORY_COLORS = {
    contact: 'text-blue-600 bg-blue-50',
    clinic: 'text-green-600 bg-green-50',
    exam: 'text-purple-600 bg-purple-50',
    system: 'text-slate-600 bg-slate-50'
};

export const VariablePicker: React.FC<VariablePickerProps> = ({
    onInsert,
    channel,
    compact = false
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(['contact', 'system'])
    );

    const variables = useMemo(() => {
        if (searchTerm.trim()) {
            return searchVariables(searchTerm);
        }
        return getAvailableVariables();
    }, [searchTerm]);

    const variablesByCategory = useMemo(() => {
        const categories: Record<string, VariableDefinition[]> = {
            contact: [],
            clinic: [],
            exam: [],
            system: []
        };

        variables.forEach(variable => {
            categories[variable.category].push(variable);
        });

        return categories;
    }, [variables]);

    const toggleCategory = (category: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    const handleInsertVariable = (variable: VariableDefinition) => {
        const variableText = `{{${variable.key}}}`;
        onInsert(variableText);
        toast.success(`Variável ${variable.label} inserida!`);
    };

    const handleCopyVariable = (variable: VariableDefinition, e: React.MouseEvent) => {
        e.stopPropagation();
        const variableText = `{{${variable.key}}}`;
        navigator.clipboard.writeText(variableText);
        toast.success('Variável copiada para área de transferência!');
    };

    if (compact) {
        return (
            <div className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Icons.Code size={14} />
                    Variáveis Disponíveis
                </div>
                <div className="flex flex-wrap gap-1">
                    {variables.slice(0, 8).map(variable => (
                        <button
                            key={variable.key}
                            onClick={() => handleInsertVariable(variable)}
                            className="px-2 py-1 bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 rounded text-xs font-mono transition-all"
                            title={variable.description}
                        >
                            {`{{${variable.key}}}`}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 mb-3">
                    <Icons.Code size={18} className="text-indigo-600" />
                    <h3 className="font-bold text-slate-900">Variáveis</h3>
                </div>

                {/* Search */}
                <div className="relative">
                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar variáveis..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {/* Variables List */}
            <div className="flex-1 overflow-y-auto p-2">
                {searchTerm.trim() ? (
                    // Search Results
                    <div className="space-y-1">
                        {variables.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                <Icons.Search size={32} className="mx-auto mb-2 opacity-50" />
                                Nenhuma variável encontrada
                            </div>
                        ) : (
                            variables.map(variable => (
                                <VariableItem
                                    key={variable.key}
                                    variable={variable}
                                    onInsert={handleInsertVariable}
                                    onCopy={handleCopyVariable}
                                />
                            ))
                        )}
                    </div>
                ) : (
                    // Categorized View
                    <div className="space-y-2">
                        {(Object.keys(variablesByCategory) as Array<keyof typeof variablesByCategory>).map(category => {
                            const categoryVars = variablesByCategory[category];
                            if (categoryVars.length === 0) return null;

                            const isExpanded = expandedCategories.has(category);
                            const Icon = CATEGORY_ICONS[category];

                            return (
                                <div key={category} className="border border-slate-200 rounded-lg overflow-hidden">
                                    {/* Category Header */}
                                    <button
                                        onClick={() => toggleCategory(category)}
                                        className={`w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${CATEGORY_COLORS[category]}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon size={16} />
                                            <span className="font-semibold text-sm">{CATEGORY_LABELS[category]}</span>
                                            <span className="text-xs opacity-70">({categoryVars.length})</span>
                                        </div>
                                        {isExpanded ? <Icons.ChevronDown size={16} /> : <Icons.ChevronRight size={16} />}
                                    </button>

                                    {/* Category Variables */}
                                    {isExpanded && (
                                        <div className="bg-white divide-y divide-slate-100">
                                            {categoryVars.map(variable => (
                                                <VariableItem
                                                    key={variable.key}
                                                    variable={variable}
                                                    onInsert={handleInsertVariable}
                                                    onCopy={handleCopyVariable}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer Tip */}
            <div className="p-3 border-t border-slate-200 bg-slate-50">
                <div className="flex items-start gap-2 text-xs text-slate-600">
                    <Icons.Info size={14} className="mt-0.5 flex-shrink-0" />
                    <p>
                        Clique para inserir ou use o botão de copiar.
                        {channel === 'email' && ' Variáveis obrigatórias estão marcadas.'}
                    </p>
                </div>
            </div>
        </div>
    );
};

interface VariableItemProps {
    variable: VariableDefinition;
    onInsert: (variable: VariableDefinition) => void;
    onCopy: (variable: VariableDefinition, e: React.MouseEvent) => void;
}

const VariableItem: React.FC<VariableItemProps> = ({ variable, onInsert, onCopy }) => {
    return (
        <div
            onClick={() => onInsert(variable)}
            className="px-3 py-2 hover:bg-indigo-50 cursor-pointer transition-colors group"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs font-mono text-indigo-600 font-semibold">
                            {`{{${variable.key}}}`}
                        </code>
                        {variable.required && (
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">
                                Obrigatória
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-slate-600">{variable.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{variable.description}</div>
                    <div className="text-xs text-slate-400 mt-1 font-mono">
                        Ex: {variable.example}
                    </div>
                </div>
                <button
                    onClick={(e) => onCopy(variable, e)}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-indigo-100 rounded transition-all flex-shrink-0"
                    title="Copiar variável"
                >
                    <Icons.Copy size={14} className="text-indigo-600" />
                </button>
            </div>
        </div>
    );
};
