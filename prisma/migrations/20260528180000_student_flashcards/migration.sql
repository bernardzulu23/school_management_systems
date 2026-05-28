-- Student daily flashcard decks (one per subject per day, max 10 cards)

CREATE TABLE "StudentFlashcardDeck" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subjectId" TEXT,
    "subjectName" TEXT NOT NULL,
    "deckDate" DATE NOT NULL,
    "title" TEXT,
    "cards" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentFlashcardDeck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentFlashcardDeck_studentId_subjectName_deckDate_key"
ON "StudentFlashcardDeck"("studentId", "subjectName", "deckDate");

CREATE INDEX "StudentFlashcardDeck_schoolId_studentId_deckDate_idx"
ON "StudentFlashcardDeck"("schoolId", "studentId", "deckDate");

CREATE INDEX "StudentFlashcardDeck_studentId_deckDate_idx"
ON "StudentFlashcardDeck"("studentId", "deckDate");

ALTER TABLE "StudentFlashcardDeck" ADD CONSTRAINT "StudentFlashcardDeck_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentFlashcardDeck" ADD CONSTRAINT "StudentFlashcardDeck_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
