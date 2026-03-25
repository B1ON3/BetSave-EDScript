$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($process) {
    Stop-Process -Id $process.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "Killed process $($process.OwningProcess)"
} else {
    Write-Host "No process found on port 3000"
}
