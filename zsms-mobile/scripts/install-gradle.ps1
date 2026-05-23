# Downloads Gradle and points the wrapper at a local file:// URL (fixes Windows SSL/PKIX errors).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/install-gradle.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$tools = Join-Path $root "tools"
$zip = Join-Path $tools "gradle-8.10.2-all.zip"
$url = "https://services.gradle.org/distributions/gradle-8.10.2-all.zip"
$wrapperProps = Join-Path $root "android\gradle\wrapper\gradle-wrapper.properties"

New-Item -ItemType Directory -Force -Path $tools | Out-Null

if (-not (Test-Path $zip) -or (Get-Item $zip).Length -lt 200000000) {
  Write-Host "Downloading Gradle 8.10.2 (~218 MB)..."
  if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
    & curl.exe --ssl-no-revoke -L -o $zip $url
  } else {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  }
}

if (-not (Test-Path $zip)) {
  Write-Error "Download failed. Save manually from:`n$url`nto:`n$zip"
}

$resolved = (Resolve-Path $zip).Path.Replace("\", "/")
if ($resolved -match "^([A-Za-z]):/(.*)$") {
  $fileUrl = "file\:/// $($Matches[1]):/$($Matches[2] -replace ' ','%20')" -replace ' ',''
} else {
  Write-Error "Unexpected path: $resolved"
}

$props = @"
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=$fileUrl
networkTimeout=60000
validateDistributionUrl=false
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
"@

Set-Content -Path $wrapperProps -Value $props.TrimEnd()
Write-Host "OK: $zip"
Write-Host "OK: $wrapperProps"
Write-Host "Next: npx expo run:android"
