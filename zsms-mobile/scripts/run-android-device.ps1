# Run from zsms-mobile: npm run android:device
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$cacheDir = Join-Path $env:USERPROFILE ".gradle\zsms-project-cache"
New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null

node scripts/patch-rn-gradle.js

$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

Write-Host "Devices:"
adb devices

Write-Host "`nBuilding and installing on physical device (not emulator)..."
$env:GRADLE_OPTS = "-Dorg.gradle.project.cache.dir=$cacheDir"
npx expo run:android --device
