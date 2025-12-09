# ✅ Integração Gmail OAuth - Instruções Finais

## 🎯 Status Atual

Tudo configurado com sucesso no projeto Supabase correto: **`hxbleqzpwwaqvpqkxhmq`**

### ✅ Completado:
- ✅ MCP do Supabase configurado e funcionando
- ✅ Projeto correto identificado: `hxbleqzpwwaqvpqkxhmq`
- ✅ Credenciais do banco atualizadas no `.env.local`
- ✅ Secrets `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` configurados
- ✅ Edge Functions `gmail-oauth-callback` e `send-email` deployadas
- ✅ Migration `006_gmail_oauth.sql` existe

---

## ⚠️ ÚLTIMA AÇÃO NECESSÁRIA

As URIs de redirecionamento no Google Cloud Console estão apontando para um projeto diferente. Você precisa corrigi-las:

### 📋 Como Corrigir

#### 1. Acesse o Google Cloud Console
1. Vá para [Google Cloud Console](https://console.cloud.google.com)
2. Selecione o projeto **automan8n-465119**

#### 2. Edite as Credenciais OAuth
1. No menu lateral, vá em **APIs e serviços** → **Credenciais**
2. Localize o **ID do cliente OAuth 2.0**
3. Clique no nome para editar

#### 3. Verifique/Adicione as URIs Corretas

As URIs devem ser:
```
https://hxbleqzpwwaqvpqkxhmq.supabase.co/functions/v1/gmail-oauth-callback
http://localhost:54321/functions/v1/gmail-oauth-callback
```

**Se houver URIs diferentes** (como `erbmzqprftwpwyxywbvn`), remova-as e adicione as corretas acima.

#### 4. Salve as Alterações

---

## 🧪 Testando a Integração

Após corrigir as URIs no Google Cloud Console:

### 1. Reinicie o Servidor (se não reiniciou ainda)
```powershell
# Pressione Ctrl+C
npm run dev
```

### 2. Teste a Conexão Gmail
1. Acesse `http://localhost:3000`
2. Vá em **Integrações e apps** (sidebar)
3. Clique em **Conectar Gmail**
4. Autorize no popup do Google
5. ✅ Verifique mensagem "Gmail conectado com sucesso!"

### 3. Teste o Envio de Email
1. Vá em **Campanhas**
2. Crie uma campanha de teste
3. Adicione seu email como destinatário
4. Envie um convite
5. ✅ Verifique que o email chegou
6. ✅ Verifique que o remetente é sua conta Gmail

---

## 📊 Configuração Final

| Item | Valor | Status |
|------|-------|--------|
| **Projeto Supabase** | `hxbleqzpwwaqvpqkxhmq` | ✅ |
| **Supabase URL** | `https://hxbleqzpwwaqvpqkxhmq.supabase.co` | ✅ |
| **Google Client ID** | `946842376170-t3g938li...` | ✅ |
| **Secrets no Supabase** | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET | ✅ |
| **Edge Functions** | gmail-oauth-callback, send-email | ✅ |
| **URIs no Google Cloud** | - | ⚠️ **Verificar/Corrigir** |

---

## 💡 Observações Importantes

1. **Projeto Correto**: O projeto Supabase correto é `hxbleqzpwwaqvpqkxhmq`, não `erbmzqprftwpwyxywbvn` (que estava configurado inicialmente por engano).

2. **Banco de Dados**: As credenciais do banco já foram corrigidas no `.env.local` - o app deve conectar normalmente agora.

3. **Gmail OAuth**: Após corrigir as URIs no Google Cloud Console, a integração estará 100% funcional.

4. **Aguardar Propagação**: Depois de corrigir as URIs, aguarde 1-2 minutos para que as alterações do Google sejam propagadas.

---

## 🎉 Pronto!

Após corrigir as URIs e testar, você terá:
- ✅ Banco de dados conectado
- ✅ Gmail OAuth funcional
- ✅ Envio de emails pela sua conta Gmail

**Tudo pronto para usar!** 🚀
