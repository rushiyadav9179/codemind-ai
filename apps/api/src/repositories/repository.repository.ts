import type { Prisma, Repository, RepositoryStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface CreateRepositoryData {
  ownerId: string;
  name: string;
  description?: string | null;
  defaultBranch?: string;
  language?: string | null;
}

export interface UpdateRepositoryData {
  name?: string;
  description?: string | null;
  defaultBranch?: string;
  language?: string | null;
  status?: RepositoryStatus;
}

export interface FindManyOptions {
  skip: number;
  take: number;
  search?: string;
}

export const repositoryRepository = {
  create(data: CreateRepositoryData): Promise<Repository> {
    return prisma.repository.create({
      data: {
        ownerId: data.ownerId,
        name: data.name,
        description: data.description ?? null,
        defaultBranch: data.defaultBranch ?? 'main',
        language: data.language ?? null,
      },
    });
  },

  findById(id: string, ownerId: string): Promise<Repository | null> {
    return prisma.repository.findFirst({
      where: {
        id,
        ownerId,
      },
    });
  },

  async findMany(
    ownerId: string,
    options: FindManyOptions,
  ): Promise<{ items: Repository[]; total: number }> {
    const where: Prisma.RepositoryWhereInput = {
      ownerId,
      ...(options.search
        ? {
            OR: [
              { name: { contains: options.search, mode: 'insensitive' } },
              { description: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.repository.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      prisma.repository.count({ where }),
    ]);

    return { items, total };
  },

  async update(
    id: string,
    ownerId: string,
    data: UpdateRepositoryData,
  ): Promise<Repository | null> {
    const existing = await prisma.repository.findFirst({
      where: { id, ownerId },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    return prisma.repository.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.defaultBranch !== undefined && { defaultBranch: data.defaultBranch }),
        ...(data.language !== undefined && { language: data.language }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
  },

  async delete(id: string, ownerId: string): Promise<boolean> {
    const existing = await prisma.repository.findFirst({
      where: { id, ownerId },
      select: { id: true },
    });

    if (!existing) {
      return false;
    }

    await prisma.repository.delete({
      where: { id },
    });

    return true;
  },
};
