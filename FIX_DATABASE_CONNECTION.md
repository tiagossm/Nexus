# ⚠️ PROBLEMA: Credenciais do Supabase Incorretas

## 🔴 Erro Identificado

O erro `ERR_NAME_NOT_RESOLVED` ocorre porque a **chave anônima (ANON_KEY) no arquivo `.env.local` está incorreta**.

### Sintomas
```
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
erbmzqprftwpwyxywbvn...
```

### Causa
O arquivo `.env.local` contém uma chave placeholder inválida que não permite autenticação com o Supabase.

---

## ✅ Solução Rápida (5 minutos)

### Opção 1: Script Automatizado (Recomendado)
```powershell
.\fix-supabase-credentials.ps1
```

O script vai:
1. Pedir que você acesse o dashboard do Supabase
2. Solicitar as credenciais corretas
3. Atualizar o `.env.local` automaticamente

### Opção 2: Manual

#### 1. Obter Credenciais do Supabase
1. Acesse: https://supabase.com/dashboard/project/erbmzqprftwpwyxywbvn/settings/api
2. Copie:
   - **Project URL**: `https://erbmzqprftwpwyxywbvn.supabase.co`
   - **anon public key**: (chave que começa com `eyJ...`)

#### 2. Atualizar `.env.local`
Edite o arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://erbmzqprftwpwyxywbvn.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_AQUI
VITE_GOOGLE_CLIENT_ID=946842376170-t3g938li7qkl86plgch45hok38iiafme.apps.googleusercontent.com
```

#### 3. Reiniciar Servidor
```powershell
# Pressione Ctrl+C no terminal
# Depois execute novamente:
npm run dev
```

---

## 🔍 Como Verificar se Funcionou

Após reiniciar o servidor, abra o console do navegador (F12):
- ✅ **Sucesso**: Não deve haver mais erros `ERR_NAME_NOT_RESOLVED`
- ✅ **Sucesso**: Dados carregam normalmente (eventos, campanhas, templates)

---

## 📋 Checklist

- [ ] Acessei o dashboard do Supabase
- [ ] Copiei a **Project URL** correta
- [ ] Copiei a **anon public key** correta
- [ ] Atualizei o arquivo `.env.local`
- [ ] Reiniciei o servidor (`Ctrl+C` + `npm run dev`)
- [ ] Verifiquei que não há mais erros no console

---

## 💡 Nota Importante

A chave anônima (anon key) é **pública** e pode ser compartilhada no frontend. Ela é protegida pelas Row Level Security (RLS) policies do Supabase, então não há risco de segurança em usá-la no código do cliente.
