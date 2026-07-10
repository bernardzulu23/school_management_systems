#!/usr/bin/env bash
# ZSMS Curriculum Studio — verify & prepare (does not overwrite existing code)
# Usage (from repo root): bash scripts/setup-curriculum-studio.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "ZSMS Curriculum Studio Setup"
echo "============================"
echo "Root: $ROOT"
echo ""

ok=0
fail=0

check_file() {
  if [[ -f "$1" ]]; then
    echo "  OK  $1"
    ok=$((ok + 1))
  else
    echo "  MISSING  $1"
    fail=$((fail + 1))
  fi
}

# 1. Dependencies
echo "1. Dependencies (pdf-parse, docx)..."
npm install pdf-parse docx --no-fund --no-audit
echo ""

# 2. Directories
echo "2. Ensuring directories..."
mkdir -p lib/curriculum lib/ai app/api/curriculum/scheme components/curriculum \
  data/curriculum/form1-4 data/curriculum/form1-6 scripts Syllabus
echo "  OK  directories ready"
echo ""

# 3. Verify implementation (already in repo — do not overwrite)
echo "3. Verifying implementation files..."
check_file "lib/curriculum/syllabusParser.ts"
check_file "lib/curriculum/syllabusParsing.ts"
check_file "lib/curriculum/schemeOfWorkGenerator.ts"
check_file "lib/curriculum/schemeOfWorkExport.ts"
check_file "lib/curriculum/jsonCurriculumLoader.ts"
check_file "lib/curriculum/resolveCurriculum.ts"
check_file "lib/ai/schemeOfWorkWordExporter.ts"
check_file "app/api/curriculum/scheme/route.ts"
check_file "components/curriculum/CurriculumStudio.jsx"
check_file "app/dashboard/teacher/schemes/page.js"
check_file "scripts/ingest-syllabi.ts"
check_file "data/curriculum/form1-4/chemistry-form1-4.json"
check_file "data/curriculum/form1-4/physics-form1-4.json"
check_file "data/curriculum/form1-4/biology-form1-4.json"
check_file "docs/CURRICULUM_STUDIO.md"
echo ""

# 4. Optional: count curriculum JSON
json_count=$(find data/curriculum -name '*.json' 2>/dev/null | wc -l | tr -d ' ')
echo "4. Curriculum JSON files found: $json_count"
echo ""

echo "============================"
if [[ "$fail" -gt 0 ]]; then
  echo "Setup incomplete: $ok ok, $fail missing"
  echo "Pull latest main or restore Curriculum Studio files — see docs/CURRICULUM_STUDIO.md"
  exit 1
fi

echo "Setup complete ($ok checks passed)."
echo ""
echo "Next steps:"
echo "  1. (Optional) Add text-based syllabus PDFs to ./Syllabus/"
echo "  2. npm run ingest:syllabi"
echo "  3. npx prisma migrate deploy   # AiCache + Curriculum/SchemeOfWork"
echo "  4. npm run dev"
echo "  5. Open /dashboard/teacher/schemes as a teacher"
echo ""
echo "Test API (with session cookie):"
echo "  curl -X POST http://localhost:3000/api/curriculum/scheme \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"subject\":\"Chemistry\",\"grade\":\"Form 2\",\"term\":1,\"academicYear\":2026,\"format\":\"json\"}'"
echo ""
echo "Docs: docs/CURRICULUM_STUDIO.md"
