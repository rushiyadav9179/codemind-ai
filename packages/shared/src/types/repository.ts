export type RepositorySourceType = 'MANUAL';
export type RepositoryStatus = 'ACTIVE' | 'ARCHIVED';

export interface Repository {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  sourceType: RepositorySourceType;
  defaultBranch: string;
  language: string | null;
  status: RepositoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRepositoryInput {
  name: string;
  description?: string | null;
  defaultBranch?: string;
  language?: string | null;
}

export interface UpdateRepositoryInput {
  name?: string;
  description?: string | null;
  defaultBranch?: string;
  language?: string | null;
  status?: RepositoryStatus;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedRepositories {
  items: Repository[];
  pagination: PaginationMeta;
}
