import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { Express } from 'express';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { setEmbeddingProvider, EMBEDDING_DIMENSION } from '../src/lib/embedding';
import type { EmbeddingProvider } from '../src/lib/embedding';
import type { IndexStatus, SearchResult } from '@codemind/shared';

const origin = 'http://localhost:5173';
const password = 'StrongPassword123!';
const emails: string[] = [];
let app: Express;
let forwardedIpOctet = 150;

/** Mock embedding provider — returns deterministic 768-dim vectors */
const mockProvider: EmbeddingProvider = {
  modelId: 'test-model',
  dimension: EMBEDDING_DIMENSION,
  embed: async (texts: string[]) => texts.map(() => Array(EMBEDDING_DIMENSION).fill(0.1)),
};

function uniqueEmail(): string {
  const email = `phase5-${randomUUID()}@example.test`;
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
    patch(path: string) {
      return agent.patch(path).set('Origin', origin).set('X-Forwarded-For', ip);
    },
  };
}

async function createAuthenticatedUser(email = uniqueEmail()) {
  const agent = request.agent(app);
  const client = fromClient(agent);
  const registerRes = await client.post('/api/v1/auth/register').send({ email, password });
  const accessToken = registerRes.body.data.accessToken as string;

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
    patch(path: string) {
      return client.patch(path).set('Authorization', `Bearer ${accessToken}`);
    },
  };

  return { client: authClient, rawClient: client, accessToken };
}

/** Creates a repo, ingests files, and runs analysis — returns { repoId, analysisRunId } */
async function setupIndexedRepo(
  client: Awaited<ReturnType<typeof createAuthenticatedUser>>['client'],
) {
  const repoRes = await client
    .post('/api/v1/repositories')
    .send({ name: `search-${randomUUID()}` });
  expect(repoRes.status).toBe(201);
  const repoId = repoRes.body.data.id as string;

  const files = [
    {
      filePath: 'src/auth/tokenService.ts',
      content: `
export class TokenService {
  async rotateRefreshToken(oldToken: string): Promise<string> {
    // Invalidate old token and generate new one
    const newToken = generateSecureToken();
    return newToken;
  }
  async validateAccessToken(token: string): Promise<boolean> {
    return token.length > 0;
  }
}
function generateSecureToken(): string { return 'token'; }
export type TokenPayload = { userId: string; exp: number };
      `.trim(),
    },
    {
      filePath: 'src/db/prismaClient.ts',
      content: [
        "import { PrismaClient } from '@prisma/client';",
        'export const prismaClient = new PrismaClient();',
        'export async function queryDatabase(query: string): Promise<unknown[]> {',
        '  return prismaClient.$queryRawUnsafe(query);',
        '}',
      ].join('\n'),
    },
  ];

  const analysisRes = await client.post(`/api/v1/repositories/${repoId}/analysis`).send({ files });
  expect(analysisRes.status).toBe(201);
  const analysisRunId = analysisRes.body.data.id as string;

  return { repoId, analysisRunId };
}

beforeAll(() => {
  app = createApp();
  app.set('trust proxy', 1);
  // Inject mock provider for all tests in this suite
  setEmbeddingProvider(mockProvider);
});

afterEach(() => {
  // Keep mock provider between tests; reset only if a specific test changes it
  setEmbeddingProvider(mockProvider);
});

afterAll(async () => {
  setEmbeddingProvider(null);
  if (emails.length) {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }
  await prisma.$disconnect();
});

