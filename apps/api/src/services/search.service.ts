/**
 * Search service: orchestrates indexing and semantic search.
 *
 * Indexing flow:
 *   1. Verify repository ownership.
 *   2. Load latest completed AnalysisRun.
 *   3. Extract code units from each AnalyzedFile's symbol JSON.
 *   4. Generate embeddings via EmbeddingProvider.
 *   5. Upsert embeddings into CodeEmbedding via searchRepository.
 *
 * Search flow:
 *   1. Verify repository ownership.
 *   2. Check index status.
 *   3. Embed the query text.
 *   4. Run vector similarity search.
 *   5. Return ranked results.
 */
import type { FileSymbols, FunctionSymbol, ClassSymbol, TypeSymbol } from '@codemind/shared';
import { HttpError } from '../middleware/errorHandler';
import { repositoryRepository } from '../repositories/repository.repository';
import { analysisRepository } from '../repositories/analysis.repository';
import { searchRepository } from '../repositories/search.repository';
import {
  buildEmbeddingInput,
  EmbeddingUnavailableError,
  getEmbeddingProvider,
} from '../lib/embedding';
import { logger } from '../middleware/requestLogger';
import type { IndexStatus, SearchResult } from '@codemind/shared';

interface CodeUnit {
  kind: string;
  name: string;
  startLine: number;
  endLine: number;
  contextText: string;
}

/** Max preview length stored in DB — not full source, just enough for display */
const MAX_PREVIEW_CHARS = 300;

function extractCodeUnits(symbols: FileSymbols, filePath: string): CodeUnit[] {
  const units: CodeUnit[] = [];

  // Functions
  for (const fn of symbols.functions ?? []) {
    const f = fn as FunctionSymbol;
    const context = [
      f.isAsync ? 'async' : '',
      `function ${f.name}`,
      `(${f.parameters.join(', ')})`,
      f.returnType ? `: ${f.returnType}` : '',
      `in ${filePath}`,
    ]
      .filter(Boolean)
      .join(' ');

    units.push({
      kind: 'function',
      name: f.name,
      startLine: f.line,
      endLine: f.line,
      contextText: context,
    });
  }

  // Classes and their methods
  for (const cls of symbols.classes ?? []) {
    const c = cls as ClassSymbol;
    const clsContext = [
      `class ${c.name}`,
      c.extends ? `extends ${c.extends}` : '',
      c.implements?.length ? `implements ${c.implements.join(', ')}` : '',
      `in ${filePath}`,
    ]
      .filter(Boolean)
      .join(' ');

    units.push({
      kind: 'class',
      name: c.name,
      startLine: c.line,
      endLine: c.line,
      contextText: clsContext,
    });

    for (const method of c.methods ?? []) {
      const mContext = [
        method.visibility ?? 'public',
        method.isAsync ? 'async' : '',
        `method ${c.name}.${method.name}`,
        `(${method.parameters.join(', ')})`,
        method.returnType ? `: ${method.returnType}` : '',
        `in ${filePath}`,
      ]
        .filter(Boolean)
        .join(' ');

      units.push({
        kind: 'method',
        name: `${c.name}.${method.name}`,
        startLine: c.line,
        endLine: c.line,
        contextText: mContext,
      });
    }
  }

  // Interfaces and type aliases
  for (const type of symbols.types ?? []) {
    const t = type as TypeSymbol;
    units.push({
      kind: t.kind, // 'interface' | 'type'
      name: t.name,
      startLine: t.line,
      endLine: t.line,
      contextText: `${t.kind} ${t.name} in ${filePath}`,
    });
  }

  return units;
}

