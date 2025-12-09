# Nexus Agenda - Sistema de Agendamento Inteligente

Sistema moderno de agendamento com IA generativa (Google Gemini) e backend Supabase.

---

## 🚀 Configuração Inicial

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
copy .env.example .env.local
```

Edite `.env.local` com suas chaves:

```env
# Supabase (https://app.supabase.com/project/_/settings/api)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui

# Google Gemini AI (https://ai.google.dev/)
VITE_GEMINI_API_KEY=sua_chave_gemini_aqui
```

> **⚠️ IMPORTANTE**: Nunca commite o arquivo `.env.local` no Git. Ele já está listado no `.gitignore`.

### 3. Executar Aplicação

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

---

## 🔒 Segurança

### Credenciais Protegidas

✅ **Implementado:** Todas as credenciais sensíveis agora usam variáveis de ambiente.

- Supabase URL e chaves NÃO estão mais no código-fonte
- Gemini API Key protegida
- Validação automática de configuração

### Rate Limiting

✅ **Implementado:** Proteção contra abuse da API do Gemini.

- Máximo de 10 requisições por minuto
- Feedback visual para o usuário
- Timeout de 10 segundos por requisição
- Validação de tamanho de prompt (máx. 500 caracteres)

---

## 📁 Estrutura do Projeto

```
nexus-agenda/
├── components/          # Componentes React
│   ├── BookingModal.tsx
│   ├── ContactsManager.tsx
│   ├── CreateModal.tsx
│   ├── EventCard.tsx
│   └── ...
├── hooks/              # Custom React Hooks
│   └── useRateLimit.ts # Rate limiting hook
├── services/           # Integrações externas
│   ├── geminiService.ts
│   └── supabaseClient.ts
├── types.ts            # TypeScript types
├── App.tsx             # Componente principal
├── .env.example        # Template de variáveis
└── .env.local          # Suas credenciais (não commitar!)
```

---

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

---

## 🔧 Tecnologias

- **React 19.2** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool
- **Supabase** - Backend/Database
- **Google Gemini AI** - IA generativa
- **TailwindCSS** - Styling (via CDN)

---

## 📝 Modo Demonstração

Se as variáveis de ambiente não estiverem configuradas, o app funciona em **modo demo**:

- ✅ Interface totalmente funcional
- ✅ Dados locais (não são salvos)
- ⚠️ IA e persistência desabilitadas

---

## ⚠️ Troubleshooting

### "Supabase não configurado"

Verifique se as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão corretas no `.env.local`.

### "Gemini API key não configurada"

Adicione `VITE_GEMINI_API_KEY` no `.env.local`.

### "Muitas requisições"

O rate limiting bloqueou temporariamente. Aguarde 1 minuto.

---

## 📈 Próximos Passos

### Sprint 2: Performance & Qualidade (Próxima)

- [ ] Otimizações de renderização (useMemo, useCallback)
- [ ] TypeScript strict mode
- [ ] Melhorar queries do Supabase

Ver [implementation_plan.md](file:///C:/Users/engti/.gemini/antigravity/brain/4e44dd83-d68c-4867-8978-f1fd8dd96cd2/implementation_plan.md) para roadmap completo.

---

## 🤝 Contribuindo

1. Nunca commite credenciais
2. Mantenha `.env.local` fora do Git
3. Teste mudanças localmente antes de commitar

---

**Desenvolvido com ❤️ usando Google AI Studio**
