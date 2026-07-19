#!/usr/bin/env python3
"""
Dedupe + per-file character-code shift detection + PDF text extraction.

Syllabus PDFs often embed fonts without ToUnicode maps; glyph codes need a
per-file shift (empirically 0, +29, +34, or +36). Teaching modules extract
natively (shift 0). Always auto-detect from a middle page — never hardcode
a single shift, and never trust page 1 alone (covers can be shift-0 when
the body is not).

Usage (from school_management_systems/):
  pip install pymupdf
  python ingest/01_extract_and_fix.py
"""

from __future__ import annotations

import hashlib
import json
import string
import sys
from pathlib import Path

try:
    import fitz  # pymupdf
except ImportError:
    print("ERROR: pymupdf not installed. Run: pip install pymupdf", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent

# Prefer repo folders used in prior sessions; fall back to source-pdfs/
def _resolve_dir(*candidates: str) -> Path:
    for rel in candidates:
        p = ROOT / rel
        if p.is_dir():
            return p
    return ROOT / candidates[0]


SYLLABUS_DIR = _resolve_dir("Syllabus", "source-pdfs/Syllabus")
MODULES_DIR = _resolve_dir("Teaching Module", "source-pdfs/Teaching Module", "Teaching_Module")
OUT_DIR = ROOT / "ingest" / "extracted"
REPORT_PATH = OUT_DIR / "_extract-report.json"

ASCII_READABLE = set(string.ascii_letters + " .,;:()-'\n\t")
SYLLABUS_KEYWORDS = (
    "TOPIC",
    "SUB-TOPIC",
    "SUBTOPIC",
    "SPECIFIC COMPETENCE",
    "LEARNING ACTIVIT",
    "EXPECTED STANDARD",
    "FORM 1",
    "FORM 2",
    "FORM 3",
    "FORM 4",
)


def file_hash(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def dedupe(paths: list[Path]) -> tuple[list[Path], list[dict]]:
    seen: dict[str, Path] = {}
    unique: list[Path] = []
    skipped: list[dict] = []
    for p in sorted(paths):
        h = file_hash(p)
        if h in seen:
            print(f"SKIP duplicate: {p.name} (same content as {seen[h].name})")
            skipped.append(
                {
                    "file": p.name,
                    "duplicateOf": seen[h].name,
                    "md5": h,
                }
            )
            continue
        seen[h] = p
        unique.append(p)
    return unique, skipped


def shift_decode(text: str, shift: int) -> str:
    if shift == 0 or not text:
        return text
    out: list[str] = []
    for ch in text:
        new = ord(ch) + shift
        out.append(chr(new) if 0 <= new <= 0x10FFFF else ch)
    return "".join(out)


def strip_toc_leaders(text: str) -> str:
    """TOC dotted leaders inflate wrong-shift scores (.... → KKKK / PPPP)."""
    import re

    return re.sub(r"[.\u00b7]{3,}", " ", text)


def score_english(text: str) -> float:
    if not text:
        return 0.0
    cleaned = strip_toc_leaders(text)
    if not cleaned:
        return 0.0
    good = sum(1 for c in cleaned if c in ASCII_READABLE)
    return good / len(cleaned)


def score_keywords(text: str) -> float:
    upper = text.upper()
    return sum(1 for k in SYLLABUS_KEYWORDS if k in upper) / max(1, len(SYLLABUS_KEYWORDS))


def page_alnum_weight(text: str) -> int:
    cleaned = strip_toc_leaders(text)
    return sum(1 for c in cleaned if c.isalnum())


def encoded_focus(sample_text: str) -> str:
    """
    Prefer lines that look font-encoded (control chars / low ASCII ratio).
    Mixed pages (readable header + encoded table) otherwise pick shift 0 wrongly.
    """
    lines = sample_text.splitlines()
    encoded: list[str] = []
    for ln in lines:
        if len(ln.strip()) < 8:
            continue
        has_ctrl = any(ord(c) < 32 and c not in "\t" for c in ln)
        readable_ratio = sum(1 for c in ln if c in ASCII_READABLE) / max(1, len(ln))
        if has_ctrl or readable_ratio < 0.55:
            encoded.append(ln)
    focus = "\n".join(encoded)
    return focus if len(focus) > 80 else sample_text


def detect_shift(sample_text: str) -> tuple[int, float]:
    """Try shifts -40..+40; maximize ASCII readability (+ syllabus keyword bonus)."""
    native_eng = score_english(sample_text)
    native_kw = score_keywords(sample_text)
    focus = encoded_focus(sample_text)
    # Already-readable body pages (Commerce/Music/Lit under pymupdf): don't
    # chase TOC-dot false positives at +34/+36.
    if focus == sample_text and native_eng >= 0.92 and native_kw > 0:
        return 0, native_eng

    best_shift, best_score = 0, -1.0
    for shift in range(-40, 41):
        decoded = shift_decode(focus, shift)
        s = score_english(decoded) + 0.2 * score_keywords(decoded)
        if s > best_score:
            best_shift, best_score = shift, s
    confidence = score_english(shift_decode(focus, best_shift))
    return best_shift, confidence


def pick_middle_sample(doc) -> tuple[str, int]:
    """
    Never trust page 1 alone. Within the middle third, pick the page with the
    most alphanumeric content so sparse Form-divider / TOC pages don't win.
    If the middle third is sparse, widen the search to the whole document
    excluding cover + last page.
    """
    n_pages = len(doc)
    if n_pages <= 0:
        return "", 0

    def best_in_range(lo: int, hi: int) -> tuple[int, int, str]:
        best_idx = max(0, min(n_pages - 1, n_pages // 2))
        best_weight = -1
        best_text = doc[best_idx].get_text()
        for i in range(lo, min(hi, n_pages)):
            text = doc[i].get_text()
            weight = page_alnum_weight(text)
            if weight > best_weight:
                best_weight = weight
                best_idx = i
                best_text = text
        return best_idx, best_weight, best_text

    start = n_pages // 3
    end = max(start + 1, (2 * n_pages) // 3)
    best_idx, best_weight, best_text = best_in_range(start, end)

    # Sparse Form-divider pages (e.g. only "FORM 4") — widen search.
    if best_weight < 200 and n_pages > 4:
        best_idx, best_weight, best_text = best_in_range(1, n_pages - 1)

    return best_text, best_idx


def looks_encoded(line: str) -> bool:
    if not line or len(line.strip()) < 2:
        return False
    if any(ord(c) < 32 and c not in "\t" for c in line):
        return True
    # High proportion of punctuation-range bytes typical of CDC custom fonts
    readable = sum(1 for c in line if c in ASCII_READABLE)
    return len(line) > 12 and (readable / len(line)) < 0.55


def selective_shift_decode(text: str, shift: int) -> str:
    """
    Apply shift only to lines that look font-encoded.
    Mixed PDFs (readable headers + encoded tables) must not globally shift —
    that corrupts native English while fixing the body.
    """
    if shift == 0 or not text:
        return text
    out_lines: list[str] = []
    for line in text.splitlines(keepends=True):
        # Preserve line endings
        if line.endswith("\r\n"):
            core, ending = line[:-2], "\r\n"
        elif line.endswith("\n"):
            core, ending = line[:-1], "\n"
        else:
            core, ending = line, ""
        if looks_encoded(core):
            out_lines.append(shift_decode(core, shift) + ending)
        else:
            out_lines.append(line)
    return "".join(out_lines)


def extract_pdf(path: Path) -> dict:
    doc = fitz.open(path)
    n_pages = len(doc)
    # Middle-third contentful page — covers are often shift-0 when body isn't;
    # Form-divider pages are mostly whitespace and mis-detect (e.g. Music +34).
    sample_page, sample_idx = pick_middle_sample(doc)
    shift, confidence = detect_shift(sample_page)

    if confidence < 0.5:
        print(
            f"WARNING {path.name}: low confidence ({confidence:.2f}) on detected "
            f"shift {shift} — flag for manual review (possibly scanned / OCR needed)"
        )

    pages = []
    for i, page in enumerate(doc, start=1):
        raw = page.get_text()
        text = selective_shift_decode(raw, shift) if shift != 0 else raw
        pages.append({"page": i, "text": text})

    doc.close()
    return {
        "source_file": path.name,
        "source_path": str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path),
        "md5": file_hash(path),
        "detected_shift": shift,
        "shift_confidence": round(confidence, 3),
        "sample_page": sample_idx + 1,
        "page_count": n_pages,
        "pages": pages,
        "needs_manual_review": confidence < 0.5,
        "decode_mode": "selective-line" if shift != 0 else "native",
    }


def process(dir_path: Path, out_subdir: str) -> list[dict]:
    if not dir_path.is_dir():
        print(f"ERROR: directory not found: {dir_path}", file=sys.stderr)
        return []

    out_dir = OUT_DIR / out_subdir
    out_dir.mkdir(parents=True, exist_ok=True)
    pdfs, skipped = dedupe(list(dir_path.rglob("*.pdf")))
    rows: list[dict] = []

    for pdf_path in pdfs:
        result = extract_pdf(pdf_path)
        out_path = out_dir / (pdf_path.stem + ".json")
        out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
        print(
            f"{pdf_path.name}: shift={result['detected_shift']} "
            f"confidence={result['shift_confidence']} pages={result['page_count']}"
        )
        rows.append(
            {
                "file": pdf_path.name,
                "out": str(out_path.relative_to(ROOT)),
                "detected_shift": result["detected_shift"],
                "shift_confidence": result["shift_confidence"],
                "page_count": result["page_count"],
                "needs_manual_review": result["needs_manual_review"],
                "md5": result["md5"],
            }
        )

    for s in skipped:
        rows.append({**s, "skipped": True})

    return rows


def main() -> int:
    print(f"ROOT={ROOT}")
    print(f"Syllabus dir: {SYLLABUS_DIR} (exists={SYLLABUS_DIR.is_dir()})")
    print(f"Modules dir:  {MODULES_DIR} (exists={MODULES_DIR.is_dir()})")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("\n=== Syllabus ===")
    syllabus_rows = process(SYLLABUS_DIR, "syllabus")

    print("\n=== Teaching Modules ===")
    module_rows = process(MODULES_DIR, "teaching-modules")

    report = {
        "syllabusDir": str(SYLLABUS_DIR),
        "modulesDir": str(MODULES_DIR),
        "syllabus": syllabus_rows,
        "teachingModules": module_rows,
        "syllabusUnique": sum(1 for r in syllabus_rows if not r.get("skipped")),
        "modulesUnique": sum(1 for r in module_rows if not r.get("skipped")),
        "modulesSkippedDuplicates": sum(1 for r in module_rows if r.get("skipped")),
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\nReport: {REPORT_PATH}")
    print(
        f"Syllabus unique={report['syllabusUnique']} | "
        f"Modules unique={report['modulesUnique']} "
        f"(skipped dupes={report['modulesSkippedDuplicates']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
