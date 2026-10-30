-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" UUID NOT NULL,
    "repositoryId" UUID NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "totalLines" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyzedFile" (
    "id" UUID NOT NULL,
    "analysisRunId" UUID NOT NULL,
    "filePath" VARCHAR(500) NOT NULL,
    "language" VARCHAR(50) NOT NULL,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "codeLineCount" INTEGER NOT NULL DEFAULT 0,
    "imports" JSONB NOT NULL DEFAULT '[]',
    "exports" JSONB NOT NULL DEFAULT '[]',
    "symbols" JSONB NOT NULL DEFAULT '{}',
    "dependencies" JSONB NOT NULL DEFAULT '[]',
    "hasErrors" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AnalyzedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalysisRun_repositoryId_idx" ON "AnalysisRun"("repositoryId");

-- CreateIndex
CREATE INDEX "AnalysisRun_repositoryId_createdAt_idx" ON "AnalysisRun"("repositoryId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyzedFile_analysisRunId_idx" ON "AnalyzedFile"("analysisRunId");

-- CreateIndex
CREATE INDEX "AnalyzedFile_analysisRunId_language_idx" ON "AnalyzedFile"("analysisRunId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyzedFile_analysisRunId_filePath_key" ON "AnalyzedFile"("analysisRunId", "filePath");

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyzedFile" ADD CONSTRAINT "AnalyzedFile_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
