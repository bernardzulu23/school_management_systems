$ErrorActionPreference = 'Stop'
$env:NODE_OPTIONS = '--use-system-ca'

$root = 'F:\Mobile Apps\ZSMS\_eas_root'
$mobileSrc = 'F:\Mobile Apps\ZSMS\school_management_systems\zsms-mobile'
$mobileDst = Join-Path $root 'zsms-mobile'

if (Test-Path $root) { Remove-Item $root -Recurse -Force }
New-Item -ItemType Directory -Force -Path $mobileDst | Out-Null

robocopy $mobileSrc $mobileDst /E /XD node_modules .expo tools tools.localbuild android\.gradle android\build android\app\build .git /XF *.zip *.apk *.aab .env /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null

Set-Content -Path (Join-Path $mobileDst '.env.local') -Value @"
EXPO_PUBLIC_API_BASE_URL=https://www.bluepeacktechnologies.com
EXPO_PUBLIC_WEB_BASE=bluepeacktechnologies.com
"@

# Minimal easignore at staging git root
Set-Content -Path (Join-Path $root '.easignore') -Value @"
zsms-mobile/node_modules/
zsms-mobile/.expo/
zsms-mobile/.env
zsms-mobile/.env.local
zsms-mobile/tools/
"@

Set-Location $root
git init -q
git add -A
git -c user.email='eas@local' -c user.name='eas' commit -q -m 'eas upload staging'
Write-Output 'staging ready'
Write-Output (git count-objects -v)
Get-ChildItem $mobileDst | Select-Object -ExpandProperty Name
