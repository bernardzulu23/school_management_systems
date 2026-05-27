# RAG (Retrieval-Augmented Generation)

ZSMS grounds AI features in each school's own uploaded notes, syllabi, and textbooks.

## Stack (free tier)

| Layer      | Service                                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| Database   | Neon PostgreSQL + `pgvector`                                                    |
| Embeddings | HuggingFace Inference API — `sentence-transformers/all-MiniLM-L6-v2` (384 dims) |
| Chunking   | ~500 tokens, ~100 token overlap (`lib/rag/chunk.js`)                            |
| Ingestion  | `POST /api/materials/ingest` (Vercel, up to 60s)                                |
| Retrieval  | Cosine similarity, `WHERE schoolId` before search                               |
| LLM        | Groq (existing)                                                                 |

Paid plans can use Voyage or OpenAI embeddings via `lib/features/ragAccess.js` when API keys are set.

## Prisma models

- `SchoolMaterial` — uploaded source (PDF/DOCX/TXT metadata + `fileUrl`)
- `MaterialChunk` — text segment + `vector(384)` embedding

Run migration after pulling:

```bash
npx prisma migrate dev --name add_rag_models
```

Ensure Neon has `CREATE EXTENSION vector` (included in migration SQL).

## Environment

```env
HUGGINGFACE_API_KEY=hf_...   # Required for ingest + retrieval on free tier
# VOYAGE_API_KEY=             # Optional — premium embedding
# OPENAI_API_KEY=             # Optional — fallback premium embedding
```

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

## AI features using RAG

When `HUGGINGFACE_API_KEY` is set and chunks exist for the school:

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
