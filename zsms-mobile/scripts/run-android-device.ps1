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

$deviceLine = (adb devices | Select-String "device$" | Where-Object { $_ -notmatch "List of devices" } | Select-Object -First 1)
if (-not $deviceLine) {
  throw "No Android device connected. Enable USB debugging and run adb devices."
}
$serial = ($deviceLine -split "\s+")[0].Trim()
$model = (adb -s $serial shell getprop ro.product.model 2>$null).Trim()
if (-not $model) { $model = $serial }
Write-Host "Using device: $model ($serial)"
$env:ANDROID_SERIAL = $serial

npx expo run:android --device $model
if ($LASTEXITCODE -ne 0) {
  Write-Host "Expo device picker failed; installing via Gradle on $serial..."
  Set-Location (Join-Path $root "android")
  .\gradlew.bat app:installDebug -PreactNativeArchitectures=arm64-v8a -PreactNativeDevServerPort=8081
  Set-Location $root
}
