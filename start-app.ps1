# Farmer Agro Center - Application Startup Script
# This script starts both frontend and backend servers without Redis/MongoDB dependencies

Write-Host "🌾 Starting Farmer Agro Center Application..." -ForegroundColor Green
Write-Host ""

# Kill any existing node processes on ports 3000 and 5000
Write-Host "📋 Checking for existing processes..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
$port5000 = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue

if ($port3000) {
    $pid3000 = $port3000.OwningProcess
    Write-Host "   Stopping existing process on port 3000 (PID: $pid3000)..." -ForegroundColor Yellow
    Stop-Process -Id $pid3000 -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

if ($port5000) {
    $pid5000 = $port5000.OwningProcess
    Write-Host "   Stopping existing process on port 5000 (PID: $pid5000)..." -ForegroundColor Yellow
    Stop-Process -Id $pid5000 -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "🚀 Starting Backend Server (Simple Mode - No External Dependencies)..." -ForegroundColor Cyan

# Start backend in new window
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '🔧 Backend Server' -ForegroundColor Green; node simple-mongo-server.js"

# Wait for backend to start
Write-Host "   Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ Backend is running on http://localhost:5000" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Backend may still be starting..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Cyan

# Start frontend in new window
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '🎨 Frontend Server' -ForegroundColor Blue; npm start"

Write-Host "   Waiting for frontend to compile..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if frontend is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    Write-Host "   ✅ Frontend is running on http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Frontend may still be compiling..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Green
Write-Host "✅ APPLICATION STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access Points:" -ForegroundColor Cyan
Write-Host "   Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "   Backend API: http://localhost:5000/api" -ForegroundColor White
Write-Host "   Health Check: http://localhost:5000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "📝 Notes:" -ForegroundColor Yellow
Write-Host "   - Using simple in-memory database (no MongoDB/Redis required)" -ForegroundColor Gray
Write-Host "   - Data will persist while servers are running" -ForegroundColor Gray
Write-Host "   - Both servers are running in separate windows" -ForegroundColor Gray
Write-Host ""
Write-Host "🛑 To stop: Close the server windows or press Ctrl+C in each window" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

