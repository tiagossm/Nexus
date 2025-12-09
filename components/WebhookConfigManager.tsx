import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { webhookService, WebhookConfig } from '../services/webhookService';
import { toast } from 'sonner';

interface WebhookConfigManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Webhook Configuration Manager Component
 * Allows admins to configure n8n webhooks for WhatsApp and SMS
 */
export const WebhookConfigManager: React.FC<WebhookConfigManagerProps> = ({
    isOpen,
    onClose
}) => {
    const [configs, setConfigs] = useState<WebhookConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        channel: 'whatsapp' as 'whatsapp' | 'sms',
        webhook_url: '',
        secret_key: '',
        active: true
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadConfigs();
        }
    }, [isOpen]);

    const loadConfigs = async () => {
        try {
            setLoading(true);
            const data = await webhookService.listWebhookConfigs();
            setConfigs(data);
        } catch (error) {
            console.error('Error loading webhook configs:', error);
            toast.error('Erro ao carregar configurações');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.webhook_url) {
            toast.error('Preencha todos os campos obrigatórios');
            return;
        }

        try {
            setSaving(true);

            const payload: Partial<WebhookConfig> = {
                ...formData,
                ...(editingId && { id: editingId })
            };

            const result = await webhookService.upsertWebhookConfig(payload);

            if (result) {
                toast.success(editingId ? 'Webhook atualizado!' : 'Webhook criado!');
                resetForm();
                loadConfigs();
            } else {
                toast.error('Erro ao salvar webhook');
            }
        } catch (error) {
            console.error('Error saving webhook:', error);
            toast.error('Erro ao salvar webhook');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async (webhookId: string) => {
        try {
            setTesting(webhookId);
            const success = await webhookService.testWebhook(webhookId);

            if (success) {
                toast.success('✅ Webhook funcionando!');
            } else {
                toast.error('❌ Webhook não respondeu');
            }
        } catch (error) {
            toast.error('Erro ao testar webhook');
        } finally {
            setTesting(null);
        }
    };

    const handleEdit = (config: WebhookConfig) => {
        setFormData({
            name: config.name,
            channel: config.channel,
            webhook_url: config.webhook_url,
            secret_key: config.secret_key || '',
            active: config.active
        });
        setEditingId(config.id);
        setShowForm(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            channel: 'whatsapp',
            webhook_url: '',
            secret_key: '',
            active: true
        });
        setEditingId(null);
        setShowForm(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-600">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                            <Icons.Zap size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Webhooks n8n</h3>
                            <p className="text-sm text-white/80">Configure integrações WhatsApp e SMS</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                    >
                        <Icons.X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Icons.Loader2 size={32} className="text-indigo-600 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Existing Configs */}
                            {configs.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                                        <Icons.Settings size={16} />
                                        Webhooks Configurados
                                    </h4>

                                    {configs.map(config => (
                                        <div
                                            key={config.id}
                                            className={`p-4 rounded-xl border transition-all ${config.active
                                                    ? 'bg-white border-slate-200 hover:border-indigo-300'
                                                    : 'bg-slate-50 border-slate-200 opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.channel === 'whatsapp' ? 'bg-green-100' : 'bg-blue-100'
                                                        }`}>
                                                        {config.channel === 'whatsapp' ? (
                                                            <Icons.MessageCircle size={20} className="text-green-600" />
                                                        ) : (
                                                            <Icons.Smartphone size={20} className="text-blue-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-900">{config.name}</div>
                                                        <div className="text-xs text-slate-500 truncate max-w-xs">
                                                            {config.webhook_url}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Status badge */}
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.active
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {config.active ? 'Ativo' : 'Inativo'}
                                                    </span>

                                                    {/* Test button */}
                                                    <button
                                                        onClick={() => handleTest(config.id)}
                                                        disabled={testing === config.id || !config.active}
                                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 disabled:opacity-50"
                                                        title="Testar webhook"
                                                    >
                                                        {testing === config.id ? (
                                                            <Icons.Loader2 size={16} className="animate-spin" />
                                                        ) : (
                                                            <Icons.Zap size={16} />
                                                        )}
                                                    </button>

                                                    {/* Edit button */}
                                                    <button
                                                        onClick={() => handleEdit(config)}
                                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                                                        title="Editar"
                                                    >
                                                        <Icons.Edit size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add/Edit Form */}
                            {showForm ? (
                                <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-slate-50 rounded-xl">
                                    <h4 className="font-semibold text-slate-700">
                                        {editingId ? 'Editar Webhook' : 'Novo Webhook'}
                                    </h4>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-slate-700 block mb-1">
                                                Nome *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Ex: n8n WhatsApp Produção"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-slate-700 block mb-1">
                                                Canal *
                                            </label>
                                            <select
                                                value={formData.channel}
                                                onChange={e => setFormData({ ...formData, channel: e.target.value as 'whatsapp' | 'sms' })}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="whatsapp">WhatsApp</option>
                                                <option value="sms">SMS</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-slate-700 block mb-1">
                                            URL do Webhook *
                                        </label>
                                        <input
                                            type="url"
                                            value={formData.webhook_url}
                                            onChange={e => setFormData({ ...formData, webhook_url: e.target.value })}
                                            placeholder="https://seu-n8n.com/webhook/..."
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-slate-700 block mb-1">
                                            Secret Key (opcional)
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.secret_key}
                                            onChange={e => setFormData({ ...formData, secret_key: e.target.value })}
                                            placeholder="Para validação HMAC-SHA256"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">
                                            Use se seu n8n valida signatures
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="active"
                                            checked={formData.active}
                                            onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="active" className="text-sm text-slate-700">
                                            Webhook ativo
                                        </label>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {saving && <Icons.Loader2 size={16} className="animate-spin" />}
                                            {editingId ? 'Salvar' : 'Criar Webhook'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Icons.Plus size={20} />
                                    Adicionar Webhook
                                </button>
                            )}

                            {/* Help */}
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="flex items-start gap-3">
                                    <Icons.Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-800">
                                        <strong>Como usar:</strong>
                                        <ol className="mt-2 space-y-1 list-decimal list-inside">
                                            <li>Crie um workflow no n8n com Webhook trigger</li>
                                            <li>Copie a URL do webhook e cole aqui</li>
                                            <li>Configure o n8n para chamar nosso callback após enviar</li>
                                            <li>Teste a conexão clicando no botão ⚡</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all font-medium"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WebhookConfigManager;
