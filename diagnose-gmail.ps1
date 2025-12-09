# ============================================
# Script de Diagnóstico - Integração Gmail OAuth
# ============================================

Write-Host "`n🔍 DIAGNÓSTICO DA INTEGRAÇÃO GMAIL`n" -ForegroundColor Cyan

# 1. Verificar projeto Supabase
Write-Host "1️⃣ Verificando projeto Supabase..." -ForegroundColor Yellow
$projectRef = "erbmzqprftwpwyxywbvn"
Write-Host "   Project Ref: $projectRef" -ForegroundColor Green

# 2. Verificar Edge Functions
Write-Host "`n2️⃣ Listando Edge Functions..." -ForegroundColor Yellow
npx supabase functions list --project-ref $projectRef

# 3. Verificar Secrets
Write-Host "`n3️⃣ Verificando Secrets configurados..." -ForegroundColor Yellow
npx supabase secrets list --project-ref $projectRef

# 4. Verificar arquivo .env.local
Write-Host "`n4️⃣ Verificando arquivo .env.local..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "   ✅ Arquivo .env.local encontrado" -ForegroundColor Green
    $envContent = Get-Content ".env.local" -Raw
    if ($envContent -match "VITE_GOOGLE_CLIENT_ID") {
        Write-Host "   ✅ VITE_GOOGLE_CLIENT_ID configurado" -ForegroundColor Green
    }
    else {
        Write-Host "   ❌ VITE_GOOGLE_CLIENT_ID NÃO encontrado" -ForegroundColor Red
    }
}
else {
    Write-Host "   ❌ Arquivo .env.local NÃO encontrado" -ForegroundColor Red
}

# 5. Verificar migrations aplicadas
Write-Host "`n5️⃣ Verificando migrations..." -ForegroundColor Yellow
$migrationFile = "supabase\migrations\006_gmail_oauth.sql"
if (Test-Path $migrationFile) {
    Write-Host "   ✅ Migration 006_gmail_oauth.sql existe" -ForegroundColor Green
}
else {
    Write-Host "   ❌ Migration 006_gmail_oauth.sql NÃO encontrada" -ForegroundColor Red
}

# 6. Verificar Edge Functions locais
Write-Host "`n6️⃣ Verificando Edge Functions locais..." -ForegroundColor Yellow
$functions = @("gmail-oauth-callback", "send-email")
foreach ($func in $functions) {
    $funcPath = "supabase\functions\$func\index.ts"
    if (Test-Path $funcPath) {
        Write-Host "   ✅ $func existe" -ForegroundColor Green
    }
    else {
        Write-Host "   ❌ $func NÃO encontrada" -ForegroundColor Red
    }
}

# 7. Verificar logs recentes
Write-Host "`n7️⃣ Verificando logs recentes das Edge Functions..." -ForegroundColor Yellow
Write-Host "   📋 Logs de gmail-oauth-callback:" -ForegroundColor Cyan
npx supabase functions logs gmail-oauth-callback --project-ref $projectRef --limit 5

Write-Host "`n   📋 Logs de send-email:" -ForegroundColor Cyan
npx supabase functions logs send-email --project-ref $projectRef --limit 5

Write-Host "`n✅ Diagnóstico concluído!`n" -ForegroundColor Green
