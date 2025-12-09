import React from 'react';
import { ViewState } from '../types';
import { Icons } from './Icons';

interface SidebarProps {
  activeView: ViewState;
  setActiveView: (view: ViewState) => void;
  onOpenCreate: () => void;
}

const NavItem: React.FC<{
  view: ViewState;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}> = ({ view, icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${active
      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
  >
    <span className={`${active ? 'text-white' : 'text-slate-500 group-hover:text-white'} transition-colors`}>
      {icon}
    </span>
    {view}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, onOpenCreate }) => {
  return (
    <div className="w-[280px] h-screen bg-slate-900 flex flex-col sticky top-0 flex-shrink-0 shadow-2xl z-20">
      {/* Logo */}
      <div className="p-8 flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          <Icons.Command size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Nexus</h1>
          <p className="text-xs text-slate-500 font-medium">Smart Scheduling</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 space-y-1 pb-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-4 mb-2 mt-2">Menu Principal</div>

        <NavItem
          view={ViewState.SCHEDULING}
          icon={<Icons.LayoutDashboard size={18} />}
          active={activeView === ViewState.SCHEDULING}
          onClick={() => setActiveView(ViewState.SCHEDULING)}
        />
        <NavItem
          view={ViewState.CALENDAR}
          icon={<Icons.CalendarDays size={18} />}
          active={activeView === ViewState.CALENDAR}
          onClick={() => setActiveView(ViewState.CALENDAR)}
        />
        <NavItem
          view={ViewState.AVAILABILITY}
          icon={<Icons.Clock size={18} />}
          active={activeView === ViewState.AVAILABILITY}
          onClick={() => setActiveView(ViewState.AVAILABILITY)}
        />
        <NavItem
          view={ViewState.CONTACTS}
          icon={<Icons.Users size={18} />}
          active={activeView === ViewState.CONTACTS}
          onClick={() => setActiveView(ViewState.CONTACTS)}
        />
        <NavItem
          view={ViewState.CAMPAIGNS}
          icon={<Icons.Send size={18} />}
          active={activeView === ViewState.CAMPAIGNS}
          onClick={() => setActiveView(ViewState.CAMPAIGNS)}
        />
        <NavItem
          view={ViewState.TEMPLATES}
          icon={<Icons.FileText size={18} />}
          active={activeView === ViewState.TEMPLATES}
          onClick={() => setActiveView(ViewState.TEMPLATES)}
        />

        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-4 mb-2 mt-8">Gestão</div>

        <NavItem
          view={ViewState.CLINICS}
          icon={<Icons.MapPin size={18} />}
          active={activeView === ViewState.CLINICS}
          onClick={() => setActiveView(ViewState.CLINICS)}
        />
        <NavItem
          view={ViewState.EXAMS}
          icon={<Icons.FileText size={18} />}
          active={activeView === ViewState.EXAMS}
          onClick={() => setActiveView(ViewState.EXAMS)}
        />
        <NavItem
          view={ViewState.COMPANIES}
          icon={<Icons.Building size={18} />}
          active={activeView === ViewState.COMPANIES}
          onClick={() => setActiveView(ViewState.COMPANIES)}
        />

        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-4 mb-2 mt-8">Automação</div>

        <NavItem
          view={ViewState.WORKFLOWS}
          icon={<Icons.Workflow size={18} />}
          active={activeView === ViewState.WORKFLOWS}
          onClick={() => setActiveView(ViewState.WORKFLOWS)}
        />
        <NavItem
          view={ViewState.ROUTING}
          icon={<Icons.Zap size={18} />}
          active={activeView === ViewState.ROUTING}
          onClick={() => setActiveView(ViewState.ROUTING)}
        />
        <NavItem
          view={ViewState.INTEGRATIONS}
          icon={<Icons.Grid size={18} />}
          active={activeView === ViewState.INTEGRATIONS}
          onClick={() => setActiveView(ViewState.INTEGRATIONS)}
        />
      </div>

      {/* Footer Actions */}
      <div className="p-4 mt-auto border-t border-slate-800">
        <button
          onClick={onOpenCreate}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-bold shadow-lg shadow-indigo-900/50 transition-all transform hover:scale-[1.02] active:scale-95"
        >
          <Icons.Plus size={20} strokeWidth={2.5} />
          Criar Novo
        </button>

        <div className="mt-4 flex items-center justify-between px-2 text-slate-400">
          <button onClick={() => setActiveView(ViewState.ADMIN)} className="hover:text-white transition-colors">
            <Icons.Settings size={20} />
          </button>
          <button onClick={() => setActiveView(ViewState.HELP)} className="hover:text-white transition-colors">
            <Icons.HelpCircle size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};