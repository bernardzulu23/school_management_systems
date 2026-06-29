# RAG (Retrieval-Augmented Generation)

ZSMS grounds AI features in each school's own uploaded notes, syllabi, and textbooks.

## Stack (free tier)

| Layer      | Service                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------- |
| Database   | Neon PostgreSQL + `pgvector`                                                              |
| Embeddings | HuggingFace Inference API — `sentence-transformers/all-MiniLM-L6-v2` (384 dims)           |
| Paid embed | Gemini, Jina, OpenRouter, OpenAI, or Voyage — all at **384 dims** with automatic fallback |
| Chunking   | ~500 tokens, ~100 token overlap (`lib/rag/chunk.js`)                                      |
| Ingestion  | `POST /api/materials/ingest` (Vercel, up to 120s)                                         |
| Retrieval  | Cosine similarity, `WHERE schoolId` before search                                         |
| LLM        | Groq (existing)                                                                           |

Paid plans use every configured embedding key in priority order: **Gemini → Jina → OpenRouter → OpenAI → Voyage → HuggingFace** (`lib/rag/embedProviders.js`). On rate limits or errors the pipeline tries the next configured provider automatically. Pin one provider with `RAG_EMBED_PROVIDER=gemini` (or `jina`, etc.) if you need ingest and search to stay on the same model; re-index materials after changing the pin.

## Environment

```env
HUGGINGFACE_API_KEY=hf_...   # Free tier + fallback (384-dim MiniLM)
# GEMINI_API_KEY=             # Paid — primary when set (text-embedding-004 @ 384d)
# JINA_API_KEY=               # Paid — jina-embeddings-v3 @ 384d
# OPENROUTER_API_KEY=         # Paid — OpenAI-compatible embeddings API
# OPENAI_API_KEY=             # Paid — text-embedding-3-small @ 384d
# VOYAGE_API_KEY=             # Paid — batched voyage-3-lite @ 384d
# RAG_EMBED_PROVIDER=gemini   # Optional pin — same provider for ingest + retrieval
# OPENROUTER_EMBED_MODEL=openai/text-embedding-3-small
# JINA_EMBED_MODEL=jina-embeddings-v3
# VOYAGE_EMBED_MODEL=voyage-3-lite
# VOYAGE_EMBED_BATCH_SIZE=8
# VOYAGE_EMBED_BATCH_DELAY_MS=21000
# VOYAGE_RATE_LIMIT_SLEEP_MS=20000
# VOYAGE_EMBED_MAX_RETRIES=3
```

With your Vercel keys (**GEMINI**, **JINA**, **OPENROUTER**), uploads will try Gemini first, then Jina, then OpenRouter — without needing Voyage or HuggingFace.

## Prisma models

- `SchoolMaterial` — uploaded source (PDF/DOCX/TXT metadata + `fileUrl`)
- `MaterialChunk` — text segment + `vector(384)` embedding

Run migration after pulling:

```bash
npx prisma migrate dev --name add_rag_models
```

Ensure Neon has `CREATE EXTENSION vector` (included in migration SQL).

## Ingestion API

`POST /api/materials/ingest` (teacher/HOD/admin, tenant-scoped)

**JSON body**

```json
{
  "title": "Grade 10 Biology Notes",
  "subject": "Biology",
  "gradeLevel": "Form 3",
  "fileUrl": "https://...",
  "fileType": "pdf",
  "text": "extracted plain text..."
}
```

Or send `materialId` + `text` to re-index an existing material.

**Multipart** — field `file` plus optional metadata; server parses PDF/DOCX/TXT when `pdf-parse` / `mammoth` are installed.

Response: `{ success, materialId, chunksIndexed, materialTitle }`

## Topic tests from materials

Teachers can ground quizzes in specific uploads:

1. **Upload** — `/dashboard/teacher/ai-materials` (subject required, teaching-assignment scoped).
2. **Preview** — `GET /api/materials/rag-preview?subject=&topic=&gradeLevel=&materialIds=` (retrieval only, no LLM).
3. **Generate** — `POST /api/ai/quiz-maker` with optional `materialIds[]` (max 5).
4. **Assign** — Quiz Maker or **Topic Test** wizard (`/dashboard/teacher/topic-test`) → create `Assessment` with `aiAnalysis` (material IDs + RAG refs) → HOD approve → student attempt.

Retrieval filters: `schoolId`, optional `subject`, `gradeLevel`, and `materialIds`. `lib/rag/retrieve.js` supports title boost for topic hints.

## AI features using RAG

When any embedding key is set (`GEMINI_API_KEY`, `JINA_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `VOYAGE_API_KEY`, or `HUGGINGFACE_API_KEY`) and chunks exist for the school:

- Lesson planner (`/api/ai/lesson-planner`, `/api/lesson-plans/generate`)
- Quiz maker (`/api/ai/quiz-maker`)
- ECZ practice (`/api/ai/ecz-practice`)

Responses may include `ragReferences` with material title, chunk index, similarity, and excerpt. The teacher/student UIs show a **Source References (RAG)** panel via `components/ai/RagReferencesPanel.js`. Streaming lesson plans receive refs in the first SSE event (`meta.ragReferences`).

## Multi-tenancy

Every chunk stores `schoolId`. Retrieval always filters `WHERE schoolId = $tenant` before vector search.

## Teacher UI

**Dashboard → AI Reference Materials** (`/dashboard/teacher/ai-materials`)

Teachers upload PDF, DOCX, or TXT files with optional subject/grade metadata. The UI calls `POST /api/materials/ingest` (multipart) and lists indexed materials via `GET /api/materials`.

Student-facing **Study Materials** (`StudyMaterial` model) is separate from RAG `SchoolMaterial`.

## Official CDC Chemistry syllabus (built-in)

ZSMS ships the **Zambia CDC 2024 Chemistry syllabus** (Forms 1–4, 82 subtopic chunks) at `data/curriculum/chemistry-cdc-2024.json`. Each record maps to one embeddable chunk aligned to CDC competences, learning activities, and expected standards.

- **Runtime context** — When `subject` is Chemistry, `buildRagContextForQuery` (`lib/ai/rag-context.js`) merges matching syllabus excerpts with school-uploaded materials. Citations appear as `[CDC N]` in the prompt block.
- **Search** — `lib/curriculum/chemistry-cdc-2024.js` scores chunks by form, topic, subtopic, and keywords (no embedding required).
- **Optional vector index** — Seed all 82 chunks into `SchoolMaterial` / `MaterialChunk` for cosine search alongside uploads:

```bash
SCHOOL_ID=<school-cuid> UPLOADED_BY=<userId> npm run seed:chemistry-curriculum
```

Uses `lib/rag/ingest-curriculum.js` (one syllabus subtopic per chunk, not naive text splitting).
