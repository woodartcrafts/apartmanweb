$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$healthUrl = "http://localhost:3000/health"

Write-Output "[restart-api] Repository: $repoRoot"

# Free port 3000 first to avoid EADDRINUSE.
$portOwners = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique

if ($portOwners) {
  foreach ($processId in $portOwners) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Output "[restart-api] Stopped process on 3000: PID $processId"
    }
    catch {
      Write-Output "[restart-api] Could not stop PID ${processId}: $($_.Exception.Message)"
    }
  }
}
else {
  Write-Output "[restart-api] Port 3000 is already free"
}

# Start backend dev server in a separate PowerShell process.
$startArgs = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-Command", "Set-Location '$repoRoot'; npm run dev"
)

$proc = Start-Process -FilePath "powershell" -ArgumentList $startArgs -PassThru
Write-Output "[restart-api] Started backend process PID $($proc.Id)"

# Wait until health check responds OK or timeout.
$maxAttempts = 45
$attempt = 0

while ($attempt -lt $maxAttempts) {
  $attempt += 1
  Start-Sleep -Milliseconds 1000

  try {
    $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 3
    if ($resp.StatusCode -eq 200) {
      Write-Output "[restart-api] API OK 200 $($resp.Content)"
      Write-Output "[restart-api] Ready"
      exit 0
    }
  }
  catch {
    if ($proc.HasExited) {
      Write-Output "[restart-api] Backend process exited early (code: $($proc.ExitCode))"
      exit 1
    }
  }
}

Write-Output "[restart-api] Timed out waiting for API health response"
exit 1
