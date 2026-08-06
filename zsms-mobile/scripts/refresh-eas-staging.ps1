$ErrorActionPreference = 'Stop'
$env:NODE_OPTIONS = '--use-system-ca'

$root = 'F:\Mobile Apps\ZSMS\_eas_root'
$mobile = Join-Path $root 'zsms-mobile'
$realNm = 'F:\Mobile Apps\ZSMS\school_management_systems\zsms-mobile\node_modules'
$link = Join-Path $mobile 'node_modules'

# Refresh mobile sources without node_modules
$src = 'F:\Mobile Apps\ZSMS\school_management_systems\zsms-mobile'
if (Test-Path $link) { cmd /c "rmdir `"$link`"" }
# /MIR mirrors so deleted assets (e.g. old ic_launcher.webp) do not remain beside new .png icons
robocopy $src $mobile /MIR /XD node_modules .expo tools tools.localbuild android\.gradle android\build android\app\build .git /XF *.zip *.apk *.aab .env /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
# Extra safety: never ship duplicate launcher formats
Get-ChildItem -Recurse (Join-Path $mobile 'android\app\src\main\res') -Filter 'ic_launcher*.webp' -ErrorAction SilentlyContinue | Remove-Item -Force

Set-Content -Path (Join-Path $mobile '.env.local') -Value @"
EXPO_PUBLIC_API_BASE_URL=https://www.bluepeacktechnologies.com
EXPO_PUBLIC_WEB_BASE=bluepeacktechnologies.com
"@

Set-Content -Path (Join-Path $mobile '.easignore') -Value @"
node_modules/
.expo/
.env
.env.local
tools/
*.zip
*.apk
.git/
"@

Set-Content -Path (Join-Path $root '.easignore') -Value @"
zsms-mobile/node_modules/
zsms-mobile/.expo/
zsms-mobile/.env
zsms-mobile/.env.local
zsms-mobile/tools/
**/.git/
.git/
"@

# EAS Linux builders cannot read Windows file:// Gradle zips.
$wrapperProps = Join-Path $mobile 'android\gradle\wrapper\gradle-wrapper.properties'
Set-Content -Path $wrapperProps -Value @"
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-9.3.1-bin.zip
networkTimeout=60000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
"@

cmd /c "mklink /J `"$link`" `"$realNm`""
if (-not (Test-Path (Join-Path $link 'expo'))) { throw 'junction failed' }

Set-Location $root
git add -A
git -c user.email='eas@local' -c user.name='eas' commit -q -m 'refresh staging' --allow-empty
Write-Output 'staging refreshed'
Write-Output ("expo exists: " + (Test-Path (Join-Path $link 'expo\package.json')))
Write-Output ("gradle wrapper: " + (Select-String -Path $wrapperProps -Pattern 'distributionUrl').Line)
