import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { EventCard } from './components/EventCard';
import { CreateModal } from './components/CreateModal';
import { BookingModal } from './components/BookingModal';
import { SingleUseLinks } from './components/SingleUseLinks';
import { MeetingPolls } from './components/MeetingPolls';
import { PublicProfileModal } from './components/PublicProfileModal';
import { ContactsManager } from './components/ContactsManager';
import { AvailabilitySettings } from './components/AvailabilitySettings';
import { IntegrationsManager } from './components/IntegrationsManager';
import { CampaignManager } from './components/CampaignManager';
import { ClinicManager } from './components/ClinicManager';
import { ExamManager } from './components/ExamManager';
import { CompanyManager } from './components/CompanyManager';
import { UserManagement } from './components/UserManagement';
import { MessageTemplateManager } from './components/MessageTemplateManager';
import { NexusIA } from './components/NexusIA';
import { PublicBookingPage } from './components/PublicBookingPage';
import { MyBookingsPage } from './components/MyBookingsPage';
import { OAuthSuccessPage } from './components/OAuthSuccessPage';
import { CalendarView } from './components/CalendarView';
import { AuthPage } from './components/AuthPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Icons } from './components/Icons';
import { EventType, ViewState, UserProfile, Contact } from './types';
import { isSupabaseConfigured } from './services/supabaseClient';
import { getEvents, createEvent, updateEventStatus } from './services/supabaseService';
import { useDebounce } from './hooks/useDebounce';
import { useAuth } from './contexts/AuthContext';

// Mock Initial Data (usado apenas se o Supabase não estiver configurado)
const INITIAL_USER: UserProfile = {
  name: 'Tiago Martins',
  avatarInitials: 'TM',
  landingPageUrl: 'nexus.com/tiago'
};

const DEMO_EVENTS: EventType[] = [
  {
    id: '1',
    title: 'Discovery Call',
    duration: 30,
    location: 'Google Meet',
    type: 'One-on-One',
    active: true,
    color: '#6366f1',
    url: '...',
    description: 'Reunião inicial para entender as necessidades do projeto.'
  },
  {
    id: '2',
    title: 'Consultoria Estratégica',
    duration: 60,
    location: 'Zoom',
    type: 'One-on-One',
    active: true,
    color: '#8b5cf6',
    url: '...',
    description: 'Sessão aprofundada de planejamento.'
  }
];

