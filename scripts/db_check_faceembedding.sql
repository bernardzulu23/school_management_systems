SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('Student', 'student')
  AND column_name IN ('faceEmbedding', 'faceembedding');

