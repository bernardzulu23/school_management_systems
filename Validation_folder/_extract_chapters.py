import fitz
from pathlib import Path

pdf_path = Path(r"f:\Mobile Apps\ZSMS\school_management_systems\Validation_folder") / "ECSEOL Assessment Schemes_22_4_2026.pdf"
out_dir = Path(r"f:\Mobile Apps\ZSMS\school_management_systems\Validation_folder\extracted_chapters")
out_dir.mkdir(exist_ok=True)

doc = fitz.open(pdf_path)
print("pages", doc.page_count)

targets = [
    ("physics-4016", "Chapter 14: Physics"),
    ("chemistry-4014", "Chapter 15: Chemistry"),
    ("biology-4012", "Chapter 16: Biology"),
    ("geography-3014", "Chapter 6: Geography"),
    ("mathematics-ii-2025", "Chapter 12: Mathematics II"),
    ("english-1021", "Chapter 1: English Language"),
]

# Find first body-page hit for each chapter (skip TOC pages early in doc)
starts = {}
for slug, needle in targets:
    for i in range(doc.page_count):
        text = doc.load_page(i).get_text("text")
        if needle in text and ("Elements of Construct" in text or "Elements of construct" in text):
            # Prefer later occurrences (body) over TOC
            starts[slug] = i
    print(slug, "start_page_idx", starts.get(slug))

# Determine end as next chapter start among known starts, else +20 pages
ordered = sorted(((idx, slug) for slug, idx in starts.items()), key=lambda x: x[0])
for n, (idx, slug) in enumerate(ordered):
    end = ordered[n + 1][0] if n + 1 < len(ordered) else min(idx + 25, doc.page_count)
    # If gap huge (different chapter order), cap
    end = min(end, idx + 30)
    chunks = []
    for p in range(idx, end):
        chunks.append(f"\n--- PDF_PAGE {p+1} ---\n")
        chunks.append(doc.load_page(p).get_text("text"))
    out = out_dir / f"{slug}.txt"
    out.write_text("".join(chunks), encoding="utf-8")
    print("wrote", out.name, "pages", idx + 1, "to", end)
