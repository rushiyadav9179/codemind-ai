import type {
  AnalysisRun as SharedAnalysisRun,
  AnalysisSummary,
  AnalyzedFileDetail,
  AnalyzedFileSummary,
  CodeExport,
  CodeImport,
  DependencyEdge,
  DependencyGraph,
  FileSymbols,
  IngestFileInput,
} from '@codemind/shared';
import type { AnalyzedFile, AnalysisRun } from '@prisma/client';
import { IngestionValidationError, validateBatch } from '../lib/ingestion';
import { isSupportedSourceFile, parseSourceFile, resolveIntraRepoDependency } from '../lib/parser';
import { HttpError } from '../middleware/errorHandler';
import { analysisRepository } from '../repositories/analysis.repository';
import { repositoryRepository } from '../repositories/repository.repository';

function mapAnalysisRun(record: AnalysisRun): SharedAnalysisRun {
  return {
    id: record.id,
    repositoryId: record.repositoryId,
    status: record.status,
    totalFiles: record.totalFiles,
    totalLines: record.totalLines,
    summary: record.summary ? (record.summary as unknown as AnalysisSummary) : null,
    error: record.error,
    createdAt: record.createdAt.toISOString(),
    completedAt: record.completedAt ? record.completedAt.toISOString() : null,
  };
}

function mapFileSummary(file: AnalyzedFile): AnalyzedFileSummary {
  const imports = file.imports as unknown as CodeImport[];
  const exports = file.exports as unknown as CodeExport[];
  const symbols = file.symbols as unknown as FileSymbols;

  const symbolCount =
    (symbols.functions?.length ?? 0) +
    (symbols.classes?.length ?? 0) +
    (symbols.types?.length ?? 0);

  return {
    id: file.id,
    analysisRunId: file.analysisRunId,
    filePath: file.filePath,
    language: file.language,
    lineCount: file.lineCount,
    codeLineCount: file.codeLineCount,
    importCount: imports?.length ?? 0,
    exportCount: exports?.length ?? 0,
    symbolCount,
    hasErrors: file.hasErrors,
  };
}

function mapFileDetail(file: AnalyzedFile): AnalyzedFileDetail {
  const summary = mapFileSummary(file);
  return {
    ...summary,
    imports: (file.imports as unknown as CodeImport[]) ?? [],
    exports: (file.exports as unknown as CodeExport[]) ?? [],
    symbols: (file.symbols as unknown as FileSymbols) ?? {
      functions: [],
      classes: [],
      types: [],
    },
    dependencies: (file.dependencies as unknown as string[]) ?? [],
  };
}