const App: React.FC = () => {
  const { isAuthenticated, isApproved, loading: authLoading, profile, signOut } = useAuth();

  const [activeView, setActiveView] = useState<ViewState>(ViewState.SCHEDULING);
  const [events, setEvents] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEventForBooking, setSelectedEventForBooking] = useState<EventType | null>(null);
  const [bookingPrefillData, setBookingPrefillData] = useState<{ name: string, email: string } | null>(null);

  const [isPublicProfileOpen, setIsPublicProfileOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [activeTab, setActiveTab] = useState<'Tipos de evento' | 'Links únicos' | 'Votações'>('Tipos de evento');

  // Check if we're on a public booking page - Lazy Initialization
  const [isPublicBooking, setIsPublicBooking] = useState(() => {
    return !!window.location.pathname.match(/^\/book\/([a-zA-Z0-9-]+)$/);
  });
  const [recipientId, setRecipientId] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/book\/([a-zA-Z0-9-]+)$/);
    return match ? match[1] : null;
  });

  // Check if we're on the my-bookings management page - Lazy Initialization
  const [isMyBookingsPage, setIsMyBookingsPage] = useState(() => {
    return !!window.location.pathname.match(/^\/my-bookings\/([a-zA-Z0-9]+)$/);
  });
  const [bookingAccessCode, setBookingAccessCode] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/my-bookings\/([a-zA-Z0-9]+)$/);
    return match ? match[1] : null;
  });

  useEffect(() => {
    const path = window.location.pathname;

    // Check for OAuth success page
    if (path === '/oauth-success') {
      return; // Will be handled by isOAuthSuccess state
    }

    // Check for Gmail connection success
    const urlParams = new URLSearchParams(window.location.search);
    const gmailConnected = urlParams.get('gmail_connected');
    const connectedEmail = urlParams.get('email');
    if (gmailConnected === 'true' && connectedEmail) {
      import('sonner').then(({ toast }) => {
        toast.success(`Gmail conectado: ${connectedEmail}`);
      });
      // Clean URL
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Define fetchEvents before useEffect
  const fetchEvents = async () => {
    setIsLoading(true);

    if (!isSupabaseConfigured()) {
      setEvents(DEMO_EVENTS);
      setIsLoading(false);
      return;
    }

    try {
      const data = await getEvents();
      setEvents(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('Erro ao buscar eventos:', errorMessage);
      setError('Não foi possível carregar seus eventos.');
      setEvents(DEMO_EVENTS);
    } finally {
      setIsLoading(false);
    }
  };

  // Load events on mount - this hook must be before any conditional returns
  useEffect(() => {
    if (isAuthenticated && isApproved) {
      fetchEvents();
    }
  }, [isAuthenticated, isApproved]);

  // Memoized filtered events
  const filteredEvents = useMemo(() => {
    return events.filter(e =>
      e.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [events, debouncedSearchQuery]);

  // OAuth Success Page - render without auth
  if (window.location.pathname === '/oauth-success') {
    return <OAuthSuccessPage />;
  }

  // PUBLIC BOOKING MANAGEMENT - Don't require auth
  if (isMyBookingsPage && bookingAccessCode) {
    return <MyBookingsPage accessCode={bookingAccessCode} />;
  }

  // PUBLIC BOOKING PAGES - Don't require auth (this is okay to keep)
  if (isPublicBooking && recipientId) {
    return <PublicBookingPage recipientId={recipientId} />;
  }

  const handleAddEvent = async (newEvent: EventType) => {
    const previousEvents = [...events];
    setEvents([newEvent, ...events]);

    if (!isSupabaseConfigured()) return;

    try {
      await createEvent(newEvent);
    } catch (err) {
      console.error('Erro ao salvar evento:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar no banco de dados.';
      // Show error toast
      if (typeof window !== 'undefined') {
        const { toast } = await import('sonner');
        toast.error(errorMessage);
      }
      setEvents(previousEvents);
    }
  };

  const handleToggleEvent = async (id: string, newActiveStatus: boolean) => {
    const previousEvents = [...events];
    setEvents(events.map(ev => ev.id === id ? { ...ev, active: newActiveStatus } : ev));

    if (!isSupabaseConfigured()) return;

    try {
      await updateEventStatus(id, newActiveStatus);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setEvents(previousEvents);
      // Show error toast
      if (typeof window !== 'undefined') {
        const { toast } = await import('sonner');
        toast.error('Falha ao atualizar status.');
      }
    }
  };

  // INTEGRAÇÃO CIRCULAR: CRM -> Agendamento
  const handleSimulateBooking = (event: EventType, contact: Contact) => {
    setBookingPrefillData({
      name: contact.name,
      email: contact.email
    });
    setSelectedEventForBooking(event);
  };


  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        onOpenCreate={() => setIsCreateModalOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        <Header
          onOpenCreate={() => setIsCreateModalOpen(true)}
          onOpenProfile={() => setIsPublicProfileOpen(true)}
          onNavigate={setActiveView}
        />

        <main className="flex-1 p-8 pt-6 overflow-y-auto scroll-smooth">
          {/* Aviso de Configuração (Só aparece se não configurado) */}
          {!isSupabaseConfigured() && activeView === ViewState.SCHEDULING && (
            <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3">
              <Icons.Zap className="mt-1 flex-shrink-0" size={20} />
              <div>
                <h3 className="font-bold">Modo Demonstração</h3>
                <p className="text-sm mt-1">
                  Para salvar seus dados permanentemente, configure suas chaves do Supabase no arquivo <code>services/supabaseClient.ts</code>.
                </p>
              </div>
            </div>
          )}

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{activeView}</h1>
              <p className="text-slate-500 mt-1">
                {activeView === ViewState.SCHEDULING ? 'Gerencie como as pessoas agendam com você.' :
                  activeView === ViewState.MEETINGS ? 'Visualize e gerencie seus próximos compromissos.' :
                    activeView === ViewState.CONTACTS ? 'Gerencie seus contatos e dispare convites.' :
                      activeView === ViewState.AVAILABILITY ? 'Defina sua disponibilidade para agendamentos.' :
                        'Painel de controle e configurações.'}
              </p>
            </div>

            {activeView === ViewState.SCHEDULING && (
              <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                {['Tipos de evento', 'Links únicos', 'Votações'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${activeTab === tab
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scheduling Content */}
          {activeView === ViewState.SCHEDULING && (
            <>
              {/* Filters & Search for Event Types */}
              {activeTab === 'Tipos de evento' && (
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                  <div className="relative w-full md:w-96 group">
                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                      type="text"
                      placeholder="Filtrar seus eventos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm shadow-sm transition-all"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsPublicProfileOpen(true)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <Icons.Link size={16} />
                      Meu Link
                    </button>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              )}

              {/* MAIN CONTENT SWITCHER */}
              {!isLoading && (
                <>
                  {activeTab === 'Tipos de evento' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group min-h-[240px]"
                      >
                        <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-white flex items-center justify-center group-hover:shadow-md transition-all">
                          <Icons.Plus size={24} />
                        </div>
                        <span className="font-semibold">Criar novo evento</span>
                      </button>

                      {filteredEvents.map(event => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onToggle={handleToggleEvent}
                          onOpenBooking={(evt) => {
                            setBookingPrefillData(null); // Reset prefill for manual open
                            setSelectedEventForBooking(evt);
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {activeTab === 'Links únicos' && (
                    <SingleUseLinks events={events.filter(e => e.active)} />
                  )}

                  {activeTab === 'Votações' && (
                    <MeetingPolls />
                  )}
                </>
              )}
            </>
          )}

          {/* Calendar View */}
          {activeView === ViewState.CALENDAR && (
            <div className="-mx-8 -mt-6 -mb-8 h-[calc(100vh-80px)]">
              <CalendarView events={events} />
            </div>
          )}

          {/* Contacts View */}
          {activeView === ViewState.CONTACTS && (
            <ContactsManager
              events={events}
              onSimulateBooking={handleSimulateBooking}
            />
          )}

          {/* Availability View */}
          {activeView === ViewState.AVAILABILITY && (
            <AvailabilitySettings />
          )}

          {/* Integrations View */}
          {activeView === ViewState.INTEGRATIONS && (
            <IntegrationsManager />
          )}

          {/* Campaigns View */}
          {activeView === ViewState.CAMPAIGNS && (
            <CampaignManager />
          )}

          {/* Templates View */}
          {activeView === ViewState.TEMPLATES && (
            <MessageTemplateManager />
          )}

          {/* Clinics View */}
          {activeView === ViewState.CLINICS && (
            <ClinicManager />
          )}

          {/* Exams View */}
          {activeView === ViewState.EXAMS && (
            <ExamManager />
          )}

          {/* Companies View */}
          {activeView === ViewState.COMPANIES && (
            <CompanyManager />
          )}

          {/* Users Management View */}
          {activeView === ViewState.USERS && (
            <UserManagement />
          )}

          {/* Nexus IA View */}
          {activeView === ViewState.NEXUS_IA && (
            <NexusIA />
          )}

          {/* Other Views Placeholder */}
          {activeView !== ViewState.SCHEDULING &&
            activeView !== ViewState.MEETINGS &&
            activeView !== ViewState.CONTACTS &&
            activeView !== ViewState.AVAILABILITY &&
            activeView !== ViewState.INTEGRATIONS &&
            activeView !== ViewState.CAMPAIGNS &&
            activeView !== ViewState.TEMPLATES &&
            activeView !== ViewState.CLINICS &&
            activeView !== ViewState.EXAMS &&
            activeView !== ViewState.COMPANIES &&
            activeView !== ViewState.USERS &&
            activeView !== ViewState.CALENDAR && (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 rotate-3">
                  <Icons.Zap size={40} className="text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2">Módulo: {activeView}</h3>
                <p className="text-slate-500 max-w-md">
                  Esta é uma demonstração do layout. Em um aplicativo real, aqui estariam as configurações avançadas e análises.
                </p>
                <button className="mt-8 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors">
                  Saber mais
                </button>
              </div>
            )}
        </main>
      </div>

      {/* Floating AI Chat Bubble */}
      <div className="fixed bottom-8 right-8 z-40 group">
        <div className="absolute bottom-full right-0 mb-2 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Nexus AI
          <div className="absolute -bottom-1 right-4 w-2 h-2 bg-slate-800 rotate-45"></div>
        </div>
        <button className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl shadow-lg shadow-indigo-900/30 flex items-center justify-center transition-all hover:scale-110 hover:rotate-3 active:scale-95">
          <Icons.Sparkles size={24} fill="white" />
        </button>
      </div>

      <CreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAddEvent={handleAddEvent}
      />

      {/* Public Booking Simulator */}
      <BookingModal
        event={selectedEventForBooking}
        onClose={() => {
          setSelectedEventForBooking(null);
          setBookingPrefillData(null);
        }}
        prefillData={bookingPrefillData}
      />

      {/* Public Profile Preview */}
      <PublicProfileModal
        isOpen={isPublicProfileOpen}
        onClose={() => setIsPublicProfileOpen(false)}
        user={INITIAL_USER}
        events={events.filter(e => e.active)}
      />
    </div>
  );
};

export default App;