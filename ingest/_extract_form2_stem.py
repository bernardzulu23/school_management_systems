"""One-off: extract Form 2 STEM PDFs into ingest/extracted/teaching-modules/."""
from pathlib import Path
import json
import importlib.util

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location(
    "extract", ROOT / "ingest" / "01_extract_and_fix.py"
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

src = ROOT / "Teaching Module" / "form2-4-stem"
out = ROOT / "ingest" / "extracted" / "teaching-modules"
out.mkdir(parents=True, exist_ok=True)
pdfs = sorted(src.glob("*.pdf"))
print(f"Extracting {len(pdfs)} Form-2 STEM PDFs...")
for p in pdfs:
    result = mod.extract_pdf(p)
    dest = out / (p.stem + ".json")
    dest.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(
        f"  {p.name}: shift={result['detected_shift']} "
        f"conf={result['shift_confidence']} pages={result['page_count']}"
    )
print("Done")
