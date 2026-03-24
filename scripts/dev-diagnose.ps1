$ErrorActionPreference = "Stop"

Write-Output "=== ApartmanWeb Dev Doctor ==="
Write-Output "Time: $(Get-Date -Format s)"
Write-Output "PWD : $((Get-Location).Path)"
Write-Output ""

function Show-Section([string]$title) {
  Write-Output "--- $title ---"
}

function Try-Run([scriptblock]$block, [string]$failMessage) {
  try {
    $global:LASTEXITCODE = 0
    & $block
  } catch {
    Write-Output "[ERR] $failMessage"
    Write-Output $_.Exception.Message
  }
}

Show-Section "Runtime"
Try-Run { node -v } "node version okunamadi"
Try-Run { npm -v } "npm version okunamadi"
Write-Output ""

Show-Section "Env"
$jwt = $env:JWT_SECRET
$db = $env:DATABASE_URL
if ([string]::IsNullOrWhiteSpace($jwt)) {
  Write-Output "[WARN] JWT_SECRET ortam degiskeni bos"
} else {
  Write-Output "[OK] JWT_SECRET ayarli"
}
if ([string]::IsNullOrWhiteSpace($db)) {
  Write-Output "[WARN] DATABASE_URL ortam degiskeni bos"
} else {
  Write-Output "[OK] DATABASE_URL ayarli"
}
if (Test-Path ".env") {
  Write-Output "[OK] .env bulundu"
} else {
  Write-Output "[WARN] .env bulunamadi"
}
Write-Output ""

Show-Section "Port Check"
foreach ($port in @(3000, 5173)) {
  $procIds = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
  if ($procIds) {
    $joined = ($procIds | ForEach-Object { $_.ToString() }) -join ","
    Write-Output "[WARN] Port $port dolu (PID: $joined)"
  } else {
    Write-Output "[OK] Port $port bos"
  }
}
Write-Output ""

Show-Section "Prisma"
if (Test-Path "prisma\schema.prisma") {
  Write-Output "[OK] prisma/schema.prisma mevcut"
} else {
  Write-Output "[ERR] prisma/schema.prisma bulunamadi"
}
Try-Run {
  npx prisma generate | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "prisma generate cikis kodu: $LASTEXITCODE" }
  Write-Output "[OK] prisma generate tamam"
} "prisma generate basarisiz"
Write-Output ""

Show-Section "Build Smoke"
Try-Run {
  npm run build | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "backend build cikis kodu: $LASTEXITCODE" }
  Write-Output "[OK] backend build basarili"
} "backend build basarisiz"
if (Test-Path "frontend\package.json") {
  Try-Run {
    Push-Location frontend
    try {
      npm run build | Out-Null
      if ($LASTEXITCODE -ne 0) { throw "frontend build cikis kodu: $LASTEXITCODE" }
      Write-Output "[OK] frontend build basarili"
    } finally {
      Pop-Location
    }
  } "frontend build basarisiz"
} else {
  Write-Output "[WARN] frontend/package.json yok"
}
Write-Output ""

Show-Section "API Health"
Try-Run {
  $res = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 3
  Write-Output "[OK] API health: $($res.StatusCode)"
} "API health endpoint erisilemedi"
Write-Output ""

Write-Output "=== Ozet ==="
Write-Output "1) Port dolu ise: npm run kill:3000"
Write-Output "2) API icin: npm run restart:api"
Write-Output "3) Frontend icin: cd frontend; npm run dev -- --host"
