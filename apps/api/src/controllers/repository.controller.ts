import type { Request, Response } from 'express';
import type { ApiResponse, PaginatedRepositories, Repository } from '@codemind/shared';
import { z } from 'zod';
import { HttpError } from '../middleware/errorHandler';
import { repositoryService } from '../services/repository.service';

const idParamSchema = z.object({
  id: z.string().uuid('Invalid repository ID'),
});

const repositoryNameRegex = /^[a-zA-Z0-9._-]+$/;

const createRepositorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Repository name is required')
      .max(100, 'Name must be 100 characters or fewer')
      .regex(
        repositoryNameRegex,
        'Name must contain only letters, numbers, hyphens, periods, or underscores',
      ),
    description: z
      .string()
      .trim()
      .max(500, 'Description must be 500 characters or fewer')
      .optional()
      .nullable(),
    defaultBranch: z.string().trim().min(1).max(100).optional(),
    language: z.string().trim().min(1).max(50).optional().nullable(),
  })
  .strict();

const updateRepositorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Repository name cannot be empty')
      .max(100, 'Name must be 100 characters or fewer')
      .regex(
        repositoryNameRegex,
        'Name must contain only letters, numbers, hyphens, periods, or underscores',
      )
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description must be 500 characters or fewer')
      .optional()
      .nullable(),
    defaultBranch: z.string().trim().min(1).max(100).optional(),
    language: z.string().trim().min(1).max(50).optional().nullable(),
    status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'At least one field must be provided for update');

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().max(100).optional(),
});

function getAuthenticatedUserId(req: Request): string {
  if (!req.auth) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required');
  }
  return req.auth.userId;
}

export const repositoryController = {
  async create(req: Request, res: Response): Promise<void> {
    const ownerId = getAuthenticatedUserId(req);
    const input = createRepositorySchema.parse(req.body);

    const repository = await repositoryService.create(ownerId, input);

    const response: ApiResponse<Repository> = {
      success: true,
      data: repository,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  },

  async list(req: Request, res: Response): Promise<void> {
    const ownerId = getAuthenticatedUserId(req);
    const query = listQuerySchema.parse(req.query);

    const result = await repositoryService.list(ownerId, query);

    const response: ApiResponse<PaginatedRepositories> = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  },

  async getById(req: Request, res: Response): Promise<void> {
    const ownerId = getAuthenticatedUserId(req);
    const { id } = idParamSchema.parse(req.params);

    const repository = await repositoryService.getById(id, ownerId);

    const response: ApiResponse<Repository> = {
      success: true,
      data: repository,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  },

  async update(req: Request, res: Response): Promise<void> {
    const ownerId = getAuthenticatedUserId(req);
    const { id } = idParamSchema.parse(req.params);
    const input = updateRepositorySchema.parse(req.body);

    const updated = await repositoryService.update(id, ownerId, input);

    const response: ApiResponse<Repository> = {
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  },

  async delete(req: Request, res: Response): Promise<void> {
    const ownerId = getAuthenticatedUserId(req);
    const { id } = idParamSchema.parse(req.params);

    await repositoryService.delete(id, ownerId);

    const response: ApiResponse<{ deleted: true; id: string }> = {
      success: true,
      data: { deleted: true, id },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(response);
  },
};
