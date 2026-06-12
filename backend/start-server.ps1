# Start Njiani Backend Server
Write-Host "Starting Njiani Backend Server..." -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is running
$mongoService = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -eq 'Running') {
    Write-Host "✅ MongoDB service is running" -ForegroundColor Green
} else {
    Write-Host "⚠️  MongoDB service not found or not running" -ForegroundColor Yellow
    Write-Host "   Please ensure MongoDB is installed and running" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting server..." -ForegroundColor Cyan
Write-Host ""

# Start the server
node server.js





