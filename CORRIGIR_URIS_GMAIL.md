# ⚠️ AÇÃO NECESSÁRIA - Corrigir URIs de Redirecionamento

## 🔴 Problema Crítico Identificado

As **URIs de redirecionamento** configuradas no Google Cloud Console estão apontando para o **projeto Supabase ERRADO**.

### Configuração Atual (INCORRETA) ❌
```
https://hxbleqzpwwaqvpqkxhmq.supabase.co/functions/v1/gmail-oauth-callback
```

### Configuração Correta ✅
```
https://erbmzqprftwpwyxywbvn.supabase.co/functions/v1/gmail-oauth-callback
```

---

## 📋 Como Corrigir

### 1. Acesse o Google Cloud Console
1. Vá para [Google Cloud Console](https://console.cloud.google.com)
2. Selecione o projeto **automan8n-465119**

### 2. Edite as Credenciais OAuth
1. No menu lateral, vá em **APIs e serviços** → **Credenciais**
2. Localize o **ID do cliente OAuth 2.0** que você criou
3. Clique no nome para editar

### 3. Atualize as URIs de Redirecionamento
**Remova:**
```
https://hxbleqzpwwaqvpqkxhmq.supabase.co/auth/v1/callback
https://hxbleqzpwwaqvpqkxhmq.supabase.co/functions/v1/gmail-oauth-callback
```

**Adicione:**
```
https://erbmzqprftwpwyxywbvn.supabase.co/functions/v1/gmail-oauth-callback
http://localhost:54321/functions/v1/gmail-oauth-callback
```

### 4. Salve as Alterações
Clique em **Salvar**

---

## ✅ O que já foi configurado

- ✅ Secrets `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` configurados no Supabase
- ✅ Arquivo `.env.local` criado com as variáveis de ambiente corretas
- ✅ Edge Functions `gmail-oauth-callback` e `send-email` deployadas
- ✅ Migration `006_gmail_oauth.sql` existe (tabela `user_email_accounts`)

---

## 🧪 Após Corrigir as URIs

Execute os seguintes testes:

### 1. Testar Conexão Gmail
```powershell
npm run dev
```
1. Acesse `http://localhost:3000`
2. Vá em **Integrações e apps** (sidebar)
3. Clique em **Conectar Gmail**
4. Autorize no popup do Google
5. Verifique mensagem de sucesso

### 2. Testar Envio de Email
1. Vá em **Campanhas**
2. Crie uma campanha de teste
3. Adicione seu email como contato
4. Envie um convite
5. Verifique:
   - ✅ Email chegou na caixa de entrada
   - ✅ Remetente é sua conta Gmail (não Resend)

### 3. Verificar Logs (Opcional)
```powershell
npx supabase functions logs gmail-oauth-callback
npx supabase functions logs send-email
```

---

## 📊 Status da Configuração

| Item | Status |
|------|--------|
| Google Cloud Console - Projeto criado | ✅ |
| Gmail API ativada | ✅ |
| Credenciais OAuth criadas | ✅ |
| **URIs de redirecionamento** | ❌ **PRECISA CORREÇÃO** |
| Secrets no Supabase | ✅ |
| Arquivo `.env.local` | ✅ |
| Edge Functions deployadas | ✅ |
| Migration aplicada | ⚠️ Verificar |

---

## 🚨 Importante

**A integração NÃO funcionará** até que as URIs de redirecionamento sejam corrigidas no Google Cloud Console. Esse é o único bloqueio restante!

Depois de corrigir, a integração Gmail estará 100% funcional. 🎉
