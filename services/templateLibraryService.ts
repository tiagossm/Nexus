import { MessageChannel } from '../types';

export interface TemplateLibraryItem {
  id: string;
  name: string;
  description: string;
  channel: MessageChannel;
  category: 'formal' | 'friendly' | 'urgent' | 'reminder' | 'confirmation';
  subject?: string;
  body: string;
  preview: string;
  tags: string[];
}

export const TEMPLATE_LIBRARY: TemplateLibraryItem[] = [
  // ===== EMAIL TEMPLATES =====
  {
    id: 'email-formal',
    name: 'Convite Formal',
    description: 'Template profissional para convocação de exames',
    channel: 'email',
    category: 'formal',
    subject: 'Convocação para Exame Admissional - {{company.name}}',
    body: `Prezado(a) {{contact.name}},

Você foi convocado(a) para realizar o exame admissional na {{clinic.name}}.

📅 **Agende seu horário:** {{link_agendamento}}
⏰ **Prazo:** até {{data_limite}}

**Informações importantes:**
- Leve um documento com foto
- Chegue com 15 minutos de antecedência
- Em caso de dúvidas, entre em contato conosco

Atenciosamente,
Equipe {{company.name}}`,
    preview: 'Prezado(a) João da Silva, Você foi convocado(a) para realizar o exame...',
    tags: ['profissional', 'admissional', 'formal']
  },
  {
    id: 'email-friendly',
    name: 'Convite Amigável',
    description: 'Template descontraído e acolhedor',
    channel: 'email',
    category: 'friendly',
    subject: 'Olá {{contact.firstName}}! Vamos agendar seu exame? 👋',
    body: `{{greeting}}, {{contact.firstName}}!

Tudo bem? Você precisa agendar seu exame admissional! 

É super rápido e fácil, clique no botão abaixo:

🔗 **[Agendar Agora]({{link_agendamento}})**

**Por que é importante?**
✅ Processo rápido (menos de 2 minutos)
✅ Escolha o melhor horário para você
✅ Confirmação instantânea

Qualquer dúvida, estamos à disposição!

Abraços,
Equipe {{company.name}} 💙`,
    preview: 'Boa tarde, João! Tudo bem? Você precisa agendar seu exame admissional...',
    tags: ['amigável', 'casual', 'acolhedor']
  },
  {
    id: 'email-urgent',
    name: 'Lembrete Urgente',
    description: 'Para prazos próximos do vencimento',
    channel: 'email',
    category: 'urgent',
    subject: '⚠️ URGENTE: Prazo para agendamento termina em breve!',
    body: `{{contact.firstName}}, atenção! ⚠️

O prazo para agendar seu exame admissional termina em **{{data_limite}}**.

⏰ **Não perca tempo!**

👉 **[AGENDE AGORA]({{link_agendamento}})**

**O que acontece se não agendar?**
- Seu processo pode ser cancelado
- Você perderá a vaga
- Terá que reiniciar todo o processo

**É rápido:** Menos de 2 minutos para agendar!

Não deixe para depois!

Equipe {{company.name}}`,
    preview: 'João, atenção! O prazo para agendar seu exame termina em breve...',
    tags: ['urgente', 'prazo', 'alerta']
  },
  {
    id: 'email-confirmation',
    name: 'Confirmação de Agendamento',
    description: 'Enviado após o agendamento ser realizado',
    channel: 'email',
    category: 'confirmation',
    subject: '✅ Agendamento Confirmado - {{exam.name}}',
    body: `Olá {{contact.firstName}},

Seu agendamento foi confirmado com sucesso! 🎉

**Detalhes do Agendamento:**
📋 **Exame:** {{exam.name}}
📅 **Data:** {{exam.date}}
🕐 **Horário:** {{exam.time}}
📍 **Local:** {{clinic.name}}
🏥 **Endereço:** {{clinic.address}}

**Lembre-se de levar:**
- Documento com foto (RG ou CNH)
- Cartão do convênio (se aplicável)

**Precisa remarcar?**
Entre em contato conosco pelo telefone {{clinic.phone}}

Nos vemos lá!

Equipe {{company.name}}`,
    preview: 'Olá João, Seu agendamento foi confirmado com sucesso!...',
    tags: ['confirmação', 'agendado', 'sucesso']
  },
  {
    id: 'email-reminder-24h',
    name: 'Lembrete 24h Antes',
    description: 'Lembrete automático enviado 24h antes do exame',
    channel: 'email',
    category: 'reminder',
    subject: '🔔 Lembrete: Seu exame é amanhã!',
    body: `Oi {{contact.firstName}},

Só passando para lembrar que seu exame é **amanhã**! 📅

**Detalhes:**
🕐 **Horário:** {{exam.time}}
📍 **Local:** {{clinic.name}}
🗺️ **Endereço:** {{clinic.address}}

**Checklist:**
☑️ Documento com foto
☑️ Chegue 15 minutos antes
☑️ Esteja em jejum (se necessário)

**Precisa remarcar?**
Entre em contato urgente: {{clinic.phone}}

Até amanhã!

Equipe {{company.name}}`,
    preview: 'Oi João, Só passando para lembrar que seu exame é amanhã!...',
    tags: ['lembrete', '24h', 'amanhã']
  },

  // ===== WHATSAPP TEMPLATES =====
  {
    id: 'whatsapp-direct',
    name: 'WhatsApp Direto',
    description: 'Mensagem curta e objetiva',
    channel: 'whatsapp',
    category: 'formal',
    body: `Olá {{contact.firstName}}! 

Você precisa agendar seu exame admissional.

🔗 Clique aqui: {{link_agendamento}}

⏰ Prazo: {{data_limite}}

Dúvidas? Responda esta mensagem!`,
    preview: 'Olá João! Você precisa agendar seu exame admissional...',
    tags: ['direto', 'objetivo', 'curto']
  },
  {
    id: 'whatsapp-detailed',
    name: 'WhatsApp Detalhado',
    description: 'Com instruções passo a passo',
    channel: 'whatsapp',
    category: 'friendly',
    body: `{{greeting}}, {{contact.firstName}}!

Você foi convocado para exame admissional na *{{clinic.name}}*.

📋 *O que fazer:*
1️⃣ Clique no link: {{link_agendamento}}
2️⃣ Escolha data e horário
3️⃣ Compareça no dia marcado

⏰ *Prazo:* {{data_limite}}

📍 *Local:* {{clinic.address}}
📞 *Contato:* {{clinic.phone}}

Dúvidas? Responda esta mensagem!`,
    preview: 'Boa tarde, João! Você foi convocado para exame admissional...',
    tags: ['detalhado', 'instruções', 'completo']
  },
  {
    id: 'whatsapp-short',
    name: 'WhatsApp Curto',
    description: 'Mensagem ultra-compacta',
    channel: 'whatsapp',
    category: 'urgent',
    body: `{{contact.firstName}}, agende seu exame: {{link_agendamento}}

Prazo: {{data_limite}} ⏰`,
    preview: 'João, agende seu exame: [link] Prazo: 31/12/2024',
    tags: ['curto', 'compacto', 'rápido']
  },

  // ===== SMS TEMPLATES =====
  {
    id: 'sms-quick',
    name: 'SMS Rápido',
    description: 'Mensagem SMS básica',
    channel: 'sms',
    category: 'formal',
    body: `{{contact.firstName}}, agende seu exame: {{link_agendamento}} Prazo: {{data_limite}}`,
    preview: 'João, agende seu exame: [link] Prazo: 31/12/2024',
    tags: ['sms', 'básico', 'curto']
  },
  {
    id: 'sms-complete',
    name: 'SMS Completo',
    description: 'SMS com mais informações',
    channel: 'sms',
    category: 'friendly',
    body: `{{company.name}}: Olá {{contact.firstName}}! Agende seu exame admissional até {{data_limite}}. Link: {{link_agendamento}}`,
    preview: 'Nexus Agenda: Olá João! Agende seu exame admissional até 31/12/2024...',
    tags: ['sms', 'completo', 'informativo']
  }
];

// ===== FUNÇÕES DO SERVIÇO =====

export function getLibraryTemplates(): TemplateLibraryItem[] {
  return TEMPLATE_LIBRARY;
}

export function getTemplatesByChannel(channel: MessageChannel): TemplateLibraryItem[] {
  return TEMPLATE_LIBRARY.filter(t => t.channel === channel);
}

export function getTemplatesByCategory(category: TemplateLibraryItem['category']): TemplateLibraryItem[] {
  return TEMPLATE_LIBRARY.filter(t => t.category === category);
}

export function searchTemplates(query: string): TemplateLibraryItem[] {
  const lowerQuery = query.toLowerCase();
  return TEMPLATE_LIBRARY.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export function getTemplateById(id: string): TemplateLibraryItem | undefined {
  return TEMPLATE_LIBRARY.find(t => t.id === id);
}

export function applyTemplate(templateId: string): { subject?: string; body: string } | null {
  const template = getTemplateById(templateId);
  if (!template) return null;

  return {
    subject: template.subject,
    body: template.body
  };
}
