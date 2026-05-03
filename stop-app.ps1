# Farmer Agro Center - Application Stop Script
# This script stops all running frontend and backend servers

Write-Host "🛑 Stopping Farmer Agro Center Application..." -ForegroundColor Red
Write-Host ""

# Find and stop processes on port 3000 (Frontend)
Write-Host "Checking port 3000 (Frontend)..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($port3000) {
    $pid3000 = $port3000.OwningProcess
    Write-Host "   Stopping process on port 3000 (PID: $pid3000)..." -ForegroundColor Yellow
    Stop-Process -Id $pid3000 -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Frontend stopped" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  No process found on port 3000" -ForegroundColor Gray
}

# Find and stop processes on port 5000 (Backend)
Write-Host "Checking port 5000 (Backend)..." -ForegroundColor Yellow
$port5000 = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($port5000) {
    $pid5000 = $port5000.OwningProcess
    Write-Host "   Stopping process on port 5000 (PID: $pid5000)..." -ForegroundColor Yellow
    Stop-Process -Id $pid5000 -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Backend stopped" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  No process found on port 5000" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ All servers stopped successfully!" -ForegroundColor Green
Write-Host ""

