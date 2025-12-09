# 🚀 Guia Rápido: Executar Migration no Supabase

## ✅ O que já foi feito:

1. ✅ Scoop instalado
2. ✅ Pasta `supabase/migrations/` criada
3. ✅ Migration copiada para o local correto

---

## 📋 Próximos Passos:

### 1. **Feche e reabra o PowerShell** (para carregar o Scoop no PATH)

### 2. **Instale o Supabase CLI:**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 3. **Verifique a instalação:**
```powershell
supabase --version
```

### 4. **Faça login no Supabase:**
```powershell
supabase login
```
Isso vai abrir o navegador para você autorizar.

### 5. **Conecte ao seu projeto:**
```powershell
supabase link --project-ref hxbleqzpwwaqvpqkxhmq
```

### 6. **Execute a migration:**
```powershell
supabase db push
```

---

## 🎯 Alternativa RÁPIDA (se não quiser instalar CLI):

**Apenas copie e cole no SQL Editor:**

1. Acesse: https://supabase.com/dashboard/project/hxbleqzpwwaqvpqkxhmq/sql
2. Copie TODO o conteúdo de `migrations/001_availability_system.sql`
3. Cole no editor
4. Clique "RUN"

✅ **Pronto em 2 minutos!**

---

## 📁 Estrutura de Arquivos:

```
Nexus Agenda/
├── migrations/
│   └── 001_availability_system.sql  (original)
└── supabase/
    └── migrations/
        └── 001_availability_system.sql  (copiado para CLI)
```

---

## ⚠️ Problema Comum:

Se `scoop` não for reconhecido após reiniciar o PowerShell:
1. Feche TODOS os terminais
2. Abra um novo PowerShell
3. Tente `scoop --version`
