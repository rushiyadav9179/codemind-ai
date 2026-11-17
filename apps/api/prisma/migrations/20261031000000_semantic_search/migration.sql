-- Phase 5: Semantic Code Search
-- Idempotent pgvector setup (extension already created by init.sql, but safe to repeat)
CREATE EXTENSION IF NOT EXISTS vector;

-- CodeEmbedding stores vector embeddings for code units extracted from AnalyzedFile
CREATE TABLE IF NOT EXISTS "CodeEmbedding" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "analysisRunId" UUID        NOT NULL,
  "analyzedFileId" UUID       NOT NULL,
  "repositoryId"  UUID        NOT NULL,
  "filePath"      VARCHAR(500) NOT NULL,
  "unitKind"      VARCHAR(50)  NOT NULL,  -- 'function' | 'method' | 'class' | 'interface' | 'type'
  "unitName"      VARCHAR(255) NOT NULL,
  "startLine"     INTEGER     NOT NULL DEFAULT 0,
  "endLine"       INTEGER     NOT NULL DEFAULT 0,
  "contentPreview" TEXT       NOT NULL DEFAULT '',  -- short excerpt for display, NOT full source
  "embeddingModel" VARCHAR(100) NOT NULL,
  "embedding"     vector(768) NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "CodeEmbedding_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CodeEmbedding_analysisRunId_fkey"
    FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE,
  CONSTRAINT "CodeEmbedding_analyzedFileId_fkey"
    FOREIGN KEY ("analyzedFileId") REFERENCES "AnalyzedFile"("id") ON DELETE CASCADE,
  CONSTRAINT "CodeEmbedding_repositoryId_fkey"
    FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE,
  CONSTRAINT "CodeEmbedding_unique_unit"
    UNIQUE ("analysisRunId", "analyzedFileId", "unitKind", "unitName", "startLine")
);

-- Index for fast lookup by repository + analysis run
CREATE INDEX IF NOT EXISTS "CodeEmbedding_repositoryId_idx"
  ON "CodeEmbedding" ("repositoryId");

CREATE INDEX IF NOT EXISTS "CodeEmbedding_analysisRunId_idx"
  ON "CodeEmbedding" ("analysisRunId");

-- IVFFlat index for approximate nearest-neighbor cosine search
-- lists=50 is appropriate for small-to-medium datasets
-- This requires at least 50*39 = ~2000 rows to be effective; safe to create now
CREATE INDEX IF NOT EXISTS "CodeEmbedding_embedding_idx"
  ON "CodeEmbedding" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 50);
