import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { UserEditModal } from './UserEditModal';

interface UserManagementProps {
  isOpen?: boolean;
}

const ROLE_CONFIG = {
  super_admin: { label: 'Super Admin', color: 'bg-red-100 text-red-800', icon: '👑' },
  org_admin: { label: 'Admin Org', color: 'bg-purple-100 text-purple-800', icon: '🏢' },
  manager: { label: 'Gestor', color: 'bg-blue-100 text-blue-800', icon: '👔' },
  user: { label: 'Usuário', color: 'bg-green-100 text-green-800', icon: '👤' },
  viewer: { label: 'Visualizador', color: 'bg-gray-100 text-gray-800', icon: '👁️' },
};

export const UserManagement: React.FC<UserManagementProps> = () => {
  const { profile: currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!isSupabaseConfigured()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_approved: true,
          approved_by: currentUser?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Usuário aprovado com sucesso!');
      loadUsers();
    } catch (err) {
      console.error('Error approving user:', err);
      toast.error('Erro ao aprovar usuário');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_active: false,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Usuário rejeitado');
      loadUsers();
    } catch (err) {
      console.error('Error rejecting user:', err);
      toast.error('Erro ao rejeitar usuário');
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Papel alterado com sucesso!');
      loadUsers();
    } catch (err) {
      console.error('Error changing role:', err);
      toast.error('Erro ao alterar papel');
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) throw error;

      toast.success(isActive ? 'Usuário ativado' : 'Usuário desativado');
      loadUsers();
    } catch (err) {
      console.error('Error toggling user:', err);
      toast.error('Erro ao alterar status');
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'pending' && !user.is_approved) ||
      (filter === 'approved' && user.is_approved);

    const matchesSearch =
      !search ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const pendingCount = users.filter(u => !u.is_approved && u.is_active).length;

  if (!isSuperAdmin) {
    return (
      <div className="flex-1 p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <Icons.Lock className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Acesso Restrito</h2>
          <p className="text-red-600">Apenas Super Admins podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 p-8 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gerenciamento de Usuários</h1>
            <p className="text-slate-600 mt-1">Aprovar cadastros e gerenciar permissões</p>
          </div>

          {pendingCount > 0 && (
            <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-full flex items-center gap-2 animate-pulse">
              <Icons.AlertCircle className="w-5 h-5" />
              <span className="font-medium">{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou email..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                Todos ({users.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'pending'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                Pendentes ({pendingCount})
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
              >
                Aprovados ({users.filter(u => u.is_approved).length})
              </button>
            </div>

            <button
              onClick={loadUsers}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              title="Atualizar"
            >
              <Icons.RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-slate-500 mt-4">Carregando usuários...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Icons.Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Usuário</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Papel</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">Cadastro</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={`hover:bg-slate-50 transition-all ${!user.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{user.full_name || 'Sem nome'}</div>
                          <div className="text-sm text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.id === currentUser?.id ? (
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${ROLE_CONFIG[user.role].color}`}>
                          {ROLE_CONFIG[user.role].icon} {ROLE_CONFIG[user.role].label}
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeRole(user.id, e.target.value)}
                          className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        >
                          <option value="super_admin">👑 Super Admin</option>
                          <option value="org_admin">🏢 Admin Org</option>
                          <option value="manager">👔 Gestor</option>
                          <option value="user">👤 Usuário</option>
                          <option value="viewer">👁️ Visualizador</option>
                        </select>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {!user.is_active ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          ❌ Desativado
                        </span>
                      ) : !user.is_approved ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                          ⏳ Pendente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          ✅ Aprovado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(user.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setIsEditModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-all flex items-center gap-1"
                          title="Editar usuário"
                        >
                          <Icons.Edit className="w-4 h-4" />
                          Editar
                        </button>
                        {!user.is_approved && user.is_active && (
                          <>
                            <button
                              onClick={() => handleApprove(user.id)}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all flex items-center gap-1"
                            >
                              <Icons.Check className="w-4 h-4" />
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleReject(user.id)}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all flex items-center gap-1"
                            >
                              <Icons.X className="w-4 h-4" />
                              Rejeitar
                            </button>
                          </>
                        )}
                        {user.id !== currentUser?.id && user.is_approved && (
                          <button
                            onClick={() => handleToggleActive(user.id, !user.is_active)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${user.is_active
                              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                          >
                            {user.is_active ? 'Desativar' : 'Ativar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div >

      {/* Edit Modal */}
      < UserEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onSave={loadUsers}
      />
    </>
  );
};

export default UserManagement;
