import type { AnalysisRun, AnalysisStatus, AnalyzedFile, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface CreateAnalysisRunData {
  repositoryId: string;
  status?: AnalysisStatus;
  totalFiles?: number;
  totalLines?: number;
  summary?: Prisma.InputJsonValue;
  error?: string | null;
}

export interface CreateAnalyzedFileData {
  analysisRunId: string;
  filePath: string;
  language: string;
  lineCount: number;
  codeLineCount: number;
  imports: Prisma.InputJsonValue;
  exports: Prisma.InputJsonValue;
  symbols: Prisma.InputJsonValue;
  dependencies: Prisma.InputJsonValue;
  hasErrors: boolean;
}

export const analysisRepository = {
  createRun(data: CreateAnalysisRunData): Promise<AnalysisRun> {
    return prisma.analysisRun.create({
      data: {
        repositoryId: data.repositoryId,
        status: data.status ?? 'PENDING',
        totalFiles: data.totalFiles ?? 0,
        totalLines: data.totalLines ?? 0,
        summary: data.summary,
        error: data.error,
      },
    });
  },

  updateRun(
    id: string,
    data: {
      status?: AnalysisStatus;
      totalFiles?: number;
      totalLines?: number;
      summary?: Prisma.InputJsonValue;
      error?: string | null;
      completedAt?: Date | null;
    },
  ): Promise<AnalysisRun> {
    return prisma.analysisRun.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.totalFiles !== undefined && { totalFiles: data.totalFiles }),
        ...(data.totalLines !== undefined && { totalLines: data.totalLines }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.error !== undefined && { error: data.error }),
        ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
      },
    });
  },

  findRunById(id: string): Promise<AnalysisRun | null> {
    return prisma.analysisRun.findUnique({
      where: { id },
      include: {
        repository: {
          select: { id: true, ownerId: true, name: true },
        },
      },
    });
  },

  findLatestRunByRepositoryId(repositoryId: string): Promise<AnalysisRun | null> {
    return prisma.analysisRun.findFirst({
      where: { repositoryId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createAnalyzedFiles(files: CreateAnalyzedFileData[]): Promise<void> {
    if (files.length === 0) return;
    await prisma.analyzedFile.createMany({
      data: files,
    });
  },

  findFilesByRunId(
    analysisRunId: string,
    options: {
      skip?: number;
      take?: number;
      search?: string;
      language?: string;
    },
  ): Promise<[AnalyzedFile[], number]> {
    const where: Prisma.AnalyzedFileWhereInput = {
      analysisRunId,
      ...(options.language ? { language: options.language } : {}),
      ...(options.search
        ? {
            filePath: { contains: options.search, mode: 'insensitive' },
          }
        : {}),
    };

    return Promise.all([
      prisma.analyzedFile.findMany({
        where,
        skip: options.skip ?? 0,
        take: options.take ?? 50,
        orderBy: { filePath: 'asc' },
      }),
      prisma.analyzedFile.count({ where }),
    ]);
  },

  findFileById(id: string) {
    return prisma.analyzedFile.findUnique({
      where: { id },
      include: {
        analysisRun: {
          select: {
            id: true,
            repositoryId: true,
            repository: {
              select: { ownerId: true },
            },
          },
        },
      },
    });
  },

  findAllFilesForRun(analysisRunId: string): Promise<AnalyzedFile[]> {
    return prisma.analyzedFile.findMany({
      where: { analysisRunId },
      orderBy: { filePath: 'asc' },
    });
  },
};
