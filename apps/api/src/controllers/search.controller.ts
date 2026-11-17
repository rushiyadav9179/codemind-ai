import type { Request, Response } from 'express';
import { z } from 'zod';
import type { ApiResponse } from '@codemind/shared';
import type { IndexStatus, SearchResult } from '@codemind/shared';
import { HttpError } from '../middleware/errorHandler';
import { searchService } from '../services/search.service';

const repositoryIdSchema = z.object({
  id: z.string().uuid('Invalid repository ID'),
});

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Query is required').max(500, 'Query must be at most 500 characters'),
  limit: z.coerce.number().int().positive().max(30).default(10),
});

function getAuthUserId(req: Request): string {
  if (!req.auth) throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required');
  return req.auth.userId;
}

export const searchController = {
  async indexRepository(req: Request, res: Response): Promise<void> {
    const ownerId = getAuthUserId(req);
    const { id: repositoryId } = repositoryIdSchema.parse(req.params);
    const status = await searchService.indexRepository(repositoryId, ownerId);
    const response: ApiResponse<IndexStatus> = {
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  },

  async getIndexStatus(req: Request, res: Response): Promise<void> {
    const ownerId = getAuthUserId(req);
    const { id: repositoryId } = repositoryIdSchema.parse(req.params);
    const status = await searchService.getIndexStatus(repositoryId, ownerId);
    const response: ApiResponse<IndexStatus> = {
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  },

  async search(req: Request, res: Response): Promise<void> {
    const ownerId = getAuthUserId(req);
    const { id: repositoryId } = repositoryIdSchema.parse(req.params);
    const { q: query, limit } = searchQuerySchema.parse(req.query);
    const results = await searchService.search(repositoryId, ownerId, query, limit);
    const response: ApiResponse<SearchResult[]> = {
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
    };
    res.status(200).json(response);
  },
};
