$ErrorActionPreference = 'Continue'
$root = 'F:\Mobile Apps\ZSMS\school_management_systems'
Set-Location $root
Get-ChildItem -Directory -Force | ForEach-Object {
  $name = $_.Name
  if ($name -in @('node_modules', '.next', '.git', '.venv')) {
    Write-Output ("{0}: (skipped)" -f $name)
    return
  }
  $s = (Get-ChildItem -LiteralPath $_.FullName -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\node_modules\\' } |
    Measure-Object -Property Length -Sum).Sum
  if ($s -gt 5MB) {
    Write-Output ("{0}: {1:N0} MB" -f $name, ($s / 1MB))
  }
}
