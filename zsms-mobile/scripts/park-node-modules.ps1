cmd /c "taskkill /F /PID 28504 /T 2>nul"
$src = "F:\Mobile Apps\ZSMS\school_management_systems\zsms-mobile\node_modules"
$dst = "F:\Mobile Apps\ZSMS\_nm_zsms_mobile_backup"
if (Test-Path $dst) {
  Write-Output "backup already exists"
} elseif (Test-Path $src) {
  Move-Item -LiteralPath $src -Destination $dst -Force
  Write-Output "moved node_modules to backup"
} else {
  Write-Output "node_modules already absent"
}
Write-Output ("nm in project: " + (Test-Path $src))
Write-Output ("nm backup: " + (Test-Path $dst))
