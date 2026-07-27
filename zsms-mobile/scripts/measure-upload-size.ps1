$ErrorActionPreference = 'Continue'
$root = 'F:\Mobile Apps\ZSMS\school_management_systems\zsms-mobile'
Set-Location $root
Get-ChildItem -Force | ForEach-Object {
  if ($_.Name -eq 'node_modules') {
    Write-Output 'node_modules: (present, skipped measure)'
    return
  }
  if ($_.PSIsContainer) {
    $s = (Get-ChildItem -LiteralPath $_.FullName -Recurse -File -ErrorAction SilentlyContinue |
      Measure-Object -Property Length -Sum).Sum
    Write-Output ("{0}: {1:N1} MB" -f $_.Name, ($s / 1MB))
  } else {
    Write-Output ("{0}: {1:N2} MB" -f $_.Name, ($_.Length / 1MB))
  }
}
Write-Output '---'
# Also check if EAS packages from git root
Write-Output ("git toplevel: " + (git rev-parse --show-toplevel 2>$null))
