import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { Express } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import type {
  AnalysisRun,
  AnalyzedFileDetail,
  AnalyzedFileSummary,
  DependencyGraph,
  PaginationMeta,
} from '@codemind/shared';

const origin = 'http://localhost:5173';
const password = 'StrongPassword123!';
const emails: string[] = [];
let app: Express;
let forwardedIpOctet = 80;

function uniqueEmail(): string {
  const email = `phase4-${randomUUID()}@example.test`;
  emails.push(email);
  return email;
}

function fromClient(agent: ReturnType<typeof request.agent>) {
  const ip = `198.51.100.${forwardedIpOctet++}`;
  return {
    post(path: string) {
      return agent.post(path).set('Origin', origin).set('X-Forwarded-For', ip);
    },
    get(path: string) {
      return agent.get(path).set('Origin', origin).set('X-Forwarded-For', ip);
    },
    delete(path: string) {
      return agent.delete(path).set('Origin', origin).set('X-Forwarded-For', ip);
    },
  };
}

async function createAuthenticatedUser(email = uniqueEmail()) {
  const agent = request.agent(app);
  const client = fromClient(agent);
  const registerRes = await client.post('/api/v1/auth/register').send({ email, password });
  const accessToken = registerRes.body.data.accessToken as string;
  const user = registerRes.body.data.user;

  const authClient = {
    post(path: string) {
      return client.post(path).set('Authorization', `Bearer ${accessToken}`);
    },
    get(path: string) {
      return client.get(path).set('Authorization', `Bearer ${accessToken}`);
    },
    delete(path: string) {
      return client.delete(path).set('Authorization', `Bearer ${accessToken}`);
    },
  };

  return { client: authClient, rawClient: client, user, accessToken };
}

beforeAll(() => {
  app = createApp();
  app.set('trust proxy', 1);
});

afterAll(async () => {
  if (emails.length) {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }
  await prisma.$disconnect();
});