export const searchService = {
  /**
   * Index the latest completed analysis run for a repository.
   * Safe to call multiple times (upserts). Re-indexing replaces existing embeddings.
   */
  async indexRepository(repositoryId: string, ownerId: string): Promise<IndexStatus> {
    const repo = await repositoryRepository.findById(repositoryId, ownerId);
    if (!repo) {
      throw new HttpError(404, 'REPOSITORY_NOT_FOUND', 'Repository not found');
    }

    const run = await analysisRepository.findLatestRunByRepositoryId(repositoryId);
    if (!run || run.status !== 'COMPLETED') {
      throw new HttpError(
        422,
        'NO_COMPLETED_ANALYSIS',
        'No completed analysis run found for this repository. Run an analysis first.',
      );
    }

    const provider = getEmbeddingProvider();
    const files = await analysisRepository.findAllFilesForRun(run.id);

    let indexed = 0;
    let skipped = 0;

    for (const file of files) {
      const symbols = file.symbols as unknown as FileSymbols;
      if (!symbols) {
        skipped++;
        continue;
      }

      const units = extractCodeUnits(symbols, file.filePath);
      if (units.length === 0) {
        skipped++;
        continue;
      }

      const texts = units.map((u) =>
        buildEmbeddingInput({ kind: u.kind, name: u.name, context: u.contextText }),
      );

      let embeddings: number[][];
      try {
        embeddings = await provider.embed(texts);
      } catch (err) {
        if (err instanceof EmbeddingUnavailableError) {
          throw new HttpError(503, 'MODEL_UNAVAILABLE', err.message);
        }
        throw err;
      }

      for (let i = 0; i < units.length; i++) {
        const unit = units[i]!;
        const embedding = embeddings[i]!;
        const preview = unit.contextText.slice(0, MAX_PREVIEW_CHARS);

        try {
          await searchRepository.upsertEmbedding({
            analysisRunId: run.id,
            analyzedFileId: file.id,
            repositoryId,
            filePath: file.filePath,
            unitKind: unit.kind,
            unitName: unit.name,
            startLine: unit.startLine,
            endLine: unit.endLine,
            contentPreview: preview,
            embeddingModel: provider.modelId,
            embedding,
          });
          indexed++;
        } catch (err) {
          logger.warn(
            {
              err: err instanceof Error ? err.message : String(err),
              filePath: file.filePath,
              unit: unit.name,
            },
            'Failed to upsert embedding, skipping unit',
          );
          skipped++;
        }
      }
    }

    logger.info(
      { repositoryId, analysisRunId: run.id, indexed, skipped },
      'Semantic indexing complete',
    );

    return {
      repositoryId,
      analysisRunId: run.id,
      indexedUnits: indexed,
      skippedUnits: skipped,
      embeddingModel: provider.modelId,
      status: 'indexed',
    };
  },

  /**
   * Get the current index status for a repository.
   */
  async getIndexStatus(repositoryId: string, ownerId: string): Promise<IndexStatus> {
    const repo = await repositoryRepository.findById(repositoryId, ownerId);
    if (!repo) {
      throw new HttpError(404, 'REPOSITORY_NOT_FOUND', 'Repository not found');
    }

    const row = await searchRepository.getIndexStatus(repositoryId);
    if (!row) {
      return {
        repositoryId,
        analysisRunId: null,
        indexedUnits: 0,
        skippedUnits: 0,
        embeddingModel: null,
        status: 'not_indexed',
      };
    }

    return {
      repositoryId,
      analysisRunId: row.analysisRunId,
      indexedUnits: Number(row.unitCount),
      skippedUnits: 0,
      embeddingModel: row.embeddingModel,
      status: 'indexed',
    };
  },

  /**
   * Perform semantic search against indexed code units.
   */
  async search(
    repositoryId: string,
    ownerId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const repo = await repositoryRepository.findById(repositoryId, ownerId);
    if (!repo) {
      throw new HttpError(404, 'REPOSITORY_NOT_FOUND', 'Repository not found');
    }

    const provider = getEmbeddingProvider();

    let queryEmbedding: number[];
    try {
      const embeddings = await provider.embed([query]);
      queryEmbedding = embeddings[0]!;
    } catch (err) {
      if (err instanceof EmbeddingUnavailableError) {
        throw new HttpError(503, 'MODEL_UNAVAILABLE', err.message);
      }
      throw err;
    }

    const rows = await searchRepository.searchByVector({
      repositoryId,
      queryEmbedding,
      limit,
    });

    return rows.map((row) => ({
      id: row.id,
      repositoryId: row.repositoryId,
      analysisRunId: row.analysisRunId,
      analyzedFileId: row.analyzedFileId,
      filePath: row.filePath,
      unitKind: row.unitKind,
      unitName: row.unitName,
      startLine: row.startLine,
      endLine: row.endLine,
      contentPreview: row.contentPreview,
      embeddingModel: row.embeddingModel,
      score: Math.round(row.score * 1000) / 1000, // 3 decimal places
    }));
  },
};
