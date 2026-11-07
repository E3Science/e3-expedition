$ErrorActionPreference = "Stop"
$workspace = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$serverRoot = Join-Path $workspace "server"

Write-Host "Building the local E3 class server..." -ForegroundColor Cyan
Push-Location $serverRoot
try {
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw "The multiplayer server build failed." }
} finally {
  Pop-Location
}

$address = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.InterfaceAlias -notmatch "Loopback|vEthernet" } |
  Sort-Object -Property InterfaceMetric |
  Select-Object -First 1 -ExpandProperty IPAddress

if (-not $address) { throw "No usable private-network IPv4 address was found." }

$serverProcess = Start-Process -FilePath "node.exe" -ArgumentList "dist/index.js" -WorkingDirectory $serverRoot -WindowStyle Hidden -PassThru
$clientProcess = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev", "--", "--host", "0.0.0.0") -WorkingDirectory $workspace -WindowStyle Hidden -PassThru

try {
  Start-Sleep -Seconds 2
  Write-Host ""
  Write-Host "Local E3 class game is running." -ForegroundColor Green
  Write-Host "Teacher:  http://localhost:8080" -ForegroundColor White
  Write-Host "Students: http://${address}:8080" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Students must be on the same local network. Allow Node.js on Private networks if Windows Firewall asks." -ForegroundColor Gray
  Write-Host "Keep this window open. Press Ctrl+C to stop both servers." -ForegroundColor Gray
  Wait-Process -Id $serverProcess.Id, $clientProcess.Id
} finally {
  foreach ($process in @($serverProcess, $clientProcess)) {
    if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force }
  }
}
