# Links zsms-mobile to an Expo account and creates the EAS project (required before cloud APK builds).
# Run from repo root: powershell -ExecutionPolicy Bypass -File scripts/link-expo.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "ZSMS Mobile — link to Expo / EAS" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  npm install
}

Write-Host "Step 1: Log in to Expo (opens browser or prompts for token)"
npx eas-cli login

Write-Host ""
Write-Host "Step 2: Create/link EAS project (writes projectId into app.json)"
npx eas-cli init

Write-Host ""
Write-Host "Done. Build an APK with:"
Write-Host "  npm run build:apk" -ForegroundColor Green
Write-Host ""
Write-Host "Or production APK:"
Write-Host "  npm run build:apk:prod" -ForegroundColor Green
