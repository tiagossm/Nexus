# ============================================
# NEXUS AGENDA - Setup Supabase Database
# ============================================

Write-Host ""
Write-Host "🎯 SETUP SUPABASE - NEXUS AGENDA" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Verifica se o arquivo SQL existe
if (-not (Test-Path "supabase-schema.sql")) {
  Write-Host "❌ Erro: arquivo supabase-schema.sql não encontrado" -ForegroundColor Red
  exit 1
}

Write-Host "📋 Para criar as tabelas no Supabase, você tem 3 opções:" -ForegroundColor Yellow
Write-Host ""

Write-Host "OPÇÃO 1 - VIA PAINEL WEB (MAIS FÁCIL) 🌐" -ForegroundColor Green
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "1. Abra: https://supabase.com/dashboard/project/hxbleqzpwwaqvpqkxhmq/sql" -ForegroundColor White
Write-Host "2. Copie o conteúdo de 'supabase-schema.sql'" -ForegroundColor White
Write-Host "3. Cole no SQL Editor e clique RUN" -ForegroundColor White
Write-Host ""

Write-Host "OPÇÃO 2 - VIA SUPABASE CLI 💻" -ForegroundColor Green
Write-Host "----------------------------" -ForegroundColor Gray
Write-Host "# Instale o CLI:" -ForegroundColor White
Write-Host "scoop bucket add supabase https://github.com/supabase/scoop-bucket.git" -ForegroundColor DarkGray
Write-Host "scoop install supabase" -ForegroundColor DarkGray
Write-Host ""
Write-Host "# Depois execute:" -ForegroundColor White
Write-Host "supabase login" -ForegroundColor DarkGray
Write-Host "supabase link --project-ref hxbleqzpwwaqvpqkxhmq" -ForegroundColor DarkGray
Write-Host "supabase db push" -ForegroundColor DarkGray
Write-Host ""

Write-Host "OPÇÃO 3 - VIA PSQL (SE JÁ TIVER INSTALADO) 🔧" -ForegroundColor Green
Write-Host "--------------------------------------------" -ForegroundColor Gray
Write-Host "# Você vai precisar da senha do Postgres (veja no painel Supabase)" -ForegroundColor White
$dbPassword = Read-Host "Cole a senha aqui (ou Enter para pular)"
if ($dbPassword) {
  $connectionString = "postgresql://postgres.$($dbPassword)@db.hxbleqzpwwaqvpqkxhmq.supabase.co:5432/postgres"
  Write-Host ""
  Write-Host "Execute:" -ForegroundColor White
  Write-Host "psql `"$connectionString`" -f supabase-schema.sql" -ForegroundColor DarkGray
}
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 DICA: A Opção 1 (painel web) é a mais rápida!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Quer que eu abra o SQL Editor do Supabase no navegador? (S/N)" -ForegroundColor Cyan
$answer = Read-Host

if ($answer -eq 'S' -or $answer -eq 's') {
  Start-Process "https://supabase.com/dashboard/project/hxbleqzpwwaqvpqkxhmq/sql"
  Write-Host ""
  Write-Host "✅ Abrindo navegador..." -ForegroundColor Green
  Write-Host "📋 Agora copie o conteúdo de 'supabase-schema.sql' e cole lá!" -ForegroundColor Yellow
    
  # Abre o arquivo no editor padrão pra facilitar
  code supabase-schema.sql
}

Write-Host ""
Write-Host "✨ Depois de executar o SQL, seu banco estará pronto!" -ForegroundColor Green
Write-Host ""
