# Gmail OAuth Integration - Guia de Configuração

Este guia mostra como configurar a integração Gmail OAuth para permitir que usuários enviem emails usando suas próprias contas Gmail.

## 📋 Pré-requisitos

- Conta Google (para Google Cloud Console)
- Projeto Supabase configurado
- Node.js e npm instalados

---

## 1️⃣ Configurar Google Cloud Console

### Criar Projeto

1. Acesse [Google Cloud Console](https://console.cloud.google.com)
2. No canto superior esquerdo, clique em "Selecionar projeto" → "Novo projeto"
3. Nome do projeto: `Nexus Agenda`
4. Clique em **Criar**

### Ativar Gmail API

1. No menu lateral, vá em **APIs e serviços** → **Biblioteca**
2. Procure por "Gmail API"
3. Clique em **Gmail API**
4. Clique em **ATIVAR**

### Configurar Tela de Consentimento OAuth

1. Vá em **APIs e serviços** → **Tela de consentimento OAuth**
2. Selecione **Externo** (a menos que você tenha Google Workspace)
3. Clique em **Criar**

**Informações do app:**
- **Nome do app**: Nexus Agenda
- **E-mail de suporte ao usuário**: Seu email
- **Logo do app**: (opcional)
- **Domínio do app**: (opcional)
- **E-mail do desenvolvedor**: Seu email

4. Clique em **Salvar e continuar**

**Escopos:**
1. Clique em **Adicionar ou remover escopos**
2. Procure e adicione os seguintes escopos:
   - `https://www.googleapis.com/auth/gmail.send` (Enviar emails)
   - `https://www.googleapis.com/auth/userinfo.email` (Ver endereço de email)
3. Clique em **Atualizar** → **Salvar e continuar**

**Usuários de teste:**
1. Clique em **Adicionar usuários**
2. Adicione seu email e de outros testadores
3. Clique em **Adicionar** → **Salvar e continuar**

4. Revise as informações e clique em **Voltar ao painel**

> ⚠️ **Importante**: Enquanto o app estiver em "Teste", apenas os emails adicionados como "Usuários de teste" poderão autorizar o app.

### Criar Credenciais OAuth

1. Vá em **APIs e serviços** → **Credenciais**
2. Clique em **Criar credenciais** → **ID do cliente OAuth**
3. **Tipo de aplicativo**: Aplicativo da Web
4. **Nome**: Nexus Agenda Web

**URIs de redirecionamento autorizados:**
Adicione as seguintes URIs (uma por linha):
```
https://hxbleqzpwwaqvpqkxhmq.supabase.co/functions/v1/gmail-oauth-callback
http://localhost:54321/functions/v1/gmail-oauth-callback
```

5. Clique em **Criar**
6. **COPIE** o **ID do cliente** e o **Código secreto do cliente** (você vai precisar)

---

## 2️⃣ Configurar Supabase

### Adicionar Secrets no Supabase

Abra o PowerShell na pasta do projeto e execute:

```powershell
# Substitua pelos valores copiados do Google Cloud Console
npx supabase secrets set GOOGLE_CLIENT_ID="SEU_CLIENT_ID.apps.googleusercontent.com" --project-ref hxbleqzpwwaqvpqkxhmq

npx supabase secrets set GOOGLE_CLIENT_SECRET="SEU_CLIENT_SECRET" --project-ref hxbleqzpwwaqvpqkxhmq
```

### Deploy das Edge Functions

```powershell
# Deploy da função de callback OAuth
npx supabase functions deploy gmail-oauth-callback --project-ref hxbleqzpwwaqvpqkxhmq

# Deploy da função de envio de email (atualizada)
npx supabase functions deploy send-email --project-ref hxbleqzpwwaqvpqkxhmq
```

---

## 3️⃣ Configurar Frontend

### Criar arquivo .env.local

Na **raiz do projeto**, crie ou edite o arquivo `.env.local`:

```env
VITE_SUPABASE_URL=https://hxbleqzpwwaqvpqkxhmq.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
VITE_GOOGLE_CLIENT_ID=SEU_CLIENT_ID.apps.googleusercontent.com
```

> 💡 **Dica**: O `.env.local` já está no `.gitignore`, então não será commitado.

---

## 4️⃣ Testar a Integração

### Conectar Gmail

1. Execute o app: `npm run dev`
2. Acesse: `http://localhost:3000`
3. Vá na sidebar → **Integrações e apps**
4. Localize o card **Gmail (Envio de Emails)**
5. Clique em **Conectar Gmail**
6. Uma janela popup do Google será aberta
7. Selecione sua conta
8. Clique em **Continuar** (pode aparecer aviso de "App não verificado", clique em Avançado → Ir para Nexus Agenda)
9. Autorize os escopos solicitados
10. A janela fechará automaticamente e você verá "Gmail conectado com sucesso!"

### Enviar Email de Teste

1. Vá em **Campanhas** no sidebar
2. Crie uma nova campanha ou use uma existente
3. Adicione um contato com seu email de teste
4. Envie um convite
5. Verifique:
   - ✅ O log no console deve mostrar: `Sending via Gmail from seu-email@gmail.com...`
   - ✅ O email deve chegar na caixa de entrada
   - ✅ O remetente deve ser sua conta Gmail (não `onboarding@resend.dev`)

---

## 🔍 Verificar Logs

Para ver os logs das Edge Functions:

```powershell
# Ver logs da função de envio
npx supabase functions logs send-email --project-ref hxbleqzpwwaqvpqkxhmq

# Ver logs da função de callback OAuth
npx supabase functions logs gmail-oauth-callback --project-ref hxbleqzpwwaqvpqkxhmq
```

---

## 🚨 Troubleshooting

### Erro: "Access blocked: This app's request is invalid"

**Causa**: URI de redirecionamento não configurada corretamente.

**Solução**:
1. Volte no Google Cloud Console → Credenciais
2. Edite o OAuth Client ID
3. Verifique se a URI está **exatamente** assim:
   ```
   https://hxbleqzpwwaqvpqkxhmq.supabase.co/functions/v1/gmail-oauth-callback
   ```

### Erro: "GOOGLE_CLIENT_ID not configured"

**Causa**: Variável de ambiente não configurada no frontend.

**Solução**:
1. Verifique se o arquivo `.env.local` existe na raiz
2. Confirme que `VITE_GOOGLE_CLIENT_ID` está definido
3. Reinicie o servidor (`Ctrl+C` → `npm run dev`)

### Email não chega

**Possíveis causas**:
1. **Caixa de Spam**: Verifique a pasta de spam
2. **Conta não conectada**: Vá em Integrações e verifique se o Gmail está "Conectado"
3. **Token expirado**: A função renova automaticamente, mas veja os logs para confirmar

### Erro: "Failed to refresh token"

**Causa**: Refresh token inválido ou secrets não configurados.

**Solução**:
1. Desconecte e reconecte a conta Gmail
2. Verifique se os secrets estão corretos no Supabase:
   ```powershell
   npx supabase secrets list --project-ref hxbleqzpwwaqvpqkxhmq
   ```

---

## 📊 Limites do Gmail API

### Modo de Teste (App não verificado)
- ✅ Pode ter até **100 usuários de teste**
- ✅ Cada conta pode enviar ~**100 emails/dia**
- ⚠️ Tokens expiram após **7 dias de inatividade**

### Modo Produção (App verificado)
Para publicar para todos os usuários (sem limite de testadores):

1. No Google Cloud Console, vá em **Tela de consentimento OAuth**
2. Clique em **Publicar app**
3. Preencha o formulário de verificação:
   - Política de privacidade
   - Termos de serviço
   - Vídeo demo do app
4. Submeta para revisão (pode levar 3-5 dias úteis)

**Limites após verificação**:
- Contas Gmail gratuitas: ~**500 emails/dia**
- Google Workspace: ~**2000 emails/dia**

---

## 🎯 Como Funciona (Fluxo Técnico)

### 1. Conexão (OAuth Flow)
```
Usuário clica "Conectar Gmail"
  ↓
Frontend redireciona para Google OAuth
  ↓
Google pede autorização ao usuário
  ↓
Google redireciona para gmail-oauth-callback com código
  ↓
Edge Function troca código por tokens (access + refresh)
  ↓
Tokens salvos em user_email_accounts
  ↓
Janela fecha, "Gmail conectado!" ✅
```

### 2. Envio de Email
```
Frontend chama send-email com { to, subject, html }
  ↓
Edge Function verifica se existe conta Gmail conectada
  ↓
SIM → Verifica se token expirou
  ↓
  Se expirou: Renova com refresh_token
  ↓
  Envia via Gmail API
  ↓
NÃO → Fallback para Resend
```

---

## 📚 Recursos Adicionais

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth 2.0 for Web Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## ✅ Checklist de Configuração

- [ ] Projeto criado no Google Cloud Console
- [ ] Gmail API ativada
- [ ] Tela de consentimento OAuth configurada
- [ ] Usuários de teste adicionados
- [ ] Credenciais OAuth criadas
- [ ] `GOOGLE_CLIENT_ID` copiado
- [ ] `GOOGLE_CLIENT_SECRET` copiado
- [ ] Secrets adicionados no Supabase
- [ ] Edge Functions deployed
- [ ] `.env.local` criado com `VITE_GOOGLE_CLIENT_ID`
- [ ] App testado localmente
- [ ] Gmail conectado com sucesso
- [ ] Email de teste enviado e recebido

---

**Dúvidas?** Revise os logs com `npx supabase functions logs` ou consulte a documentação oficial do Google.
