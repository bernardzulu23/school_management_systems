$out = 'F:\Mobile Apps\ZSMS\_eas_inspect\out'
Write-Output '--- top-level dirs ---'
Get-ChildItem $out -Force -Directory | ForEach-Object {
  $s = (Get-ChildItem $_.FullName -Recurse -File -Force -EA SilentlyContinue | Measure-Object Length -Sum).Sum
  Write-Output ("{0}: {1:N1} MB (symlink={2})" -f $_.Name, ($s/1MB), $_.Attributes.ToString().Contains('ReparsePoint'))
}
Write-Output '--- checks ---'
Write-Output ("zsms-mobile/package.json: " + (Test-Path "$out\zsms-mobile\package.json"))
Write-Output ("zsms-mobile/node_modules: " + (Test-Path "$out\zsms-mobile\node_modules"))
Write-Output (".easignore present: " + (Test-Path "$out\.easignore"))
Write-Output ("zsms-mobile/.easignore: " + (Test-Path "$out\zsms-mobile\.easignore"))
Get-Content "$out\zsms-mobile\.easignore" -TotalCount 5 -EA SilentlyContinue