describe('Code Intelligence Engine — Endpoints', () => {
  it('requires authentication for analysis endpoints', async () => {
    const unauthenticated = fromClient(request.agent(app));
    const randomRepoId = randomUUID();
    const randomAnalysisId = randomUUID();

    const postRes = await unauthenticated
      .post(`/api/v1/repositories/${randomRepoId}/analysis`)
      .send({ files: [{ filePath: 'src/index.ts', content: 'console.log(1);' }] });
    expect(postRes.status).toBe(401);
    expect(postRes.body.error.code).toBe('UNAUTHENTICATED');

    const latestRes = await unauthenticated.get(
      `/api/v1/repositories/${randomRepoId}/analysis/latest`,
    );
    expect(latestRes.status).toBe(401);

    const getRes = await unauthenticated.get(
      `/api/v1/repositories/${randomRepoId}/analysis/${randomAnalysisId}`,
    );
    expect(getRes.status).toBe(401);

    const filesRes = await unauthenticated.get(
      `/api/v1/repositories/${randomRepoId}/analysis/${randomAnalysisId}/files`,
    );
    expect(filesRes.status).toBe(401);

    const depsRes = await unauthenticated.get(
      `/api/v1/repositories/${randomRepoId}/analysis/${randomAnalysisId}/dependencies`,
    );
    expect(depsRes.status).toBe(401);
  });

  it('ingests source files and returns a completed analysis run with AST summary metrics', async () => {
    const { client } = await createAuthenticatedUser();

    // Create repository
    const repoRes = await client.post('/api/v1/repositories').send({
      name: 'platform-core',
      description: 'Intelligence testing repository',
    });
    const repoId = repoRes.body.data.id;

    // Ingest files
    const sampleFiles = [
      {
        filePath: 'src/types/user.ts',
        content: `
          export interface UserProfile {
            id: string;
            email: string;
          }
          export type Role = 'USER' | 'ADMIN';
        `,
      },
      {
        filePath: 'src/services/userService.ts',
        content: `
          import { UserProfile } from '../types/user';
          import axios from 'axios';

          export class UserService {
            public async getUser(id: string): Promise<UserProfile> {
              return { id, email: 'test@example.com' };
            }
          }

          export function hashEmail(email: string): string {
            return email.toLowerCase();
          }
        `,
      },
      {
        filePath: 'src/index.ts',
        content: `
          import { UserService, hashEmail } from './services/userService';
          export const service = new UserService();
        `,
      },
    ];

    const ingestRes = await client
      .post(`/api/v1/repositories/${repoId}/analysis`)
      .send({ files: sampleFiles });

    expect(ingestRes.status).toBe(201);
    const run = ingestRes.body.data as AnalysisRun;
    expect(run.status).toBe('COMPLETED');
    expect(run.totalFiles).toBe(3);
    expect(run.totalLines).toBeGreaterThan(15);
    expect(run.summary).toBeDefined();
    expect(run.summary?.totalFunctions).toBeGreaterThanOrEqual(1);
    expect(run.summary?.totalClasses).toBe(1);
    expect(run.summary?.totalTypes).toBe(2);
    expect(run.summary?.languages['typescript']).toBe(3);
    expect(run.summary?.internalDependencyCount).toBe(2);
    expect(run.summary?.externalDependencyCount).toBe(1);
    expect(run.summary?.topExternalDependencies).toContainEqual({ name: 'axios', count: 1 });
  });

  it('enforces multi-tenant isolation: User B cannot access User A analysis results', async () => {
    const userA = await createAuthenticatedUser();
    const userB = await createAuthenticatedUser();

    const repoA = await userA.client.post('/api/v1/repositories').send({ name: 'repo-user-a' });
    const repoAId = repoA.body.data.id;

    const analysisRes = await userA.client.post(`/api/v1/repositories/${repoAId}/analysis`).send({
      files: [{ filePath: 'src/secret.ts', content: 'export const secretKey = "super-secret";' }],
    });
    const analysisId = analysisRes.body.data.id;

    // User B tries to get latest analysis of User A's repo -> 404
    const getLatestRes = await userB.client.get(`/api/v1/repositories/${repoAId}/analysis/latest`);
    expect(getLatestRes.status).toBe(404);
    expect(getLatestRes.body.error.code).toBe('REPOSITORY_NOT_FOUND');

    // User B tries to get specific analysis of User A's repo -> 404
    const getRunRes = await userB.client.get(
      `/api/v1/repositories/${repoAId}/analysis/${analysisId}`,
    );
    expect(getRunRes.status).toBe(404);

    // User B tries to trigger ingestion on User A's repo -> 404
    const triggerRes = await userB.client
      .post(`/api/v1/repositories/${repoAId}/analysis`)
      .send({ files: [{ filePath: 'src/hack.ts', content: 'console.log(1);' }] });
    expect(triggerRes.status).toBe(404);
  });

  it('rejects path traversal and sensitive files during ingestion', async () => {
    const { client } = await createAuthenticatedUser();
    const repoRes = await client.post('/api/v1/repositories').send({ name: 'security-test' });
    const repoId = repoRes.body.data.id;

    // Path traversal attempt
    const traversalRes = await client
      .post(`/api/v1/repositories/${repoId}/analysis`)
      .send({ files: [{ filePath: '../outside.ts', content: 'export const x = 1;' }] });
    expect(traversalRes.status).toBe(400);
    expect(traversalRes.body.error.code).toBe('INGESTION_VALIDATION_ERROR');

    // Sensitive file (.env)
    const envRes = await client
      .post(`/api/v1/repositories/${repoId}/analysis`)
      .send({ files: [{ filePath: '.env', content: 'SECRET=123' }] });
    expect(envRes.status).toBe(400);

    // Node modules file
    const nodeModulesRes = await client
      .post(`/api/v1/repositories/${repoId}/analysis`)
      .send({ files: [{ filePath: 'node_modules/pkg/index.js', content: 'console.log(1);' }] });
    expect(nodeModulesRes.status).toBe(400);
  });

  it('lists analyzed files with pagination, search, and retrieves detailed AST symbols', async () => {
    const { client } = await createAuthenticatedUser();
    const repoRes = await client.post('/api/v1/repositories').send({ name: 'symbols-test' });
    const repoId = repoRes.body.data.id;

    const files = [
      {
        filePath: 'src/components/Button.tsx',
        content: `
          export interface ButtonProps {
            label: string;
            onClick: () => void;
          }
          export function Button({ label }: ButtonProps) {
            return label;
          }
        `,
      },
      {
        filePath: 'src/utils/math.ts',
        content: `
          export function add(a: number, b: number): number {
            return a + b;
          }
        `,
      },
    ];

    const runRes = await client.post(`/api/v1/repositories/${repoId}/analysis`).send({ files });
    const analysisId = runRes.body.data.id;

    // List files
    const listRes = await client.get(
      `/api/v1/repositories/${repoId}/analysis/${analysisId}/files?limit=1&page=1`,
    );
    expect(listRes.status).toBe(200);
    const listData = listRes.body.data as {
      items: AnalyzedFileSummary[];
      pagination: PaginationMeta;
    };
    expect(listData.items).toHaveLength(1);
    expect(listData.pagination.totalItems).toBe(2);
    expect(listData.pagination.totalPages).toBe(2);

    // Search files
    const searchRes = await client.get(
      `/api/v1/repositories/${repoId}/analysis/${analysisId}/files?search=Button`,
    );
    expect(searchRes.status).toBe(200);
    const searchData = searchRes.body.data as { items: AnalyzedFileSummary[] };
    expect(searchData.items).toHaveLength(1);
    const buttonFileId = searchData.items[0]!.id;

    // Get file detail
    const detailRes = await client.get(
      `/api/v1/repositories/${repoId}/analysis/${analysisId}/files/${buttonFileId}`,
    );
    expect(detailRes.status).toBe(200);
    const detailData = detailRes.body.data as AnalyzedFileDetail;
    expect(detailData.filePath).toBe('src/components/Button.tsx');
    expect(detailData.symbols.types).toHaveLength(1);
    expect(detailData.symbols.types[0]!.name).toBe('ButtonProps');
    expect(detailData.symbols.functions).toHaveLength(1);
    expect(detailData.symbols.functions[0]!.name).toBe('Button');
  });

  it('retrieves the resolved dependency graph for an analysis run', async () => {
    const { client } = await createAuthenticatedUser();
    const repoRes = await client.post('/api/v1/repositories').send({ name: 'graph-test' });
    const repoId = repoRes.body.data.id;

    const files = [
      {
        filePath: 'src/logger.ts',
        content: `import pino from 'pino'; export const log = pino();`,
      },
      {
        filePath: 'src/app.ts',
        content: `import { log } from './logger'; log.info('started');`,
      },
    ];

    const runRes = await client.post(`/api/v1/repositories/${repoId}/analysis`).send({ files });
    const analysisId = runRes.body.data.id;

    const graphRes = await client.get(
      `/api/v1/repositories/${repoId}/analysis/${analysisId}/dependencies`,
    );
    expect(graphRes.status).toBe(200);
    const graph = graphRes.body.data as DependencyGraph;
    expect(graph.nodes.length).toBeGreaterThanOrEqual(2);

    // Internal edge
    const internalEdge = graph.edges.find((e) => e.source === 'src/app.ts' && !e.isExternal);
    expect(internalEdge).toBeDefined();
    expect(internalEdge?.target).toBe('src/logger.ts');

    // External edge
    const externalEdge = graph.edges.find((e) => e.isExternal);
    expect(externalEdge).toBeDefined();
    expect(externalEdge?.target).toBe('ext:pino');
  });
});
