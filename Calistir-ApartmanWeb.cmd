@echo off
setlocal

cd /d "%~dp0"
echo [ApartmanWeb] Klasor: %CD%
echo [ApartmanWeb] API yeniden baslatiliyor ve health kontrolu yapiliyor...
call npm run restart:api
if errorlevel 1 (
  echo [ApartmanWeb] restart:api hata kodu dondu. Health tekrar kontrol ediliyor...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing 'http://localhost:3000/health' -TimeoutSec 8; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
  if errorlevel 1 (
    echo [ApartmanWeb] API baslatma basarisiz. Bu pencereyi kapatmadan hatayi kontrol edin.
    pause
    exit /b 1
  )
  echo [ApartmanWeb] API ayakta gorunuyor. Devam ediliyor...
)

echo [ApartmanWeb] Frontend baslatiliyor (yeni pencere)...
start "apartmanweb-frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev:local"

echo [ApartmanWeb] Tarayici aciliyor: http://localhost:5173
timeout /t 2 >nul
start "" "http://localhost:5173"

echo [ApartmanWeb] Hazir. Bu pencereyi kapatabilirsiniz.
pause