describe('GET /api/v1/repositories/:id/search/status', () => {
  it('returns not_indexed for a fresh repository', async () => {
    const { client } = await createAuthenticatedUser();
    const repoRes = await client
      .post('/api/v1/repositories')
      .send({ name: `fresh-${randomUUID()}` });
    const repoId = repoRes.body.data.id as string;

    const res = await client.get(`/api/v1/repositories/${repoId}/search/status`);
    expect(res.status).toBe(200);
    const data = res.body.data as IndexStatus;
    expect(data.status).toBe('not_indexed');
    expect(data.indexedUnits).toBe(0);
    expect(data.analysisRunId).toBeNull();
  });

  it('returns latest analysis run status when multiple analysis runs exist', async () => {
    const { client } = await createAuthenticatedUser();
    const { repoId } = await setupIndexedRepo(client);
    await client.post(`/api/v1/repositories/${repoId}/search/index`).send({});

    // Create a second analysis run
    const files = [
      {
        filePath: 'src/utils/logger.ts',
        content: 'export function logInfo(msg: string): void { console.log(msg); }',
      },
    ];
    const secondAnalysis = await client
      .post(`/api/v1/repositories/${repoId}/analysis`)
      .send({ files });
    expect(secondAnalysis.status).toBe(201);
    const secondRunId = secondAnalysis.body.data.id as string;

    // Index second run
    const indexRes = await client.post(`/api/v1/repositories/${repoId}/search/index`).send({});
    expect(indexRes.status).toBe(200);

    const statusRes = await client.get(`/api/v1/repositories/${repoId}/search/status`);
    expect(statusRes.status).toBe(200);
    const data = statusRes.body.data as IndexStatus;
    expect(data.status).toBe('indexed');
    expect(data.analysisRunId).toBe(secondRunId);
    expect(data.indexedUnits).toBe(1);
  });

  it('returns 401 when unauthenticated', async () => {
    const { client } = await createAuthenticatedUser();
    const repoRes = await client
      .post('/api/v1/repositories')
      .send({ name: `unauth-${randomUUID()}` });
    const repoId = repoRes.body.data.id as string;

    const res = await request(app)
      .get(`/api/v1/repositories/${repoId}/search/status`)
      .set('Origin', origin);
    expect(res.status).toBe(401);
  });

  it("returns 404 for another user's repository", async () => {
    const { client: ownerClient } = await createAuthenticatedUser();
    const { client: otherClient } = await createAuthenticatedUser();

    const repoRes = await ownerClient
      .post('/api/v1/repositories')
      .send({ name: `owner-${randomUUID()}` });
    const repoId = repoRes.body.data.id as string;

    const res = await otherClient.get(`/api/v1/repositories/${repoId}/search/status`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/repositories/:id/search/index', () => {
  it('returns 422 when no completed analysis run exists', async () => {
    const { client } = await createAuthenticatedUser();
    const repoRes = await client
      .post('/api/v1/repositories')
      .send({ name: `no-analysis-${randomUUID()}` });
    const repoId = repoRes.body.data.id as string;

    const res = await client.post(`/api/v1/repositories/${repoId}/search/index`).send({});
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('NO_COMPLETED_ANALYSIS');
  });

  it('returns 503 when embedding model is unavailable', async () => {
    const { client } = await createAuthenticatedUser();
    const { repoId } = await setupIndexedRepo(client);

    // Override with failing provider
    setEmbeddingProvider({
      modelId: 'unavailable-model',
      dimension: EMBEDDING_DIMENSION,
      embed: async () => {
        const { EmbeddingUnavailableError } = await import('../src/lib/embedding');
        throw new EmbeddingUnavailableError('Ollama not running');
      },
    });

    const res = await client.post(`/api/v1/repositories/${repoId}/search/index`).send({});
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('MODEL_UNAVAILABLE');
  });

  it('successfully indexes a repository with mock provider', async () => {
    const { client } = await createAuthenticatedUser();
    const { repoId } = await setupIndexedRepo(client);

    const res = await client.post(`/api/v1/repositories/${repoId}/search/index`).send({});
    expect(res.status).toBe(200);

    const data = res.body.data as IndexStatus;
    expect(data.status).toBe('indexed');
    expect(data.indexedUnits).toBeGreaterThan(0);
    expect(data.embeddingModel).toBe('test-model');
    expect(data.repositoryId).toBe(repoId);
  });

  it("returns 404 for another user's repository", async () => {
    const { client: ownerClient } = await createAuthenticatedUser();
    const { client: otherClient } = await createAuthenticatedUser();
    const { repoId } = await setupIndexedRepo(ownerClient);

    const res = await otherClient.post(`/api/v1/repositories/${repoId}/search/index`).send({});
    expect(res.status).toBe(404);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post(`/api/v1/repositories/${randomUUID()}/search/index`)
      .set('Origin', origin)
      .send({});
    expect(res.status).toBe(401);
  });

  it('status becomes indexed after successful indexing', async () => {
    const { client } = await createAuthenticatedUser();
    const { repoId } = await setupIndexedRepo(client);

    // Index the repo
    const indexRes = await client.post(`/api/v1/repositories/${repoId}/search/index`).send({});
    expect(indexRes.status).toBe(200);

    // Verify status
    const statusRes = await client.get(`/api/v1/repositories/${repoId}/search/status`);
    expect(statusRes.status).toBe(200);
    const data = statusRes.body.data as IndexStatus;
    expect(data.status).toBe('indexed');
    expect(data.indexedUnits).toBeGreaterThan(0);
  });

  it('is safe to call twice (upserts, no duplicates)', async () => {
    const { client } = await createAuthenticatedUser();
    const { repoId } = await setupIndexedRepo(client);

    const first = await client.post(`/api/v1/repositories/${repoId}/search/index`).send({});
    const second = await client.post(`/api/v1/repositories/${repoId}/search/index`).send({});

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    // Unit count should be the same after both calls
    const firstCount = (first.body.data as IndexStatus).indexedUnits;
    const secondCount = (second.body.data as IndexStatus).indexedUnits;
    expect(firstCount).toBe(secondCount);
  });
});

describe('GET /api/v1/repositories/:id/search/query', () => {
  it('returns 400 for missing query', async () => {
    const { client } = await createAuthenticatedUser();
    const repoRes = await client
      .post('/api/v1/repositories')
      .send({ name: `q-missing-${randomUUID()}` });
    const repoId = repoRes.body.data.id as string;

    const res = await client.get(`/api/v1/repositories/${repoId}/search/query`);
    expect(res.status).toBe(400);
  });

  it('returns 400 for query exceeding 500 chars', async () => {
    const { client } = await createAuthenticatedUser();
    const repoRes = await client
      .post('/api/v1/repositories')
      .send({ name: `q-long-${randomUUID()}` });
    const repoId = repoRes.body.data.id as string;

    const longQuery = 'a'.repeat(501);
    const res = await client.get(
      `/api/v1/repositories/${repoId}/search/query?q=${encodeURIComponent(longQuery)}`,
    );
    expect(res.status).toBe(400);
  });

  it('returns empty results when repository has no index', async () => {
    const { client } = await createAuthenticatedUser();
    const repoRes = await client
      .post('/api/v1/repositories')
      .send({ name: `q-empty-${randomUUID()}` });
    const repoId = repoRes.body.data.id as string;

    // Need analysis run first so repo ownership check passes
    const files = [{ filePath: 'src/index.ts', content: 'export const x = 1;' }];
    await client.post(`/api/v1/repositories/${repoId}/analysis`).send({ files });

    const res = await client.get(`/api/v1/repositories/${repoId}/search/query?q=authentication`);
    expect(res.status).toBe(200);
    const results = res.body.data as SearchResult[];
    expect(Array.isArray(results)).toBe(true);
    // No embeddings indexed, so empty
    expect(results).toHaveLength(0);
  });

  it('returns search results after indexing', async () => {
    const { client } = await createAuthenticatedUser();
    const { repoId } = await setupIndexedRepo(client);

    // Index first
    await client.post(`/api/v1/repositories/${repoId}/search/index`).send({});

    // Search
    const res = await client.get(
      `/api/v1/repositories/${repoId}/search/query?q=rotate+refresh+token&limit=5`,
    );
    expect(res.status).toBe(200);
    const results = res.body.data as SearchResult[];
    expect(Array.isArray(results)).toBe(true);
    // With mock provider, all embeddings are identical, so we get results back
    expect(results.length).toBeGreaterThan(0);

    // Validate result shape
    const first = results[0]!;
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('filePath');
    expect(first).toHaveProperty('unitKind');
    expect(first).toHaveProperty('unitName');
    expect(first).toHaveProperty('score');
    expect(first).toHaveProperty('contentPreview');
    expect(first.repositoryId).toBe(repoId);
    expect(typeof first.score).toBe('number');
    expect(first.score).toBeGreaterThanOrEqual(0);
    expect(first.score).toBeLessThanOrEqual(1);
  });

  it('returns results sorted by descending similarity score and respects limit', async () => {
    const { client } = await createAuthenticatedUser();
    const { repoId } = await setupIndexedRepo(client);
    await client.post(`/api/v1/repositories/${repoId}/search/index`).send({});

    const res = await client.get(`/api/v1/repositories/${repoId}/search/query?q=token&limit=2`);
    expect(res.status).toBe(200);
    const results = res.body.data as SearchResult[];
    expect(results.length).toBeLessThanOrEqual(2);
    expect(results.length).toBeGreaterThan(0);

    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i]!.score).toBeGreaterThanOrEqual(results[i + 1]!.score);
    }
  });

  it('enforces limit cap at 30', async () => {
    const { client } = await createAuthenticatedUser();
    const { repoId } = await setupIndexedRepo(client);
    await client.post(`/api/v1/repositories/${repoId}/search/index`).send({});

    const res = await client.get(
      `/api/v1/repositories/${repoId}/search/query?q=function&limit=100`,
    );
    expect(res.status).toBe(400); // limit max is 30 — Zod rejects 100
  });

  it("returns 404 for another user's repository", async () => {
    const { client: ownerClient } = await createAuthenticatedUser();
    const { client: otherClient } = await createAuthenticatedUser();
    const { repoId } = await setupIndexedRepo(ownerClient);
    await ownerClient.post(`/api/v1/repositories/${repoId}/search/index`).send({});

    const res = await otherClient.get(`/api/v1/repositories/${repoId}/search/query?q=function`);
    expect(res.status).toBe(404);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .get(`/api/v1/repositories/${randomUUID()}/search/query?q=test`)
      .set('Origin', origin);
    expect(res.status).toBe(401);
  });

  it('returns 503 when model is unavailable during search', async () => {
    const { client } = await createAuthenticatedUser();
    const { repoId } = await setupIndexedRepo(client);
    await client.post(`/api/v1/repositories/${repoId}/search/index`).send({});

    // Override provider to fail
    setEmbeddingProvider({
      modelId: 'failing-model',
      dimension: EMBEDDING_DIMENSION,
      embed: async () => {
        const { EmbeddingUnavailableError } = await import('../src/lib/embedding');
        throw new EmbeddingUnavailableError('Ollama not running');
      },
    });

    const res = await client.get(`/api/v1/repositories/${repoId}/search/query?q=function`);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('MODEL_UNAVAILABLE');
  });
});
