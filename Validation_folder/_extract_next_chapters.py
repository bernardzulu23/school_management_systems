"""Extract Assessment Scheme chapter text for remaining EoC subjects."""
import fitz
from pathlib import Path

pdf_path = Path(r"f:\Mobile Apps\ZSMS\school_management_systems\Validation_folder") / "ECSEOL Assessment Schemes_22_4_2026.pdf"
out_dir = Path(r"f:\Mobile Apps\ZSMS\school_management_systems\Validation_folder\extracted_chapters")
out_dir.mkdir(exist_ok=True)
doc = fitz.open(pdf_path)

# (slug, needle, end_exclusive_page_idx) — end = next chapter start or +N
CHAPTERS = [
    ("english-1021", "Chapter 1: English Language", 26),
    ("literature-in-english-1025", "Chapter 2: Literature in English", 35),
    ("civic-education-3011", "Chapter 3: Civic Education", 54),
    ("religious-education-3012", "Chapter 4: Religious Education", 60),
    ("history-3013", "Chapter 5: History", 70),
    ("mathematics-ii-2025", "Chapter 12: Mathematics II", 176),
]

starts = {}
for slug, needle, _end in CHAPTERS:
    for i in range(doc.page_count):
        text = doc.load_page(i).get_text("text")
        if needle in text and ("Elements of Construct" in text or "Elements of construct" in text):
            starts[slug] = i  # keep last (body) hit
    print(slug, "start", starts.get(slug))

for slug, _needle, end in CHAPTERS:
    idx = starts[slug]
    end = min(end, idx + 35, doc.page_count)
    chunks = []
    for p in range(idx, end):
        chunks.append(f"\n--- PDF_PAGE {p+1} ---\n")
        chunks.append(doc.load_page(p).get_text("text"))
    out = out_dir / f"{slug}.txt"
    out.write_text("".join(chunks), encoding="utf-8")
    print("wrote", out.name, "pages", idx + 1, "to", end)
