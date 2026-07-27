$out = 'F:\Mobile Apps\ZSMS\_eas_inspect\out'
Write-Output ("exists: " + (Test-Path $out))
if (Test-Path $out) {
  Get-ChildItem $out -Force | Select-Object Name, Mode, Length
  $sum = (Get-ChildItem $out -Recurse -File -EA SilentlyContinue | Measure-Object Length -Sum).Sum
  Write-Output ("total MB: {0:N1}" -f ($sum / 1MB))
  Get-ChildItem $out -Directory -Force -EA SilentlyContinue | ForEach-Object {
    $s = (Get-ChildItem $_.FullName -Recurse -File -EA SilentlyContinue | Measure-Object Length -Sum).Sum
    if ($s -gt 1MB) {
      Write-Output ("{0}: {1:N1} MB" -f $_.Name, ($s / 1MB))
    }
  }
  # find largest files
  Get-ChildItem $out -Recurse -File -EA SilentlyContinue |
    Sort-Object Length -Descending |
    Select-Object -First 15 @{N='MB';E={[math]::Round($_.Length/1MB,1)}}, @{N='Path';E={$_.FullName.Replace($out, '.')}}
}
