
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { Contact, EventType } from '../types';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { getContacts, createContact, updateContact, upsertContacts } from '../services/supabaseService';

interface ContactsManagerProps {
  events: EventType[];
  onSimulateBooking?: (event: EventType, contact: Contact) => void;
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({ events, onSimulateBooking }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState<Contact | null>(null);

  // Campaign Success State
  const [campaignSuccess, setCampaignSuccess] = useState<{
    event: EventType;
    contacts: Contact[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // New Contact Form
  const [newContact, setNewContact] = useState<Partial<Contact>>({});
  const [cpfError, setCpfError] = useState<string | null>(null);

  // Campaign State
  const [selectedEventId, setSelectedEventId] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Import State
  const [importTab, setImportTab] = useState<'file' | 'paste'>('file');
  const [csvText, setCsvText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Partial<Contact>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setIsLoading(true);
    if (!isSupabaseConfigured()) {
      // Mock data
      setContacts([
        { id: '1', name: 'Ana Clara', email: 'ana@teste.com', cpf: '123.456.789-00', phone: '11999999999', age: 28, status: 'Pendente', invite_count: 0 },
        { id: '2', name: 'Carlos Silva', email: 'carlos@teste.com', cpf: '321.654.987-00', phone: '21988888888', age: 35, status: 'Agendado', invite_count: 1, last_invite_sent_at: new Date().toISOString() },
        { id: '3', name: 'Roberto Frio', email: 'beto@teste.com', cpf: '000.000.000-00', phone: '21988888888', age: 40, status: 'Convidado', invite_count: 4, last_invite_sent_at: new Date().toISOString() },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await getContacts();
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
    setIsLoading(false);
  };

  // --- CPF UTILS ---
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const validateCPF = (cpf: string) => {
    const clean = cpf.replace(/\D/g, '');

    if (!clean) return true; // Campo opcional vazio é válido
    if (clean.length !== 11) return false;
    if (/^(\d)\1+$/.test(clean)) return false;

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) sum = sum + parseInt(clean.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(clean.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(clean.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(clean.substring(10, 11))) return false;

    return true;
  };
  // -----------------

  // --- IMPORT UTILS ---
  const downloadTemplate = () => {
    const headers = "Nome,Email,CPF,Telefone,Idade";
    const example = "João Silva,joao@exemplo.com,123.456.789-00,11999999999,30";
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + example;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "modelo_contatos_nexus.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r\n|\n/);
    const headers = lines[0].toLowerCase().split(/,|;/).map(h => h.trim().replace(/"/g, ''));

    const parsed: Partial<Contact>[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const currentLine = lines[i].split(/,|;/).map(field => field.trim().replace(/"/g, '')); // Handle simple quotes

      if (currentLine.length < 2) continue; // Skip invalid lines

      const contact: any = { status: 'Pendente', invite_count: 0 };

      headers.forEach((header, index) => {
        const value = currentLine[index];
        if (!value) return;

        if (header.includes('nome')) contact.name = value;
        else if (header.includes('email')) contact.email = value;
        else if (header.includes('cpf')) contact.cpf = formatCPF(value);
        else if (header.includes('telefone') || header.includes('celular')) contact.phone = value;
        else if (header.includes('idade')) contact.age = parseInt(value) || null;
      });

      if (contact.name && contact.email) {
        parsed.push(contact);
      }
    }
    setParsedPreview(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (parsedPreview.length === 0) return;

    setIsLoading(true);

    // Preparing data for Supabase Upsert
    const contactsToUpsert = parsedPreview.map(c => ({
      ...c,
    }));

    if (isSupabaseConfigured()) {
      try {
        await upsertContacts(contactsToUpsert);
        await fetchContacts();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('Error importing contacts:', errorMessage);
        alert('Erro na importação: ' + errorMessage);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Mock import
      const mockNew = parsedPreview.map((c, i) => ({ ...c, id: `import-${Date.now()}-${i}` } as Contact));
      setContacts([...mockNew, ...contacts]);
    }

    setIsLoading(false);
    setShowImportModal(false);
    setParsedPreview([]);
    setCsvText('');
  };
  // --------------------

  const cleanString = (str: string | undefined) => str ? str.replace(/\D/g, '') : '';

  const handlePreAddValidation = () => {
    setCpfError(null);
    if (newContact.cpf && !validateCPF(newContact.cpf)) {
      setCpfError('CPF inválido');
      return;
    }
    if (!newContact.name || !newContact.email) return;

    const existingEmail = contacts.find(c => c.email.toLowerCase() === newContact.email?.toLowerCase());
    const existingCPF = newContact.cpf ? contacts.find(c => cleanString(c.cpf) === cleanString(newContact.cpf)) : null;
    const duplicate = existingEmail || existingCPF;

    if (duplicate) {
      setShowDuplicateAlert(duplicate);
    } else {
      executeAddContact();
    }
  };

  const executeAddContact = async () => {
    const contactToAdd = {
      ...newContact,
      id: crypto.randomUUID(),
      status: 'Pendente',
      invite_count: 0
    } as Contact;

    if (isSupabaseConfigured()) {
      try {
        await createContact({
          name: newContact.name,
          email: newContact.email,
          cpf: newContact.cpf,
          phone: newContact.phone,
          age: newContact.age ? parseInt(newContact.age.toString()) : null,
          invite_count: 0
        });
      } catch (error: any) {
        alert('Erro ao salvar: ' + error.message);
        return;
      }
    }

    setContacts([contactToAdd, ...contacts]);
    setNewContact({});
    setCpfError(null);
    setShowAddModal(false);
  };

  const executeUpdateContact = async () => {
    if (!showDuplicateAlert) return;
    const updated = { ...showDuplicateAlert, ...newContact };
    setContacts(contacts.map(c => c.id === showDuplicateAlert.id ? updated as Contact : c));
    if (isSupabaseConfigured()) {
      await updateContact(showDuplicateAlert.id, {
        name: newContact.name,
        phone: newContact.phone,
        age: newContact.age,
      });
    }
    setShowDuplicateAlert(null);
    setShowAddModal(false);
    setNewContact({});
    setCpfError(null);
  };

  const toggleSelectAll = () => {
    if (selectedContactIds.size === contacts.length) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(contacts.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedContactIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedContactIds(newSet);
  };

  const handleSendCampaign = async () => {
    if (!selectedEventId) return;
    setIsSending(true);

    await new Promise(r => setTimeout(r, 1500));

    // Identify affected contacts for the success screen
    const affectedContacts = contacts.filter(c => selectedContactIds.has(c.id));
    const targetEvent = events.find(e => e.id === selectedEventId);

    const updatedContacts = contacts.map(c => {
      if (selectedContactIds.has(c.id)) {
        return {
          ...c,
          status: 'Convidado',
          last_invite_sent_at: new Date().toISOString(),
          invite_count: (c.invite_count || 0) + 1
        };
      }
      return c;
    });

    setContacts(updatedContacts as Contact[]);

    if (isSupabaseConfigured()) {
      for (const id of Array.from(selectedContactIds)) {
        const contact = contacts.find(c => c.id === id);
        if (contact) {
          await updateContact(id, {
            status: 'Convidado',
            last_invite_sent_at: new Date().toISOString(),
            invite_count: (contact.invite_count || 0) + 1
          });
        }
      }
    }

    setIsSending(false);

    // Instead of closing, show Success/Links view
    if (targetEvent) {
      setCampaignSuccess({ event: targetEvent, contacts: affectedContacts });
    }

    setSelectedContactIds(new Set());
  };

  const closeCampaignModal = () => {
    setShowCampaignModal(false);
    setCampaignSuccess(null);
    setSelectedEventId('');
  };

  const renderEngagement = (contact: Contact) => {
    if (contact.status === 'Agendado') {
      if ((contact.invite_count || 0) <= 1) {
        return <div className="flex items-center text-green-600 font-bold text-xs gap-1"><Icons.Trophy size={14} /> Converteu de 1ª</div>;
      }
      return <div className="flex items-center text-green-600 font-bold text-xs gap-1"><Icons.Check size={14} /> Agendado</div>;
    }
    const count = contact.invite_count || 0;
    if (count === 0) return <span className="text-slate-400 text-xs">-</span>;
    if (count >= 3) {
      return <div className="flex items-center text-blue-400 font-bold text-xs gap-1"><Icons.Thermometer size={14} /> Frio ({count}x)</div>;
    }
    return <div className="flex items-center text-orange-500 font-bold text-xs gap-1"><Icons.History size={14} /> Tentativa {count}</div>;
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <input type="text" placeholder="Buscar por nome, CPF..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 outline-none focus:border-indigo-500 transition-colors" />
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          </div>
          <button className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
            <Icons.Filter size={18} />
          </button>
        </div>

        <div className="flex gap-3">
          {selectedContactIds.size > 0 && (
            <button
              onClick={() => setShowCampaignModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 shadow-lg shadow-indigo-500/30"
            >
              <Icons.Send size={16} />
              Disparar ({selectedContactIds.size})
            </button>
          )}
          <button
            onClick={() => {
              setShowImportModal(true);
              setParsedPreview([]);
              setCsvText('');
            }}
            className="px-4 py-2 border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <Icons.Upload size={16} />
            Importar CSV
          </button>
          <button
            onClick={() => {
              setShowAddModal(true);
              setNewContact({});
              setCpfError(null);
            }}
            className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 flex items-center gap-2 shadow-lg"
          >
            <Icons.Plus size={16} />
            Novo Contato
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 w-10">
                <input
                  type="checkbox"
                  checked={selectedContactIds.size === contacts.length && contacts.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Nome / Email</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">CPF / Telefone</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Idade</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase">Rastreabilidade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contacts.map(contact => (
              <tr key={contact.id} className={`hover:bg-slate-50 transition-colors ${selectedContactIds.has(contact.id) ? 'bg-indigo-50/30' : ''}`}>
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selectedContactIds.has(contact.id)}
                    onChange={() => toggleSelect(contact.id)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-800">{contact.name}</div>
                  <div className="text-sm text-slate-500">{contact.email}</div>
                </td>
                <td className="p-4">
                  <div className="text-sm text-slate-700 font-mono">{contact.cpf || '-'}</div>
                  <div className="text-xs text-slate-500">{contact.phone || '-'}</div>
                </td>
                <td className="p-4 text-sm text-slate-700">
                  {contact.age || '-'}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold 
                    ${contact.status === 'Agendado' ? 'bg-green-100 text-green-700' :
                      contact.status === 'Convidado' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'}`}
                  >
                    {contact.status}
                  </span>
                </td>
                <td className="p-4">
                  {renderEngagement(contact)}
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-500">Nenhum contato encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[700px] max-h-[90vh] flex flex-col animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Icons.Upload size={24} className="text-indigo-600" />
                Importar Contatos
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600"><Icons.X size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {parsedPreview.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg border border-green-100">
                    <div className="flex items-center gap-2 text-green-700 font-bold">
                      <Icons.Check size={20} />
                      <span>{parsedPreview.length} contatos identificados</span>
                    </div>
                    <button onClick={() => setParsedPreview([])} className="text-sm text-green-600 hover:underline">Reiniciar</button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="p-3 font-bold text-slate-600">Nome</th>
                          <th className="p-3 font-bold text-slate-600">Email</th>
                          <th className="p-3 font-bold text-slate-600">CPF</th>
                          <th className="p-3 font-bold text-slate-600">Tel</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedPreview.map((c, idx) => (
                          <tr key={idx}>
                            <td className="p-3 text-slate-800">{c.name}</td>
                            <td className="p-3 text-slate-600">{c.email}</td>
                            <td className="p-3 text-slate-600">{c.cpf || '-'}</td>
                            <td className="p-3 text-slate-600">{c.phone || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    * Contatos com e-mails já existentes serão atualizados.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex gap-6 mb-6 border-b border-slate-100">
                    <button
                      onClick={() => setImportTab('file')}
                      className={`pb-2 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${importTab === 'file' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
                    >
                      <Icons.FileText size={16} /> Upload de Arquivo
                    </button>
                    <button
                      onClick={() => setImportTab('paste')}
                      className={`pb-2 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${importTab === 'paste' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
                    >
                      <Icons.Table size={16} /> Colar Texto
                    </button>
                  </div>

                  {importTab === 'file' ? (
                    <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors relative">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".csv"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                      />
                      <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                        <Icons.UploadCloud size={32} />
                      </div>
                      <h4 className="font-bold text-slate-800">Arraste seu arquivo CSV aqui</h4>
                      <p className="text-sm text-slate-500 mt-2">ou clique para selecionar do computador</p>

                      <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); downloadTemplate(); }}
                        className="mt-6 text-xs font-bold text-indigo-600 flex items-center justify-center gap-1 hover:underline z-10 relative"
                      >
                        <Icons.DownloadCloud size={14} /> Baixar modelo de planilha
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-500">Copie os dados do Excel ou Planilhas Google e cole aqui (com cabeçalho).</p>
                      <textarea
                        value={csvText}
                        onChange={e => {
                          setCsvText(e.target.value);
                          if (e.target.value.includes('\n')) parseCSV(e.target.value);
                        }}
                        placeholder={`Nome,Email,CPF,Telefone,Idade\nJoão Silva,joao@email.com,123.456.789-00,1199999,30`}
                        className="w-full h-48 p-4 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 outline-none"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => parseCSV(csvText)}
                          disabled={!csvText}
                          className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-700"
                        >
                          Processar Texto
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancelar</button>
              {parsedPreview.length > 0 && (
                <button
                  onClick={handleImportSubmit}
                  disabled={isLoading}
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                >
                  {isLoading ? 'Importando...' : `Importar ${parsedPreview.length} Contatos`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px] animate-in zoom-in-95">
            <h3 className="text-lg font-bold mb-4 text-slate-800">Adicionar Contato</h3>

            {showDuplicateAlert ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                  <Icons.AlertTriangle size={18} />
                  <span>Contato Duplicado</span>
                </div>
                <p className="text-sm text-amber-700 mb-4">
                  Já existe um contato registrado com este Email ou CPF: <strong>{showDuplicateAlert.name}</strong>.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowDuplicateAlert(null)} className="flex-1 py-2 bg-white border border-amber-200 text-amber-800 rounded font-medium text-sm hover:bg-amber-100">
                    Corrigir
                  </button>
                  <button onClick={executeUpdateContact} className="flex-1 py-2 bg-amber-600 text-white rounded font-medium text-sm hover:bg-amber-700">
                    Atualizar Dados
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <input
                    className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Nome Completo"
                    value={newContact.name || ''}
                    onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                  />
                  <input
                    className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Email"
                    type="email"
                    value={newContact.email || ''}
                    onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                  />

                  <div>
                    <input
                      className={`w-full p-3 border rounded-lg outline-none focus:ring-2 transition-all
                            ${cpfError ? 'border-red-300 focus:ring-red-500/20 text-red-900' : 'border-slate-200 focus:ring-indigo-500/20'}
                        `}
                      placeholder="CPF (000.000.000-00)"
                      value={newContact.cpf || ''}
                      maxLength={14}
                      onChange={e => {
                        setNewContact({ ...newContact, cpf: formatCPF(e.target.value) });
                        if (cpfError) setCpfError(null);
                      }}
                    />
                    {cpfError && <span className="text-xs text-red-500 font-medium mt-1 ml-1">{cpfError}</span>}
                  </div>

                  <div className="flex gap-3">
                    <input
                      className="w-2/3 p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Telefone"
                      value={newContact.phone || ''}
                      onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                    />
                    <input
                      className="w-1/3 p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Idade"
                      type="number"
                      value={newContact.age || ''}
                      onChange={e => setNewContact({ ...newContact, age: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Cancelar</button>
                  <button onClick={handlePreAddValidation} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800">Salvar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[550px] animate-in zoom-in-95">

            {campaignSuccess ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icons.Check size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Campanha Disparada!</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Links únicos gerados para o evento <strong>{campaignSuccess.event.title}</strong>.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg max-h-[300px] overflow-y-auto mb-6">
                  {campaignSuccess.contacts.map(c => (
                    <div key={c.id} className="p-3 border-b border-slate-100 last:border-0 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-700">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.email}</div>
                      </div>
                      {onSimulateBooking ? (
                        <button
                          onClick={() => onSimulateBooking(campaignSuccess.event, c)}
                          className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 text-xs font-bold rounded-md hover:bg-indigo-50 transition-colors"
                        >
                          Simular Clique
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Link Enviado</span>
                      )}
                    </div>
                  ))}
                </div>

                <button onClick={closeCampaignModal} className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800">
                  Concluir
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4 text-indigo-600">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Icons.Send size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Disparo em Massa</h3>
                </div>

                <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                  Você está prestes a convidar <strong>{selectedContactIds.size} pessoas</strong>.
                  <br />Isso incrementará o contador de tentativas de cada um e gerará links personalizados.
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Qual evento eles devem agendar?</label>
                  <select
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  >
                    <option value="" disabled>Selecione um evento...</option>
                    {events.map(evt => (
                      <option key={evt.id} value={evt.id}>{evt.title} ({evt.duration} min)</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowCampaignModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Cancelar</button>
                  <button
                    onClick={handleSendCampaign}
                    disabled={!selectedEventId || isSending}
                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                  >
                    {isSending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Icons.Send size={16} />
                        Confirmar Envio
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};