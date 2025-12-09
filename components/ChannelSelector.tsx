import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { trackingService, CampaignAnalytics } from '../services/trackingService';
import { toast } from 'sonner';

interface ChannelSelectorProps {
    selectedChannel: 'email' | 'whatsapp' | 'sms';
    onChannelChange: (channel: 'email' | 'whatsapp' | 'sms') => void;
    recipientCount?: {
        email: number;
        whatsapp: number;
        sms: number;
    };
    disabled?: boolean;
}

/**
 * Channel Selector Component
 * Allows selection of communication channel (Email, WhatsApp, SMS)
 */
export const ChannelSelector: React.FC<ChannelSelectorProps> = ({
    selectedChannel,
    onChannelChange,
    recipientCount,
    disabled = false
}) => {
    const channels = [
        {
            id: 'email' as const,
            label: 'Email',
            icon: Icons.Mail,
            color: 'indigo',
            description: 'Envio via Gmail OAuth'
        },
        {
            id: 'whatsapp' as const,
            label: 'WhatsApp',
            icon: Icons.MessageCircle,
            color: 'green',
            description: 'Webhook n8n'
        },
        {
            id: 'sms' as const,
            label: 'SMS',
            icon: Icons.Smartphone,
            color: 'blue',
            description: 'Webhook n8n'
        }
    ];

    return (
        <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">
                Selecionar Canal de Envio
            </label>

            <div className="grid grid-cols-3 gap-3">
                {channels.map(channel => {
                    const Icon = channel.icon;
                    const count = recipientCount?.[channel.id] || 0;
                    const isSelected = selectedChannel === channel.id;

                    return (
                        <button
                            key={channel.id}
                            onClick={() => !disabled && onChannelChange(channel.id)}
                            disabled={disabled}
                            className={`
                relative p-4 rounded-xl border-2 transition-all duration-200
                ${isSelected
                                    ? `border-${channel.color}-500 bg-${channel.color}-50 shadow-md`
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
                            style={{
                                borderColor: isSelected ?
                                    channel.color === 'indigo' ? '#6366f1' :
                                        channel.color === 'green' ? '#22c55e' :
                                            '#3b82f6' : undefined,
                                backgroundColor: isSelected ?
                                    channel.color === 'indigo' ? '#eef2ff' :
                                        channel.color === 'green' ? '#f0fdf4' :
                                            '#eff6ff' : undefined
                            }}
                        >
                            {/* Selected indicator */}
                            {isSelected && (
                                <div
                                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                                    style={{
                                        backgroundColor:
                                            channel.color === 'indigo' ? '#6366f1' :
                                                channel.color === 'green' ? '#22c55e' :
                                                    '#3b82f6'
                                    }}
                                >
                                    <Icons.Check size={12} className="text-white" />
                                </div>
                            )}

                            <div className="flex flex-col items-center text-center">
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2`}
                                    style={{
                                        backgroundColor: isSelected ?
                                            channel.color === 'indigo' ? '#c7d2fe' :
                                                channel.color === 'green' ? '#bbf7d0' :
                                                    '#bfdbfe' :
                                            '#f1f5f9'
                                    }}
                                >
                                    <Icon
                                        size={24}
                                        style={{
                                            color:
                                                channel.color === 'indigo' ? '#4f46e5' :
                                                    channel.color === 'green' ? '#16a34a' :
                                                        '#2563eb'
                                        }}
                                    />
                                </div>

                                <span className={`font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                    {channel.label}
                                </span>

                                <span className="text-xs text-slate-500 mt-1">
                                    {channel.description}
                                </span>

                                {recipientCount && (
                                    <span
                                        className={`mt-2 px-2 py-0.5 rounded-full text-xs font-medium
                      ${count > 0 ? 'bg-slate-100 text-slate-700' : 'bg-red-50 text-red-600'}
                    `}
                                    >
                                        {count} disponíveis
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Channel info */}
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                <Icons.Info size={12} />
                <span>
                    {selectedChannel === 'email' && 'Emails enviados via sua conta Gmail conectada'}
                    {selectedChannel === 'whatsapp' && 'Requer configuração de webhook n8n'}
                    {selectedChannel === 'sms' && 'Requer configuração de webhook n8n'}
                </span>
            </div>
        </div>
    );
};

/**
 * Campaign Metrics Card Component
 */
interface MetricsCardProps {
    analytics: CampaignAnalytics | null;
    loading?: boolean;
}

export const CampaignMetricsCard: React.FC<MetricsCardProps> = ({ analytics, loading }) => {
    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-20 bg-slate-100 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!analytics) return null;

    const metrics = [
        {
            label: 'Enviados',
            value: analytics.sent,
            color: 'slate',
            icon: Icons.Send
        },
        {
            label: 'Entregues',
            value: analytics.delivered,
            rate: analytics.delivery_rate,
            color: 'blue',
            icon: Icons.CheckCircle
        },
        {
            label: 'Abertos',
            value: analytics.opened,
            rate: analytics.open_rate,
            color: 'indigo',
            icon: Icons.Eye
        },
        {
            label: 'Cliques',
            value: analytics.clicked,
            rate: analytics.click_rate,
            color: 'purple',
            icon: Icons.MousePointer
        },
        {
            label: 'Agendados',
            value: analytics.booked,
            rate: analytics.booking_rate,
            color: 'green',
            icon: Icons.Calendar
        }
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Icons.BarChart2 size={18} className="text-indigo-600" />
                Métricas da Campanha
            </h3>

            <div className="grid grid-cols-5 gap-3">
                {metrics.map((metric, i) => {
                    const Icon = metric.icon;
                    return (
                        <div
                            key={i}
                            className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Icon size={16} className="text-slate-400" />
                                <span className="text-xs font-medium text-slate-500">{metric.label}</span>
                            </div>
                            <div className="text-2xl font-bold text-slate-900">{metric.value}</div>
                            {metric.rate !== undefined && (
                                <div className="text-xs text-slate-500 mt-1">
                                    {metric.rate.toFixed(1)}%
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Channel breakdown */}
            <div className="mt-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-medium text-slate-500 uppercase mb-3">Por Canal</h4>
                <div className="grid grid-cols-3 gap-3">
                    {['email', 'whatsapp', 'sms'].map(channel => {
                        const data = analytics.by_channel[channel as keyof typeof analytics.by_channel];
                        const sent = data?.sent || 0;
                        const delivered = data?.delivered || 0;
                        const rate = sent > 0 ? ((delivered / sent) * 100).toFixed(0) : '0';

                        return (
                            <div key={channel} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                {channel === 'email' && <Icons.Mail size={14} className="text-indigo-500" />}
                                {channel === 'whatsapp' && <Icons.MessageCircle size={14} className="text-green-500" />}
                                {channel === 'sms' && <Icons.Smartphone size={14} className="text-blue-500" />}
                                <div className="flex-1">
                                    <div className="text-xs font-medium text-slate-700 capitalize">{channel}</div>
                                    <div className="text-xs text-slate-500">{sent} env · {rate}% entrega</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/**
 * Send Button with Channel Indicator
 */
interface SendButtonProps {
    channel: 'email' | 'whatsapp' | 'sms';
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
    recipientCount: number;
    type?: 'invite' | 'reminder';
}

export const ChannelSendButton: React.FC<SendButtonProps> = ({
    channel,
    onClick,
    loading = false,
    disabled = false,
    recipientCount,
    type = 'invite'
}) => {
    const channelConfig = {
        email: {
            icon: Icons.Mail,
            color: '#4f46e5',
            bgColor: '#eef2ff',
            label: 'Email'
        },
        whatsapp: {
            icon: Icons.MessageCircle,
            color: '#16a34a',
            bgColor: '#f0fdf4',
            label: 'WhatsApp'
        },
        sms: {
            icon: Icons.Smartphone,
            color: '#2563eb',
            bgColor: '#eff6ff',
            label: 'SMS'
        }
    };

    const config = channelConfig[channel];
    const Icon = config.icon;

    return (
        <button
            onClick={onClick}
            disabled={disabled || loading || recipientCount === 0}
            className={`
        px-4 py-2.5 rounded-lg font-medium transition-all duration-200
        flex items-center gap-2
        ${disabled || recipientCount === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                }
      `}
            style={{
                backgroundColor: (disabled || recipientCount === 0) ? undefined : config.color
            }}
        >
            {loading ? (
                <Icons.Loader2 size={18} className="animate-spin" />
            ) : (
                <Icon size={18} />
            )}

            <span>
                {type === 'invite' ? 'Enviar Convites' : 'Enviar Lembretes'}
            </span>

            <span
                className="px-1.5 py-0.5 rounded text-xs font-bold"
                style={{
                    backgroundColor: (disabled || recipientCount === 0) ? '#e2e8f0' : 'rgba(255,255,255,0.2)'
                }}
            >
                {recipientCount}
            </span>
        </button>
    );
};

export default ChannelSelector;
