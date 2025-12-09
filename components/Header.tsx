import React from 'react';
import { UserProfile } from '../types';
import { Icons } from './Icons';

interface HeaderProps {
  user: UserProfile;
  onOpenCreate: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onOpenCreate }) => {
  return (
    <header className="h-20 w-full flex items-center justify-between px-8 sticky top-0 z-10 bg-slate-50/80 backdrop-blur-md border-b border-slate-200/60">
        {/* Breadcrumb or Welcome Message */}
        <div className="hidden md:block">
            <h2 className="text-slate-800 font-semibold text-lg">Bom dia, {user.name.split(' ')[0]} 👋</h2>
            <p className="text-slate-500 text-sm">Gerencie seus eventos e disponibilidade.</p>
        </div>

        <div className="flex items-center gap-6 ml-auto">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm cursor-pointer hover:border-indigo-300 transition-colors">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs font-semibold text-slate-600">Online</span>
             </div>

             <div className="h-8 w-[1px] bg-slate-200"></div>

             <button className="flex items-center gap-3 group">
                 <div className="text-right hidden sm:block">
                     <div className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{user.name}</div>
                     <div className="text-xs text-slate-500">Pro Plan</div>
                 </div>
                 <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-200 to-slate-300 text-slate-600 flex items-center justify-center font-bold text-sm border-2 border-white shadow-md group-hover:shadow-lg transition-all">
                    {user.avatarInitials}
                 </div>
                 <Icons.ChevronDown size={16} className="text-slate-400 group-hover:text-indigo-600" />
             </button>
        </div>
    </header>
  );
};