export const analysisService = {
  /**
   * Ingests files and performs AST parsing, dependency graph resolution, and metadata persistence.
   */
  async ingestAndAnalyze(
    repositoryId: string,
    ownerId: string,
    rawFiles: IngestFileInput[],
  ): Promise<SharedAnalysisRun> {
    // 1. Verify repository ownership
    const repo = await repositoryRepository.findById(repositoryId, ownerId);
    if (!repo) {
      throw new HttpError(404, 'REPOSITORY_NOT_FOUND', 'Repository not found');
    }

    // 2. Validate and sanitize batch
    let validatedFiles;
    try {
      validatedFiles = validateBatch(rawFiles);
    } catch (err) {
      if (err instanceof IngestionValidationError) {
        throw new HttpError(400, 'INGESTION_VALIDATION_ERROR', err.message);
      }
      throw err;
    }

    // 3. Create analysis run in database (status: IN_PROGRESS)
    const run = await analysisRepository.createRun({
      repositoryId,
      status: 'IN_PROGRESS',
      totalFiles: validatedFiles.length,
    });

    try {
      // 4. Parse supported files
      const allPaths = validatedFiles.map((f) => f.filePath);
      const parsedResults = [];
      let totalLines = 0;
      let totalCodeLines = 0;
      let totalFunctions = 0;
      let totalClasses = 0;
      let totalTypes = 0;
      const languageDistribution: Record<string, number> = {};
      const externalDependencyCounts: Record<string, number> = {};
      let internalDepCount = 0;

      for (const file of validatedFiles) {
        if (!isSupportedSourceFile(file.filePath)) {
          // Unsupported file: count lines, save minimal record
          const lineCount = file.content.split(/\r?\n/).length;
          totalLines += lineCount;
          parsedResults.push({
            analysisRunId: run.id,
            filePath: file.filePath,
            language: 'unsupported',
            lineCount,
            codeLineCount: lineCount,
            imports: [],
            exports: [],
            symbols: { functions: [], classes: [], types: [] },
            dependencies: [],
            hasErrors: false,
          });
          continue;
        }

        const parsed = parseSourceFile(file.filePath, file.content);
        totalLines += parsed.lineCount;
        totalCodeLines += parsed.codeLineCount;
        totalFunctions += parsed.symbols.functions.length;
        totalClasses += parsed.symbols.classes.length;
        totalTypes += parsed.symbols.types.length;

        languageDistribution[parsed.language] = (languageDistribution[parsed.language] ?? 0) + 1;

        // Resolve dependencies
        const resolvedDeps: string[] = [];
        for (const imp of parsed.imports) {
          if (imp.isRelative) {
            const resolved = resolveIntraRepoDependency(file.filePath, imp.source, allPaths);
            if (resolved) {
              resolvedDeps.push(resolved);
              internalDepCount++;
            }
          } else {
            // External library
            const pkgName = imp.source.startsWith('@')
              ? imp.source.split('/').slice(0, 2).join('/')
              : imp.source.split('/')[0] || imp.source;
            if (pkgName) {
              externalDependencyCounts[pkgName] = (externalDependencyCounts[pkgName] ?? 0) + 1;
            }
          }
        }

        parsedResults.push({
          analysisRunId: run.id,
          filePath: parsed.filePath,
          language: parsed.language,
          lineCount: parsed.lineCount,
          codeLineCount: parsed.codeLineCount,
          imports: parsed.imports as unknown as object,
          exports: parsed.exports as unknown as object,
          symbols: parsed.symbols as unknown as object,
          dependencies: Array.from(new Set(resolvedDeps)) as unknown as object,
          hasErrors: parsed.hasErrors,
        });
      }

      // 5. Bulk insert analyzed files
      await analysisRepository.createAnalyzedFiles(parsedResults);

      // Top external dependencies
      const topExternalDependencies = Object.entries(externalDependencyCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const externalDepCount = Object.values(externalDependencyCounts).reduce(
        (sum, count) => sum + count,
        0,
      );

      const summary: AnalysisSummary = {
        totalFiles: parsedResults.length,
        totalLines,
        totalCodeLines,
        languages: languageDistribution,
        totalFunctions,
        totalClasses,
        totalTypes,
        internalDependencyCount: internalDepCount,
        externalDependencyCount: externalDepCount,
        topExternalDependencies,
      };

      // 6. Complete analysis run
      const completedRun = await analysisRepository.updateRun(run.id, {
        status: 'COMPLETED',
        totalFiles: parsedResults.length,
        totalLines,
        summary: summary as unknown as object,
        completedAt: new Date(),
      });

      return mapAnalysisRun(completedRun);
    } catch (err) {
      await analysisRepository.updateRun(run.id, {
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Analysis failed',
        completedAt: new Date(),
      });
      throw err;
    }
  },

  async getLatestRun(repositoryId: string, ownerId: string): Promise<SharedAnalysisRun | null> {
    const repo = await repositoryRepository.findById(repositoryId, ownerId);
    if (!repo) {
      throw new HttpError(404, 'REPOSITORY_NOT_FOUND', 'Repository not found');
    }

    const latest = await analysisRepository.findLatestRunByRepositoryId(repositoryId);
    return latest ? mapAnalysisRun(latest) : null;
  },

  async getRunById(
    repositoryId: string,
    analysisId: string,
    ownerId: string,
  ): Promise<SharedAnalysisRun> {
    const repo = await repositoryRepository.findById(repositoryId, ownerId);
    if (!repo) {
      throw new HttpError(404, 'REPOSITORY_NOT_FOUND', 'Repository not found');
    }

    const run = await analysisRepository.findRunById(analysisId);
    if (!run || run.repositoryId !== repositoryId) {
      throw new HttpError(404, 'ANALYSIS_NOT_FOUND', 'Analysis run not found');
    }

    return mapAnalysisRun(run);
  },

  async listAnalyzedFiles(
    repositoryId: string,
    analysisId: string,
    ownerId: string,
    options: { page: number; limit: number; search?: string; language?: string },
  ) {
    const repo = await repositoryRepository.findById(repositoryId, ownerId);
    if (!repo) {
      throw new HttpError(404, 'REPOSITORY_NOT_FOUND', 'Repository not found');
    }

    const run = await analysisRepository.findRunById(analysisId);
    if (!run || run.repositoryId !== repositoryId) {
      throw new HttpError(404, 'ANALYSIS_NOT_FOUND', 'Analysis run not found');
    }

    const skip = (options.page - 1) * options.limit;
    const [files, totalItems] = await analysisRepository.findFilesByRunId(analysisId, {
      skip,
      take: options.limit,
      search: options.search,
      language: options.language,
    });

    const totalPages = Math.max(1, Math.ceil(totalItems / options.limit));

    return {
      items: files.map(mapFileSummary),
      pagination: {
        page: options.page,
        limit: options.limit,
        totalItems,
        totalPages,
        hasNextPage: options.page < totalPages,
        hasPrevPage: options.page > 1,
      },
    };
  },

  async getAnalyzedFileDetail(
    repositoryId: string,
    analysisId: string,
    fileId: string,
    ownerId: string,
  ): Promise<AnalyzedFileDetail> {
    const repo = await repositoryRepository.findById(repositoryId, ownerId);
    if (!repo) {
      throw new HttpError(404, 'REPOSITORY_NOT_FOUND', 'Repository not found');
    }

    const file = await analysisRepository.findFileById(fileId);
    if (
      !file ||
      file.analysisRunId !== analysisId ||
      file.analysisRun?.repositoryId !== repositoryId
    ) {
      throw new HttpError(404, 'FILE_NOT_FOUND', 'Analyzed file not found');
    }

    return mapFileDetail(file);
  },

  async getDependencyGraph(
    repositoryId: string,
    analysisId: string,
    ownerId: string,
  ): Promise<DependencyGraph> {
    const repo = await repositoryRepository.findById(repositoryId, ownerId);
    if (!repo) {
      throw new HttpError(404, 'REPOSITORY_NOT_FOUND', 'Repository not found');
    }

    const run = await analysisRepository.findRunById(analysisId);
    if (!run || run.repositoryId !== repositoryId) {
      throw new HttpError(404, 'ANALYSIS_NOT_FOUND', 'Analysis run not found');
    }

    const files = await analysisRepository.findAllFilesForRun(analysisId);

    const nodesMap = new Map<
      string,
      { id: string; label: string; language?: string; isExternal?: boolean }
    >();
    const edges: DependencyEdge[] = [];

    // Internal nodes
    for (const file of files) {
      nodesMap.set(file.filePath, {
        id: file.filePath,
        label: file.filePath,
        language: file.language,
        isExternal: false,
      });

      const internalDeps = (file.dependencies as unknown as string[]) || [];
      for (const target of internalDeps) {
        edges.push({
          source: file.filePath,
          target,
          isExternal: false,
        });
      }

      // External imports
      const imports = (file.imports as unknown as CodeImport[]) || [];
      for (const imp of imports) {
        if (!imp.isRelative) {
          const pkg = imp.source.startsWith('@')
            ? imp.source.split('/').slice(0, 2).join('/')
            : imp.source.split('/')[0] || imp.source;
          const extId = `ext:${pkg}`;
          if (!nodesMap.has(extId)) {
            nodesMap.set(extId, {
              id: extId,
              label: pkg,
              isExternal: true,
            });
          }
          edges.push({
            source: file.filePath,
            target: extId,
            isExternal: true,
          });
        }
      }
    }

    return {
      nodes: Array.from(nodesMap.values()),
      edges,
    };
  },
};
