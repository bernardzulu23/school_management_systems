# ZSMS Curriculum Studio — verify & prepare (does not overwrite existing code)
# Usage (from repo root): powershell -File scripts/setup-curriculum-studio.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path (Join-Path $Root "package.json"))) {
  $Root = Get-Location
}
Set-Location $Root

Write-Host "ZSMS Curriculum Studio Setup"
Write-Host "============================"
Write-Host "Root: $Root"
Write-Host ""

$script:Ok = 0
$script:Fail = 0

function Check-File([string]$Rel) {
  $path = Join-Path $Root $Rel
  if (Test-Path $path -PathType Leaf) {
    Write-Host "  OK  $Rel"
    $script:Ok++
  } else {
    Write-Host "  MISSING  $Rel"
    $script:Fail++
  }
}

Write-Host "1. Dependencies (pdf-parse, docx)..."
npm install pdf-parse docx --no-fund --no-audit
Write-Host ""

Write-Host "2. Ensuring directories..."
@(
  "lib/curriculum",
  "lib/ai",
  "app/api/curriculum/scheme",
  "components/curriculum",
  "data/curriculum/form1-4",
  "data/curriculum/form1-6",
  "scripts",
  "Syllabus"
) | ForEach-Object {
  $dir = Join-Path $Root $_
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
}
Write-Host "  OK  directories ready"
Write-Host ""

Write-Host "3. Verifying implementation files..."
@(
  "lib/curriculum/syllabusParser.ts",
  "lib/curriculum/syllabusParsing.ts",
  "lib/curriculum/schemeOfWorkGenerator.ts",
  "lib/curriculum/schemeOfWorkExport.ts",
  "lib/curriculum/jsonCurriculumLoader.ts",
  "lib/curriculum/resolveCurriculum.ts",
  "lib/ai/schemeOfWorkWordExporter.ts",
  "app/api/curriculum/scheme/route.ts",
  "components/curriculum/CurriculumStudio.jsx",
  "app/dashboard/teacher/schemes/page.js",
  "scripts/ingest-syllabi.ts",
  "data/curriculum/form1-4/chemistry-form1-4.json",
  "data/curriculum/form1-4/physics-form1-4.json",
  "data/curriculum/form1-4/biology-form1-4.json",
  "docs/CURRICULUM_STUDIO.md"
) | ForEach-Object { Check-File $_ }
Write-Host ""

$jsonCount = (Get-ChildItem -Path (Join-Path $Root "data/curriculum") -Filter "*.json" -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Host "4. Curriculum JSON files found: $jsonCount"
Write-Host ""

Write-Host "============================"
if ($script:Fail -gt 0) {
  Write-Host "Setup incomplete: $($script:Ok) ok, $($script:Fail) missing"
  Write-Host "See docs/CURRICULUM_STUDIO.md"
  exit 1
}

Write-Host "Setup complete ($($script:Ok) checks passed)."
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. (Optional) Add text-based syllabus PDFs to ./Syllabus/"
Write-Host "  2. npm run ingest:syllabi"
Write-Host "  3. npx prisma migrate deploy"
Write-Host "  4. npm run dev"
Write-Host "  5. Open /dashboard/teacher/schemes as a teacher"
Write-Host ""
Write-Host "Docs: docs/CURRICULUM_STUDIO.md"
