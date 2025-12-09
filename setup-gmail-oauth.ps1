# ============================================
# Script de Setup - Integração Gmail OAuth
# ============================================

Write-Host "`n🚀 SETUP DA INTEGRAÇÃO GMAIL OAUTH`n" -ForegroundColor Cyan

# Verificar se o usuário tem as credenciais
Write-Host "📋 Antes de continuar, você precisa:" -ForegroundColor Yellow
Write-Host "   1. Criar um projeto no Google Cloud Console" -ForegroundColor White
Write-Host "   2. Ativar a Gmail API" -ForegroundColor White
Write-Host "   3. Configurar a tela de consentimento OAuth" -ForegroundColor White
Write-Host "   4. Criar credenciais OAuth 2.0" -ForegroundColor White
Write-Host "   5. Adicionar as URIs de redirecionamento:" -ForegroundColor White
Write-Host "      - https://erbmzqprftwpwyxywbvn.supabase.co/functions/v1/gmail-oauth-callback" -ForegroundColor Cyan
Write-Host "      - http://localhost:54321/functions/v1/gmail-oauth-callback" -ForegroundColor Cyan
Write-Host ""

$continue = Read-Host "Você já criou as credenciais no Google Cloud Console? (s/n)"
if ($continue -ne "s" -and $continue -ne "S") {
    Write-Host "`n❌ Por favor, siga o guia em GMAIL_OAUTH_SETUP.md primeiro.`n" -ForegroundColor Red
    exit 1
}

# Solicitar credenciais
Write-Host "`n🔑 Digite as credenciais do Google Cloud Console:`n" -ForegroundColor Yellow

$clientId = Read-Host "Google Client ID"
$clientSecret = Read-Host "Google Client Secret" -AsSecureString
$clientSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret)
)

if ([string]::IsNullOrWhiteSpace($clientId) -or [string]::IsNullOrWhiteSpace($clientSecretPlain)) {
    Write-Host "`n❌ Client ID e Client Secret são obrigatórios!`n" -ForegroundColor Red
    exit 1
}

# Configurar secrets no Supabase
Write-Host "`n📤 Configurando secrets no Supabase...`n" -ForegroundColor Yellow

Write-Host "   Configurando GOOGLE_CLIENT_ID..." -ForegroundColor Cyan
npx supabase secrets set "GOOGLE_CLIENT_ID=$clientId"

Write-Host "   Configurando GOOGLE_CLIENT_SECRET..." -ForegroundColor Cyan
npx supabase secrets set "GOOGLE_CLIENT_SECRET=$clientSecretPlain"

# Criar/atualizar .env.local
Write-Host "`n📝 Configurando arquivo .env.local...`n" -ForegroundColor Yellow

$envContent = @"
VITE_SUPABASE_URL=https://erbmzqprftwpwyxywbvn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyYm16cXByZnR3cHd5eHl3YnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI1NTU5NzAsImV4cCI6MjA0ODEzMTk3MH0.Hx1dUDcqbkKyxQOLKYlRmqJJUQJVJJQJVJJQJVJJQJQ
VITE_GOOGLE_CLIENT_ID=$clientId
"@

Set-Content -Path ".env.local" -Value $envContent
Write-Host "   ✅ Arquivo .env.local criado/atualizado" -ForegroundColor Green

# Aplicar migrations
Write-Host "`n📊 Aplicando migrations no banco de dados...`n" -ForegroundColor Yellow
npx supabase db push

# Deploy Edge Functions
Write-Host "`n🚀 Fazendo deploy das Edge Functions...`n" -ForegroundColor Yellow

Write-Host "   Deploying gmail-oauth-callback..." -ForegroundColor Cyan
npx supabase functions deploy gmail-oauth-callback

Write-Host "   Deploying send-email..." -ForegroundColor Cyan
npx supabase functions deploy send-email

# Verificar configuração
Write-Host "`n✅ Verificando configuração final...`n" -ForegroundColor Green

Write-Host "📋 Secrets configurados:" -ForegroundColor Cyan
npx supabase secrets list

Write-Host "`n📋 Edge Functions deployadas:" -ForegroundColor Cyan
npx supabase functions list

Write-Host "`n🎉 SETUP CONCLUÍDO COM SUCESSO!`n" -ForegroundColor Green
Write-Host "📝 Próximos passos:" -ForegroundColor Yellow
Write-Host "   1. Execute: npm run dev" -ForegroundColor White
Write-Host "   2. Acesse: http://localhost:3000" -ForegroundColor White
Write-Host "   3. Vá em Integrações e apps → Conectar Gmail" -ForegroundColor White
Write-Host "   4. Teste enviando um email de campanha`n" -ForegroundColor White
