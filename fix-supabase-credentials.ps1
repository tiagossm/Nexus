# ============================================
# Script para Obter Credenciais do Supabase
# ============================================

Write-Host "`n🔑 OBTENDO CREDENCIAIS DO SUPABASE`n" -ForegroundColor Cyan

$projectRef = "erbmzqprftwpwyxywbvn"

Write-Host "📋 Para obter as credenciais do Supabase:`n" -ForegroundColor Yellow

Write-Host "1️⃣ Acesse o Dashboard do Supabase:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/$projectRef/settings/api`n" -ForegroundColor Cyan

Write-Host "2️⃣ Copie as seguintes informações:`n" -ForegroundColor White
Write-Host "   • Project URL (deve ser: https://$projectRef.supabase.co)" -ForegroundColor Gray
Write-Host "   • anon public key (começa com 'eyJ...')`n" -ForegroundColor Gray

Write-Host "3️⃣ Cole as credenciais abaixo:`n" -ForegroundColor White

$supabaseUrl = Read-Host "VITE_SUPABASE_URL"
$supabaseAnonKey = Read-Host "VITE_SUPABASE_ANON_KEY"

if ([string]::IsNullOrWhiteSpace($supabaseUrl) -or [string]::IsNullOrWhiteSpace($supabaseAnonKey)) {
    Write-Host "`n❌ Credenciais não podem estar vazias!`n" -ForegroundColor Red
    exit 1
}

# Validar URL
if ($supabaseUrl -notmatch "^https://$projectRef\.supabase\.co$") {
    Write-Host "`n⚠️ Aviso: A URL não corresponde ao projeto esperado ($projectRef)" -ForegroundColor Yellow
    $continue = Read-Host "Continuar mesmo assim? (s/n)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 1
    }
}

# Criar/atualizar .env.local
$envContent = @"
VITE_SUPABASE_URL=$supabaseUrl
VITE_SUPABASE_ANON_KEY=$supabaseAnonKey
VITE_GOOGLE_CLIENT_ID=946842376170-t3g938li7qkl86plgch45hok38iiafme.apps.googleusercontent.com
"@

Set-Content -Path ".env.local" -Value $envContent

Write-Host "`n✅ Arquivo .env.local atualizado com sucesso!`n" -ForegroundColor Green

Write-Host "📝 Conteúdo do .env.local:" -ForegroundColor Cyan
Write-Host "VITE_SUPABASE_URL=$supabaseUrl" -ForegroundColor Gray
Write-Host "VITE_SUPABASE_ANON_KEY=$($supabaseAnonKey.Substring(0, 20))..." -ForegroundColor Gray
Write-Host "VITE_GOOGLE_CLIENT_ID=946842376170-t3g938li7qkl86plgch45hok38iiafme.apps.googleusercontent.com`n" -ForegroundColor Gray

Write-Host "🔄 Agora reinicie o servidor de desenvolvimento:" -ForegroundColor Yellow
Write-Host "   1. Pressione Ctrl+C no terminal onde o npm run dev está rodando" -ForegroundColor White
Write-Host "   2. Execute novamente: npm run dev`n" -ForegroundColor White

Write-Host "✨ Pronto! O banco de dados deve conectar corretamente agora.`n" -ForegroundColor Green
