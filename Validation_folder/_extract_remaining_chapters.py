"""Extract remaining Assessment Scheme chapters for EoC specs."""
import fitz
from pathlib import Path

pdf_path = Path(r"f:\Mobile Apps\ZSMS\school_management_systems\Validation_folder") / "ECSEOL Assessment Schemes_22_4_2026.pdf"
out_dir = Path(r"f:\Mobile Apps\ZSMS\school_management_systems\Validation_folder\extracted_chapters")
out_dir.mkdir(exist_ok=True)
doc = fitz.open(pdf_path)

# (slug, chapter needle, next chapter needle OR None)
CHAPTERS = [
    ("french-1120", "Chapter 7: French Language", "Chapter 8: Chinese Language"),
    ("chinese-1125", "Chapter 8: Chinese Language", "Chapter 9: Zambian Languages"),
    ("zambian-languages-1211", "Chapter 9: Zambian Languages", "Chapter 10: Literature in Zambian Languages"),
    ("musical-arts-5014", "Chapter 18: Musical Arts", "Chapter 19: Design and Technology"),
    ("design-and-technology-8015", "Chapter 19: Design and Technology", "Chapter 20: Fashion and Fabrics"),
    ("fashion-and-fabrics-6012", "Chapter 20: Fashion and Fabrics", "Chapter 21: Food and Nutrition"),
    ("food-and-nutrition-6014", "Chapter 21: Food and Nutrition", "Chapter 22: Hospitality Management"),
    ("hospitality-management-6015", "Chapter 22: Hospitality Management", "Chapter 23: Travel and Tourism"),
    ("travel-and-tourism-6016", "Chapter 23: Travel and Tourism", "Chapter 24: Physical Education"),
    ("physical-education-9010", "Chapter 24: Physical Education", "Chapter 25: Computer Science"),
    ("computer-science-8010", "Chapter 25: Computer Science", "Chapter 26: Information and Communications Technology"),
    ("ict-8011", "Chapter 26: Information and Communications Technology", "Chapter 27: Commerce"),
    ("commerce-7015", "Chapter 27: Commerce", "Chapter 28: Principles of Accounts"),
    ("principles-of-accounts-7020", "Chapter 28: Principles of Accounts", "Chapter 29: Access Arrangements"),
]

def find_body(needle: str) -> int | None:
    hits = []
    for i in range(doc.page_count):
        t = doc.load_page(i).get_text("text")
        if needle in t and ("Elements of Construct" in t or "Elements of construct" in t or "Element of Construct" in t):
            hits.append(i)
    return hits[-1] if hits else None

starts = {}
for slug, needle, _nxt in CHAPTERS:
    starts[slug] = find_body(needle)
    print(slug, starts[slug])

ordered = [(starts[s], s, nxt) for s, _n, nxt in CHAPTERS if starts[s] is not None]
ordered.sort()

for idx, (start, slug, nxt) in enumerate(ordered):
    if idx + 1 < len(ordered):
        end = ordered[idx + 1][0]
    else:
        end = min(start + 25, doc.page_count)
    end = min(end, start + 30, doc.page_count)
    chunks = []
    for p in range(start, end):
        chunks.append(f"\n--- PDF_PAGE {p+1} ---\n")
        chunks.append(doc.load_page(p).get_text("text"))
    out = out_dir / f"{slug}.txt"
    out.write_text("".join(chunks), encoding="utf-8")
    print("wrote", out.name, "pages", start + 1, "-", end)
