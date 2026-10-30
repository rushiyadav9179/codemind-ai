import type { Request, Response } from 'express';
import type {
  AnalysisRun,
  AnalyzedFileDetail,
  AnalyzedFileSummary,
  ApiResponse,
  DependencyGraph,
  PaginationMeta,
} from '@codemind/shared';
import { z } from 'zod';
import { HttpError } from '../middleware/errorHandler';
import { analysisService } from '../services/analysis.service';

const ingestSchema = z
  .object({
    files: z
      .array(
        z.object({
          filePath: z.string().trim().min(1, 'filePath is required'),
          content: z.string(),
        }),
      )
      .min(1, 'At least one file must be provided')
      .max(50, 'A maximum of 50 files can be uploaded per batch'),
  })
  .strict();

const repositoryIdParamSchema = z.object({
  id: z.string().uuid('Invalid repository ID'),
});

const analysisIdParamSchema = z.object({
  id: z.string().uuid('Invalid repository ID'),
  analysisId: z.string().uuid('Invalid analysis ID'),
});

const fileIdParamSchema = z.object({
  id: z.string().uuid('Invalid repository ID'),
  analysisId: z.string().uuid('Invalid analysis ID'),
  fileId: z.string().uuid('Invalid file ID'),
});

const listFilesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().max(100).optional(),
  language: z.string().trim().max(50).optional(),
});

function getAuthenticatedUserId(req: Request): string {
  if (!req.auth) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required');
  }
  return req.auth.userId;
}

export const analysisController = {
  async ingestAndAnalyze(req: Request, res: Response): Promise<void> {
    const ownerId = getAuthenticatedUserId(req);
    const { id: repositoryId } = repositoryIdParamSchema.parse(req.params);
    const { files } = ingestSchema.parse(req.body);

    const result = await analysisService.ingestAndAnalyze(repositoryId, ownerId, files);

    const response: ApiResponse<AnalysisRun> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  },

  async getLatestRun(req: Request, res: Response): Promise<void> {
    const ownerId = getAuthenticatedUserId(req);
    const { id: repositoryId } = repositoryIdParamSchema.parse(req.params);

    const result = await analysisService.getLatestRun(repositoryId, ownerId);

    const response: ApiResponse<AnalysisRun | null> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  },

  async getRunById(req: Request, res: Response): Promise<void> {
    const ownerId = getAuthenticatedUserId(req);
    const { id: repositoryId, analysisId } = analysisIdParamSchema.parse(req.params);

    const result = await analysisService.getRunById(repositoryId, analysisId, ownerId);

    const response: ApiResponse<AnalysisRun> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  },

  async listFiles(req: Request, res: Response): Promise<void> {
    const ownerId = getAuthenticatedUserId(req);
    const { id: repositoryId, analysisId } = analysisIdParamSchema.parse(req.params);
    const query = listFilesQuerySchema.parse(req.query);

    const result = await analysisService.listAnalyzedFiles(
      repositoryId,
      analysisId,
      ownerId,
      query,
    );

    const response: ApiResponse<{
      items: AnalyzedFileSummary[];
      pagination: PaginationMeta;
    }> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  },

  async getFileDetail(req: Request, res: Response): Promise<void> {
    const ownerId = getAuthenticatedUserId(req);
    const { id: repositoryId, analysisId, fileId } = fileIdParamSchema.parse(req.params);

    const result = await analysisService.getAnalyzedFileDetail(
      repositoryId,
      analysisId,
      fileId,
      ownerId,
    );

    const response: ApiResponse<AnalyzedFileDetail> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  },

  async getDependencyGraph(req: Request, res: Response): Promise<void> {
    const ownerId = getAuthenticatedUserId(req);
    const { id: repositoryId, analysisId } = analysisIdParamSchema.parse(req.params);

    const result = await analysisService.getDependencyGraph(repositoryId, analysisId, ownerId);

    const response: ApiResponse<DependencyGraph> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  },
};
