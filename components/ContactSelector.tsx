import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';
import { Contact } from '../types';
import { getContacts } from '../services/supabaseService';

export interface ParsedContact {
    id?: string;
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
    metadata?: Record<string, any>;
    status?: string;
    invite_count?: number;
}

interface ContactSelectorProps {
    onContactsSelected: (contacts: ParsedContact[]) => void;
    initialContacts?: ParsedContact[];
}

export const ContactSelector: React.FC<ContactSelectorProps> = ({
    onContactsSelected,
    initialContacts = []
}) => {
    const [mode, setMode] = useState<'upload' | 'paste' | 'existing'>('existing');
    const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>(initialContacts);
    const [existingContacts, setExistingContacts] = useState<Contact[]>([]);
    const [selectedExisting, setSelectedExisting] = useState<Set<string>>(new Set());
    const [csvText, setCsvText] = useState('');
    const [csvFile, setCSVFile] = useState<File | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadExistingContacts();
    }, []);

    const loadExistingContacts = async () => {
        try {
            const contacts = await getContacts();
            setExistingContacts(contacts);
        } catch (error) {
            console.error('Erro ao carregar contatos:', error);
        }
    };

    const parseCSV = (text: string): ParsedContact[] => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) return [];

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const contacts: ParsedContact[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const contact: ParsedContact = {
                name: '',
                email: '',
                metadata: {}
            };

            headers.forEach((header, index) => {
                const value = values[index];
                if (header === 'nome' || header === 'name') {
                    contact.name = value;
                } else if (header === 'email' || header === 'e-mail') {
                    contact.email = value;
                } else if (header === 'telefone' || header === 'phone') {
                    contact.phone = value;
                } else if (header === 'cpf') {
                    contact.cpf = value;
                } else {
                    contact.metadata![header] = value;
                }
            });

            if (contact.name && contact.email) {
                contacts.push(contact);
            }
        }

        return contacts;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCSVFile(file);
        const reader = new FileReader();

        reader.onload = (event) => {
            const text = event.target?.result as string;
            const parsed = parseCSV(text);
            setParsedContacts(parsed);
            onContactsSelected(parsed);
        };

        reader.readAsText(file);
    };

    const handlePasteCSV = () => {
        const parsed = parseCSV(csvText);
        setParsedContacts(parsed);
        onContactsSelected(parsed);
    };

    const handleToggleExisting = (contactId: string) => {
        const newSet = new Set(selectedExisting);
        if (newSet.has(contactId)) {
            newSet.delete(contactId);
        } else {
            newSet.add(contactId);
        }
        setSelectedExisting(newSet);

        // Convert selected existing contacts to ParsedContact format
        const selected = existingContacts
            .filter(c => newSet.has(c.id))
            .map(c => ({
                id: c.id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                cpf: c.cpf
            }));

        // Add any CSV contacts too
        onContactsSelected([...parsedContacts, ...selected]);
    };

    const handleSelectAllExisting = () => {
        const filteredExisting = existingContacts.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (selectedExisting.size === filteredExisting.length) {
            setSelectedExisting(new Set());
            onContactsSelected(parsedContacts);
        } else {
            const allIds = new Set(filteredExisting.map(c => c.id));
            setSelectedExisting(allIds);

            const selected = filteredExisting.map(c => ({
                id: c.id,
                name: c.name,
                email: c.email,
                phone: c.phone,
                cpf: c.cpf
            }));

            onContactsSelected([...parsedContacts, ...selected]);
        }
    };

    const filteredExisting = existingContacts.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalSelected = parsedContacts.length + selectedExisting.size;

    return (
        <div className="space-y-4">
            {/* Mode Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setMode('existing')}
                    className={`px-4 py-2 font-medium text-sm transition-all border-b-2 ${mode === 'existing'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                >
                    <Icons.Users size={16} className="inline mr-2" />
                    Contatos Existentes ({selectedExisting.size})
                </button>
                <button
                    onClick={() => setMode('upload')}
                    className={`px-4 py-2 font-medium text-sm transition-all border-b-2 ${mode === 'upload'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                >
                    <Icons.Upload size={16} className="inline mr-2" />
                    Upload CSV ({parsedContacts.length > 0 ? parsedContacts.length : 0})
                </button>
                <button
                    onClick={() => setMode('paste')}
                    className={`px-4 py-2 font-medium text-sm transition-all border-b-2 ${mode === 'paste'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                >
                    <Icons.Copy size={16} className="inline mr-2" />
                    Colar CSV
                </button>
            </div>

            {/* Existing Contacts Mode */}
            {mode === 'existing' && (
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por nome ou email..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                        </div>
                        <button
                            onClick={handleSelectAllExisting}
                            className="px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                            {selectedExisting.size === filteredExisting.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                        </button>
                    </div>

                    <div className="border border-slate-200 rounded-lg max-h-80 overflow-y-auto">
                        {filteredExisting.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                {searchTerm ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredExisting.map((contact) => (
                                    <label
                                        key={contact.id}
                                        className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-all"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedExisting.has(contact.id)}
                                            onChange={() => handleToggleExisting(contact.id)}
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-slate-900 truncate">{contact.name}</div>
                                            <div className="text-sm text-slate-600 truncate">{contact.email}</div>
                                        </div>
                                        {contact.status && (
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${contact.status === 'Agendado' ? 'bg-green-100 text-green-700' :
                                                contact.status === 'Convidado' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                {contact.status}
                                            </span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Upload CSV Mode */}
            {mode === 'upload' && (
                <div className="space-y-3">
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-all">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="csv-upload-selector"
                            ref={fileInputRef}
                        />
                        <label htmlFor="csv-upload-selector" className="cursor-pointer">
                            <Icons.Upload size={40} className="text-slate-400 mx-auto mb-4" />
                            <p className="text-slate-700 font-medium mb-2">
                                {csvFile ? csvFile.name : 'Clique para fazer upload do CSV'}
                            </p>
                            <p className="text-sm text-slate-500">
                                O arquivo deve conter: nome, email, telefone (opcional)
                            </p>
                        </label>
                    </div>

                    {parsedContacts.length > 0 && (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className="bg-slate-50 px-4 py-2 font-medium text-sm text-slate-700 flex items-center justify-between">
                                <span>{parsedContacts.length} contatos importados</span>
                                <button
                                    onClick={() => {
                                        setParsedContacts([]);
                                        setCSVFile(null);
                                        onContactsSelected([]);
                                    }}
                                    className="text-red-600 hover:text-red-700 text-xs"
                                >
                                    Limpar
                                </button>
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="text-left p-3 font-medium text-slate-700">Nome</th>
                                            <th className="text-left p-3 font-medium text-slate-700">Email</th>
                                            <th className="text-left p-3 font-medium text-slate-700">Telefone</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedContacts.slice(0, 5).map((contact, index) => (
                                            <tr key={index} className="border-t border-slate-100">
                                                <td className="p-3">{contact.name}</td>
                                                <td className="p-3 text-slate-600">{contact.email}</td>
                                                <td className="p-3 text-slate-600">{contact.phone || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {parsedContacts.length > 5 && (
                                    <div className="p-3 bg-slate-50 text-center text-sm text-slate-600">
                                        E mais {parsedContacts.length - 5} contatos...
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Paste CSV Mode */}
            {mode === 'paste' && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Cole o conteúdo do CSV
                        </label>
                        <textarea
                            value={csvText}
                            onChange={(e) => setCsvText(e.target.value)}
                            placeholder="nome,email,telefone&#10;João Silva,joao@email.com,11999999999&#10;Maria Santos,maria@email.com,11988888888"
                            rows={8}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm resize-none"
                        />
                    </div>
                    <button
                        onClick={handlePasteCSV}
                        disabled={!csvText.trim()}
                        className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                        Processar CSV
                    </button>

                    {parsedContacts.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-green-700">
                                <Icons.Check size={20} />
                                <span className="font-medium">{parsedContacts.length} contatos processados com sucesso!</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Total Summary */}
            {totalSelected > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-indigo-700">
                        <Icons.Users size={20} />
                        <span className="font-medium">
                            Total selecionado: {totalSelected} contato{totalSelected > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="text-sm text-indigo-600 mt-1">
                        {parsedContacts.length > 0 && `${parsedContacts.length} do CSV`}
                        {parsedContacts.length > 0 && selectedExisting.size > 0 && ' + '}
                        {selectedExisting.size > 0 && `${selectedExisting.size} existente${selectedExisting.size > 1 ? 's' : ''}`}
                    </div>
                </div>
            )}
        </div>
    );
};
