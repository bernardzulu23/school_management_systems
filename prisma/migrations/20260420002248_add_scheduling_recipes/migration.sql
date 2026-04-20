-- CreateEnum
CREATE TYPE "RecipeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RecipeBlockType" AS ENUM ('SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD');

-- CreateEnum
CREATE TYPE "RecipeConstraintType" AS ENUM ('HARD', 'SOFT');

-- CreateTable
CREATE TABLE "SchedulingRecipe" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teachingAssignmentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "status" "RecipeStatus" NOT NULL DEFAULT 'DRAFT',
    "season" TEXT,
    "seasonVariantOfId" TEXT,
    "expectedPeriodsPerWeek" INTEGER,
    "placementPriority" INTEGER NOT NULL DEFAULT 5,
    "isValid" BOOLEAN NOT NULL DEFAULT false,
    "validationErrors" JSONB,
    "validatedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulingRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeBlock" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "type" "RecipeBlockType" NOT NULL,
    "size" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "placementPriority" INTEGER NOT NULL DEFAULT 5,
    "preferredDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredPeriods" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "forbiddenDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "forbiddenPeriods" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "allowSplitAcrossBreaks" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeConstraint" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "type" "RecipeConstraintType" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeConstraint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchedulingRecipe_schoolId_idx" ON "SchedulingRecipe"("schoolId");

-- CreateIndex
CREATE INDEX "SchedulingRecipe_schoolId_status_idx" ON "SchedulingRecipe"("schoolId", "status");

-- CreateIndex
CREATE INDEX "SchedulingRecipe_schoolId_teacherId_idx" ON "SchedulingRecipe"("schoolId", "teacherId");

-- CreateIndex
CREATE INDEX "SchedulingRecipe_schoolId_classId_idx" ON "SchedulingRecipe"("schoolId", "classId");

-- CreateIndex
CREATE INDEX "SchedulingRecipe_schoolId_subjectId_idx" ON "SchedulingRecipe"("schoolId", "subjectId");

-- CreateIndex
CREATE INDEX "SchedulingRecipe_teachingAssignmentId_idx" ON "SchedulingRecipe"("teachingAssignmentId");

-- CreateIndex
CREATE INDEX "SchedulingRecipe_isValid_idx" ON "SchedulingRecipe"("isValid");

-- CreateIndex
CREATE INDEX "SchedulingRecipe_season_idx" ON "SchedulingRecipe"("season");

-- CreateIndex
CREATE UNIQUE INDEX "SchedulingRecipe_schoolId_teachingAssignmentId_season_key" ON "SchedulingRecipe"("schoolId", "teachingAssignmentId", "season");

-- CreateIndex
CREATE INDEX "RecipeBlock_recipeId_idx" ON "RecipeBlock"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeBlock_recipeId_placementPriority_idx" ON "RecipeBlock"("recipeId", "placementPriority");

-- CreateIndex
CREATE INDEX "RecipeBlock_type_idx" ON "RecipeBlock"("type");

-- CreateIndex
CREATE INDEX "RecipeConstraint_recipeId_idx" ON "RecipeConstraint"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeConstraint_recipeId_type_idx" ON "RecipeConstraint"("recipeId", "type");

-- CreateIndex
CREATE INDEX "RecipeConstraint_priority_idx" ON "RecipeConstraint"("priority");

-- AddForeignKey
ALTER TABLE "SchedulingRecipe" ADD CONSTRAINT "SchedulingRecipe_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingRecipe" ADD CONSTRAINT "SchedulingRecipe_teachingAssignmentId_fkey" FOREIGN KEY ("teachingAssignmentId") REFERENCES "TeachingAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingRecipe" ADD CONSTRAINT "SchedulingRecipe_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingRecipe" ADD CONSTRAINT "SchedulingRecipe_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingRecipe" ADD CONSTRAINT "SchedulingRecipe_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingRecipe" ADD CONSTRAINT "SchedulingRecipe_seasonVariantOfId_fkey" FOREIGN KEY ("seasonVariantOfId") REFERENCES "SchedulingRecipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingRecipe" ADD CONSTRAINT "SchedulingRecipe_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeBlock" ADD CONSTRAINT "RecipeBlock_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "SchedulingRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeConstraint" ADD CONSTRAINT "RecipeConstraint_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "SchedulingRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
