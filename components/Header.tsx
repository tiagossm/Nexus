import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onOpenCreate?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCreate }) => {
  const { profile, signOut, isSuperAdmin } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userName = profile?.full_name || profile?.email?.split('@')[0] || 'Usuário';
  const userInitials = userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const greeting = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  const getRoleBadge = () => {
    if (!profile) return null;
    const roleConfig: Record<string, { label: string; color: string }> = {
      super_admin: { label: 'Super Admin', color: 'bg-red-100 text-red-700' },
      org_admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700' },
      manager: { label: 'Gestor', color: 'bg-blue-100 text-blue-700' },
      user: { label: 'Usuário', color: 'bg-green-100 text-green-700' },
      viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-700' },
    };
    const config = roleConfig[profile.role] || roleConfig.user;
    return <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>{config.label}</span>;
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <header className="h-20 w-full flex items-center justify-between px-8 sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/60">
      {/* Welcome Message */}
      <div className="hidden md:block">
        <h2 className="text-slate-800 font-semibold text-lg">{greeting}, {userName.split(' ')[0]} 👋</h2>
        <p className="text-slate-500 text-sm">Gerencie seus eventos e disponibilidade.</p>
      </div>

      <div className="flex items-center gap-6 ml-auto">
        {/* Online Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-semibold text-slate-600">Online</span>
        </div>

        <div className="h-8 w-[1px] bg-slate-200"></div>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 group"
          >
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{userName}</div>
              <div className="text-xs text-slate-500">{getRoleBadge()}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm border-2 border-white shadow-md group-hover:shadow-lg transition-all">
              {userInitials}
            </div>
            <Icons.ChevronDown size={16} className={`text-slate-400 group-hover:text-indigo-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              {/* User Info */}
              <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold">
                    {userInitials}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{userName}</div>
                    <div className="text-xs text-slate-500">{profile?.email}</div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <button className="w-full px-4 py-2.5 flex items-center gap-3 text-slate-700 hover:bg-slate-50 transition-colors text-left">
                  <Icons.User className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">Meu Perfil</span>
                </button>
                <button className="w-full px-4 py-2.5 flex items-center gap-3 text-slate-700 hover:bg-slate-50 transition-colors text-left">
                  <Icons.Settings className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">Configurações</span>
                </button>
                {isSuperAdmin && (
                  <button className="w-full px-4 py-2.5 flex items-center gap-3 text-slate-700 hover:bg-slate-50 transition-colors text-left">
                    <Icons.Shield className="w-4 h-4 text-slate-400" />
                    <span className="text-sm">Painel Admin</span>
                  </button>
                )}
              </div>

              {/* Logout */}
              <div className="border-t border-slate-100 py-2">
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <Icons.LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Sair</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};