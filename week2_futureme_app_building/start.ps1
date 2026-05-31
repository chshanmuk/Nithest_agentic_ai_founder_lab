$env:PATH += ";C:\Program Files\nodejs"

if (-not (Test-Path "backend\.env")) {
    Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "Creating backend\.env file from template..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "Done! Please open backend\.env in VS Code and paste your GEMINI_API_KEY." -ForegroundColor Green
    Write-Host "Then, run this script again to start the server." -ForegroundColor Yellow
    Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
    exit
}

# Check if the key is still the default placeholder
$envContent = Get-Content "backend\.env" -Raw
if ($envContent -match "replace_with_your_gemini_api_key") {
    Write-Host "--------------------------------------------------------" -ForegroundColor Red
    Write-Host "ERROR: You haven't added your Gemini API key yet!" -ForegroundColor Red
    Write-Host "Please edit the backend\.env file and set GEMINI_API_KEY to your actual key." -ForegroundColor Yellow
    Write-Host "--------------------------------------------------------" -ForegroundColor Red
    exit
}

Write-Host "--------------------------------------------------------" -ForegroundColor Green
Write-Host "Starting FutureMe Backend Server on http://localhost:5000..." -ForegroundColor Green
Write-Host "--------------------------------------------------------" -ForegroundColor Green
cd backend
npm run dev
