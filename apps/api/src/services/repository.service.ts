import { Prisma } from '@prisma/client';
import type { Repository as PrismaRepository } from '@prisma/client';
import type {
  CreateRepositoryInput,
  PaginatedRepositories,
  Repository as SharedRepository,
  UpdateRepositoryInput,
} from '@codemind/shared';
import { HttpError } from '../middleware/errorHandler';
import { repositoryRepository } from '../repositories/repository.repository';

function serializeRepository(repo: PrismaRepository): SharedRepository {
  return {
    id: repo.id,
    ownerId: repo.ownerId,
    name: repo.name,
    description: repo.description,
    sourceType: repo.sourceType,
    defaultBranch: repo.defaultBranch,
    language: repo.language,
    status: repo.status,
    createdAt: repo.createdAt.toISOString(),
    updatedAt: repo.updatedAt.toISOString(),
  };
}

export const repositoryService = {
  async create(ownerId: string, input: CreateRepositoryInput): Promise<SharedRepository> {
    try {
      const created = await repositoryRepository.create({
        ownerId,
        name: input.name,
        description: input.description,
        defaultBranch: input.defaultBranch,
        language: input.language,
      });
      return serializeRepository(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'REPOSITORY_EXISTS', 'A repository with this name already exists');
      }
      throw error;
    }
  },

  async getById(id: string, ownerId: string): Promise<SharedRepository> {
    const repo = await repositoryRepository.findById(id, ownerId);
    if (!repo) {
      throw new HttpError(404, 'REPOSITORY_NOT_FOUND', 'Repository not found');
    }
    return serializeRepository(repo);
  },

  async list(
    ownerId: string,
    options: { page: number; limit: number; search?: string },
  ): Promise<PaginatedRepositories> {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;
    const { items, total } = await repositoryRepository.findMany(ownerId, {
      skip,
      take: limit,
      search,
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items: items.map(serializeRepository),
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  },

  async update(
    id: string,
    ownerId: string,
    input: UpdateRepositoryInput,
  ): Promise<SharedRepository> {
    try {
      const updated = await repositoryRepository.update(id, ownerId, input);
      if (!updated) {
        throw new HttpError(404, 'REPOSITORY_NOT_FOUND', 'Repository not found');
      }
      return serializeRepository(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new HttpError(409, 'REPOSITORY_EXISTS', 'A repository with this name already exists');
      }
      throw error;
    }
  },

  async delete(id: string, ownerId: string): Promise<void> {
    const deleted = await repositoryRepository.delete(id, ownerId);
    if (!deleted) {
      throw new HttpError(404, 'REPOSITORY_NOT_FOUND', 'Repository not found');
    }
  },
};
