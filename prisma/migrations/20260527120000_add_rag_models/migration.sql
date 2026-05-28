-- RAG: pgvector + school material chunks (384-dim all-MiniLM-L6-v2)
-- Idempotent: safe when tables were created earlier via db push

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "SchoolMaterial" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "gradeLevel" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolMaterial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MaterialChunk" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(384) NOT NULL,

    CONSTRAINT "MaterialChunk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SchoolMaterial_schoolId_idx" ON "SchoolMaterial"("schoolId");
CREATE INDEX IF NOT EXISTS "SchoolMaterial_subject_idx" ON "SchoolMaterial"("subject");
CREATE INDEX IF NOT EXISTS "MaterialChunk_schoolId_idx" ON "MaterialChunk"("schoolId");
CREATE INDEX IF NOT EXISTS "MaterialChunk_materialId_idx" ON "MaterialChunk"("materialId");

DO $$ BEGIN
  ALTER TABLE "SchoolMaterial" ADD CONSTRAINT "SchoolMaterial_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MaterialChunk" ADD CONSTRAINT "MaterialChunk_materialId_fkey"
    FOREIGN KEY ("materialId") REFERENCES "SchoolMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "MaterialChunk_embedding_hnsw_idx"
  ON "MaterialChunk" USING hnsw ("embedding" vector_cosine_ops);
