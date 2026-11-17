/**
 * Search repository: raw SQL operations for pgvector.
 *
 * All vector operations use parameterized queries via Prisma.$queryRaw / $executeRaw
 * to prevent SQL injection. User input is never concatenated into SQL strings.
 */
import { prisma } from '../lib/prisma';

export interface CodeEmbeddingInsert {
  id?: string;
  analysisRunId: string;
  analyzedFileId: string;
  repositoryId: string;
  filePath: string;
  unitKind: string;
  unitName: string;
  startLine: number;
  endLine: number;
  contentPreview: string;
  embeddingModel: string;
  embedding: number[];
}

export interface SearchResultRow {
  id: string;
  repositoryId: string;
  analysisRunId: string;
  analyzedFileId: string;
  filePath: string;
  unitKind: string;
  unitName: string;
  startLine: number;
  endLine: number;
  contentPreview: string;
  embeddingModel: string;
  score: number;
}

export interface IndexStatusRow {
  analysisRunId: string;
  unitCount: bigint;
  embeddingModel: string | null;
}

export const searchRepository = {
  /**
   * Upsert a single code embedding. Uses ON CONFLICT to handle re-indexing safely.
   */
  async upsertEmbedding(data: CodeEmbeddingInsert): Promise<void> {
    // Convert number[] to Postgres vector literal: '[0.1,0.2,...]'
    const vectorLiteral = `[${data.embedding.join(',')}]`;

    await prisma.$executeRaw`
      INSERT INTO "CodeEmbedding"
        ("analysisRunId", "analyzedFileId", "repositoryId", "filePath",
         "unitKind", "unitName", "startLine", "endLine",
         "contentPreview", "embeddingModel", "embedding", "updatedAt")
      VALUES (
        ${data.analysisRunId}::uuid,
        ${data.analyzedFileId}::uuid,
        ${data.repositoryId}::uuid,
        ${data.filePath},
        ${data.unitKind},
        ${data.unitName},
        ${data.startLine},
        ${data.endLine},
        ${data.contentPreview},
        ${data.embeddingModel},
        ${vectorLiteral}::vector,
        NOW()
      )
      ON CONFLICT ("analysisRunId", "analyzedFileId", "unitKind", "unitName", "startLine")
      DO UPDATE SET
        "contentPreview"  = EXCLUDED."contentPreview",
        "embeddingModel"  = EXCLUDED."embeddingModel",
        "embedding"       = EXCLUDED."embedding",
        "updatedAt"       = NOW()
    `;
  },

  /**
   * Delete all embeddings for an analysis run (used before re-indexing).
   */
  async deleteByAnalysisRun(analysisRunId: string): Promise<void> {
    await prisma.$executeRaw`
      DELETE FROM "CodeEmbedding" WHERE "analysisRunId" = ${analysisRunId}::uuid
    `;
  },

  /**
   * Returns count and model for the latest indexed analysis run for a repository.
   */
  async getIndexStatus(repositoryId: string): Promise<IndexStatusRow | null> {
    const rows = await prisma.$queryRaw<IndexStatusRow[]>`
      SELECT
        ce."analysisRunId",
        COUNT(*)::bigint                             AS "unitCount",
        MAX(ce."embeddingModel")                     AS "embeddingModel"
      FROM "CodeEmbedding" ce
      JOIN "AnalysisRun" ar ON ar."id" = ce."analysisRunId"
      WHERE ce."repositoryId" = ${repositoryId}::uuid
        AND ar."status" = 'COMPLETED'
      GROUP BY ce."analysisRunId", ar."createdAt"
      ORDER BY ar."createdAt" DESC
      LIMIT 1
    `;
    return rows[0] ?? null;
  },

  /**
   * Vector similarity search using cosine distance (<=>).
   * Returns top-k results ordered by similarity (highest first).
   *
   * The query embedding is passed as a parameterized vector literal.
   * repositoryId is parameterized as UUID. Limit is a safe integer.
   */
  async searchByVector(opts: {
    repositoryId: string;
    queryEmbedding: number[];
    limit: number;
    analysisRunId?: string;
  }): Promise<SearchResultRow[]> {
    const vectorLiteral = `[${opts.queryEmbedding.join(',')}]`;
    const safeLimit = Math.min(Math.max(1, opts.limit), 50);

    if (opts.analysisRunId) {
      return prisma.$queryRaw<SearchResultRow[]>`
        SELECT
          ce."id",
          ce."repositoryId",
          ce."analysisRunId",
          ce."analyzedFileId",
          ce."filePath",
          ce."unitKind",
          ce."unitName",
          ce."startLine",
          ce."endLine",
          ce."contentPreview",
          ce."embeddingModel",
          (1 - (ce."embedding" <=> ${vectorLiteral}::vector))::float AS "score"
        FROM "CodeEmbedding" ce
        WHERE ce."repositoryId" = ${opts.repositoryId}::uuid
          AND ce."analysisRunId" = ${opts.analysisRunId}::uuid
        ORDER BY ce."embedding" <=> ${vectorLiteral}::vector
        LIMIT ${safeLimit}
      `;
    }

    return prisma.$queryRaw<SearchResultRow[]>`
      SELECT
        ce."id",
        ce."repositoryId",
        ce."analysisRunId",
        ce."analyzedFileId",
        ce."filePath",
        ce."unitKind",
        ce."unitName",
        ce."startLine",
        ce."endLine",
        ce."contentPreview",
        ce."embeddingModel",
        (1 - (ce."embedding" <=> ${vectorLiteral}::vector))::float AS "score"
      FROM "CodeEmbedding" ce
      JOIN "AnalysisRun" ar ON ar."id" = ce."analysisRunId"
      WHERE ce."repositoryId" = ${opts.repositoryId}::uuid
        AND ar."status" = 'COMPLETED'
      ORDER BY ce."embedding" <=> ${vectorLiteral}::vector
      LIMIT ${safeLimit}
    `;
  },
};
