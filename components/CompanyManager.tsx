import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { Company } from '../types';
import * as companyService from '../services/companyService';
import { lookupCNPJ, formatCNPJ, cleanCNPJ, isValidCNPJ } from '../services/cnpjService';
import { toast } from 'sonner';

interface CompanyManagerProps {
    onSelect?: (company: Company) => void;
    selectedCompanyId?: string;
}

export const CompanyManager: React.FC<CompanyManagerProps> = ({ onSelect, selectedCompanyId }) => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [lookingUp, setLookingUp] = useState(false);

    // Form state
    const [cnpj, setCnpj] = useState('');
    const [name, setName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#4F46E5');
    const [footerText, setFooterText] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');

    useEffect(() => {
        loadCompanies();
    }, []);

    const loadCompanies = async () => {
        try {
            setLoading(true);
            const data = await companyService.listCompanies();
            setCompanies(data);
        } catch (error) {
            console.error('Error loading companies:', error);
            toast.error('Erro ao carregar empresas');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setCnpj('');
        setName('');
        setLogoUrl('');
        setPrimaryColor('#4F46E5');
        setFooterText('');
        setContactEmail('');
        setContactPhone('');
        setWebsiteUrl('');
        setEditingCompany(null);
        setShowForm(false);
    };

    const handleCnpjChange = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 14);
        setCnpj(formatCNPJ(digits));
    };

    const handleCnpjLookup = async () => {
        const cleaned = cleanCNPJ(cnpj);
        if (!isValidCNPJ(cleaned)) {
            toast.error('CNPJ inválido. Verifique os dígitos.');
            return;
        }

        try {
            setLookingUp(true);
            const data = await lookupCNPJ(cleaned);

            if (data) {
                setName(data.name);
                if (data.email) setContactEmail(data.email);
                if (data.phone) setContactPhone(data.phone);

                toast.success(`Empresa encontrada: ${data.name}`);

                if (data.status !== 'ATIVA') {
                    toast.warning(`Atenção: Situação cadastral: ${data.status}`);
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao consultar CNPJ';
            toast.error(message);
        } finally {
            setLookingUp(false);
        }
    };

    const handleEdit = (company: Company) => {
        setEditingCompany(company);
        setCnpj((company as any).cnpj || '');
        setName(company.name);
        setLogoUrl(company.logo_url || '');
        setPrimaryColor(company.primary_color);
        setFooterText(company.footer_text || '');
        setContactEmail(company.contact_email || '');
        setContactPhone(company.contact_phone || '');
        setWebsiteUrl(company.website_url || '');
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Nome da empresa é obrigatório');
            return;
        }

        try {
            const companyData = {
                cnpj: cleanCNPJ(cnpj) || undefined,
                name: name.trim(),
                logo_url: logoUrl.trim() || undefined,
                primary_color: primaryColor,
                footer_text: footerText.trim() || undefined,
                contact_email: contactEmail.trim() || undefined,
                contact_phone: contactPhone.trim() || undefined,
                website_url: websiteUrl.trim() || undefined,
                is_active: true
            };

            if (editingCompany) {
                await companyService.updateCompany(editingCompany.id, companyData);
                toast.success('Empresa atualizada com sucesso!');
            } else {
                await companyService.createCompany(companyData as any);
                toast.success('Empresa criada com sucesso!');
            }

            resetForm();
            loadCompanies();
        } catch (error) {
            console.error('Error saving company:', error);
            toast.error('Erro ao salvar empresa');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta empresa?')) return;

        try {
            await companyService.deleteCompany(id);
            toast.success('Empresa excluída com sucesso!');
            loadCompanies();
        } catch (error) {
            console.error('Error deleting company:', error);
            toast.error('Erro ao excluir empresa');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Icons.Loader2 className="animate-spin text-indigo-600" size={24} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Empresas</h3>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                    >
                        <Icons.Plus size={16} />
                        Nova Empresa
                    </button>
                )}
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                    <h4 className="font-semibold text-slate-900">
                        {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                        {/* CNPJ Lookup */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                CNPJ <span className="text-slate-400 font-normal">(opcional - preenche dados automaticamente)</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={cnpj}
                                    onChange={(e) => handleCnpjChange(e.target.value)}
                                    placeholder="00.000.000/0000-00"
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                                    maxLength={18}
                                />
                                <button
                                    type="button"
                                    onClick={handleCnpjLookup}
                                    disabled={lookingUp || cleanCNPJ(cnpj).length !== 14}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                >
                                    {lookingUp ? (
                                        <Icons.Loader2 className="animate-spin" size={16} />
                                    ) : (
                                        <Icons.Search size={16} />
                                    )}
                                    Buscar
                                </button>
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: TRIVIA Consultoria"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cor Primária</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="w-10 h-10 rounded cursor-pointer border-0"
                                />
                                <input
                                    type="text"
                                    value={primaryColor}
                                    onChange={(e) => setPrimaryColor(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">URL do Logo</label>
                            <input
                                type="text"
                                value={logoUrl}
                                onChange={(e) => setLogoUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email de Contato</label>
                            <input
                                type="email"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                placeholder="contato@empresa.com"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                            <input
                                type="text"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                placeholder="(11) 99999-9999"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                            <input
                                type="text"
                                value={websiteUrl}
                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                placeholder="https://www.empresa.com"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Rodapé do Email</label>
                            <textarea
                                value={footerText}
                                onChange={(e) => setFooterText(e.target.value)}
                                placeholder="Texto que aparecerá no rodapé dos emails..."
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="text-xs text-slate-500 px-3 py-1 bg-slate-100">Preview do Email</div>
                        <div className="p-4" style={{ backgroundColor: primaryColor }}>
                            <div className="flex items-center gap-3">
                                {logoUrl && (
                                    <img src={logoUrl} alt="Logo" className="h-8 w-auto object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                                )}
                                <span className="text-white font-semibold">{name || 'Nome da Empresa'}</span>
                            </div>
                        </div>
                        <div className="p-4 bg-white text-sm text-slate-600">
                            Conteúdo do email...
                        </div>
                        <div className="p-3 bg-slate-100 text-xs text-slate-500 text-center">
                            {footerText || `Este email foi enviado por ${name || 'Nome da Empresa'}`}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={resetForm}
                            className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                        >
                            {editingCompany ? 'Salvar Alterações' : 'Criar Empresa'}
                        </button>
                    </div>
                </div>
            )}

            {/* Companies List */}
            <div className="space-y-2">
                {companies.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        Nenhuma empresa cadastrada. Clique em "Nova Empresa" para adicionar.
                    </div>
                ) : (
                    companies.map((company) => (
                        <div
                            key={company.id}
                            className={`flex items-center gap-4 p-4 border rounded-lg transition-all cursor-pointer ${selectedCompanyId === company.id
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-slate-200 hover:border-indigo-300'
                                }`}
                            onClick={() => onSelect?.(company)}
                        >
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: company.primary_color }}
                            >
                                {company.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-slate-900">{company.name}</div>
                                <div className="text-sm text-slate-500">
                                    {(company as any).cnpj && <span>{formatCNPJ((company as any).cnpj)} • </span>}
                                    {company.contact_email || 'Sem email'}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEdit(company); }}
                                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                    title="Editar"
                                >
                                    <Icons.Edit size={16} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(company.id); }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    title="Excluir"
                                >
                                    <Icons.Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
