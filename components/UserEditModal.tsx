import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { UserProfile } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface UserEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserProfile | null;
    onSave: () => void;
}

interface Company {
    id: string;
    name: string;
}

const ROLES = [
    { value: 'super_admin', label: '👑 Super Admin', description: 'Acesso total ao sistema' },
    { value: 'org_admin', label: '🏢 Admin Org', description: 'Gerencia empresa e usuários' },
    { value: 'manager', label: '👔 Gestor', description: 'Cria e edita campanhas' },
    { value: 'user', label: '👤 Usuário', description: 'Visualiza e agenda' },
    { value: 'viewer', label: '👁️ Visualizador', description: 'Apenas leitura' },
];

export const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, onClose, user, onSave }) => {
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('user');
    const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
    const [isActive, setIsActive] = useState(true);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingCompanies, setLoadingCompanies] = useState(true);

    useEffect(() => {
        if (user) {
            setFullName(user.full_name || '');
            setPhone(user.phone || '');
            setRole(user.role);
            setIsActive(user.is_active);
            // For now, handle single company - will expand to multiple
            setSelectedCompanies(user.company_id ? [user.company_id] : []);
        }
    }, [user]);

    useEffect(() => {
        loadCompanies();
    }, []);

    const loadCompanies = async () => {
        if (!isSupabaseConfigured()) return;

        setLoadingCompanies(true);
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('id, name')
                .order('name');

            if (error) throw error;
            setCompanies(data || []);
        } catch (err) {
            console.error('Error loading companies:', err);
        } finally {
            setLoadingCompanies(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const updateData: Record<string, unknown> = {
                full_name: fullName,
                phone: phone,
                role: role,
                is_active: isActive,
                // For now, use first selected company - will expand to junction table for multiple
                company_id: selectedCompanies[0] || null,
            };

            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', user.id);

            if (error) throw error;

            toast.success('Usuário atualizado com sucesso!');
            onSave();
            onClose();
        } catch (err) {
            console.error('Error updating user:', err);
            toast.error('Erro ao atualizar usuário');
        } finally {
            setLoading(false);
        }
    };

    const toggleCompany = (companyId: string) => {
        setSelectedCompanies(prev =>
            prev.includes(companyId)
                ? prev.filter(id => id !== companyId)
                : [...prev, companyId]
        );
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xl">
                                {fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || user.email[0].toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Editar Usuário</h2>
                                <p className="text-white/80 text-sm">{user.email}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <Icons.X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                    {/* Full Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Nome do usuário"
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="(00) 00000-0000"
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    {/* Role */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Papel no Sistema</label>
                        <div className="space-y-2">
                            {ROLES.map((r) => (
                                <label
                                    key={r.value}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${role === r.value
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="role"
                                        value={r.value}
                                        checked={role === r.value}
                                        onChange={() => setRole(r.value)}
                                        className="sr-only"
                                    />
                                    <span className="text-lg">{r.label.split(' ')[0]}</span>
                                    <div className="flex-1">
                                        <div className="font-medium text-slate-800">{r.label.substring(3)}</div>
                                        <div className="text-xs text-slate-500">{r.description}</div>
                                    </div>
                                    {role === r.value && (
                                        <Icons.Check className="w-5 h-5 text-indigo-600" />
                                    )}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Company Assignment */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Empresas <span className="text-slate-400">(pode selecionar múltiplas)</span>
                        </label>
                        {loadingCompanies ? (
                            <div className="p-4 text-center text-slate-500">Carregando empresas...</div>
                        ) : companies.length === 0 ? (
                            <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl">
                                Nenhuma empresa cadastrada
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2">
                                {companies.map((company) => (
                                    <label
                                        key={company.id}
                                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${selectedCompanies.includes(company.id)
                                                ? 'bg-indigo-50 border border-indigo-200'
                                                : 'hover:bg-slate-50'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCompanies.includes(company.id)}
                                            onChange={() => toggleCompany(company.id)}
                                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                        />
                                        <Icons.Building className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm font-medium text-slate-700">{company.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                            <div className="font-medium text-slate-800">Status da Conta</div>
                            <div className="text-sm text-slate-500">
                                {isActive ? 'Usuário pode acessar o sistema' : 'Acesso bloqueado'}
                            </div>
                        </div>
                        <button
                            onClick={() => setIsActive(!isActive)}
                            className={`relative w-14 h-7 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-slate-300'
                                }`}
                        >
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-8' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-slate-700 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Icons.Check className="w-4 h-4" />
                                Salvar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserEditModal;
