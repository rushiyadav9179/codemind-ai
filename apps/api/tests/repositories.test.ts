import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { Express } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import type { ApiResponse, PaginatedRepositories, Repository } from '@codemind/shared';

const origin = 'http://localhost:5173';
const password = 'StrongPassword123!';
const emails: string[] = [];
let app: Express;
let forwardedIpOctet = 50;

function uniqueEmail(): string {
  const email = `phase3-${randomUUID()}@example.test`;
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
    patch(path: string) {
      return agent.patch(path).set('Origin', origin).set('X-Forwarded-For', ip);
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
    patch(path: string) {
      return client.patch(path).set('Authorization', `Bearer ${accessToken}`);
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

describe('Repositories API', () => {
  it('requires authentication for all repository endpoints', async () => {
    const unauthenticated = fromClient(request.agent(app));
    const randomId = randomUUID();

    const postRes = await unauthenticated.post('/api/v1/repositories').send({ name: 'test-repo' });
    expect(postRes.status).toBe(401);
    expect(postRes.body.error.code).toBe('UNAUTHENTICATED');

    const listRes = await unauthenticated.get('/api/v1/repositories');
    expect(listRes.status).toBe(401);

    const getRes = await unauthenticated.get(`/api/v1/repositories/${randomId}`);
    expect(getRes.status).toBe(401);

    const patchRes = await unauthenticated
      .patch(`/api/v1/repositories/${randomId}`)
      .send({ description: 'updated' });
    expect(patchRes.status).toBe(401);

    const deleteRes = await unauthenticated.delete(`/api/v1/repositories/${randomId}`);
    expect(deleteRes.status).toBe(401);
  });

  it('creates a repository with valid input and default fields', async () => {
    const { client, user } = await createAuthenticatedUser();

    const response = await client.post('/api/v1/repositories').send({
      name: 'core-platform',
      description: 'The core platform service',
      language: 'TypeScript',
    });

    expect(response.status).toBe(201);
    const body = response.body as ApiResponse<Repository>;
    expect(body.success).toBe(true);
    expect(body.data.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.data.name).toBe('core-platform');
    expect(body.data.description).toBe('The core platform service');
    expect(body.data.defaultBranch).toBe('main');
    expect(body.data.language).toBe('TypeScript');
    expect(body.data.sourceType).toBe('MANUAL');
    expect(body.data.status).toBe('ACTIVE');
    expect(body.data.ownerId).toBe(user.id);
    expect(body.data.createdAt).toBeDefined();
    expect(body.data.updatedAt).toBeDefined();
  });

  it('rejects invalid repository creation input', async () => {
    const { client } = await createAuthenticatedUser();

    // Empty name
    const emptyNameRes = await client.post('/api/v1/repositories').send({ name: '' });
    expect(emptyNameRes.status).toBe(400);
    expect(emptyNameRes.body.error.code).toBe('VALIDATION_ERROR');

    // Name with invalid characters (e.g., spaces, special characters)
    const invalidCharRes = await client
      .post('/api/v1/repositories')
      .send({ name: 'my invalid repo!' });
    expect(invalidCharRes.status).toBe(400);
    expect(invalidCharRes.body.error.code).toBe('VALIDATION_ERROR');

    // Name too long (> 100 characters)
    const longNameRes = await client.post('/api/v1/repositories').send({ name: 'a'.repeat(101) });
    expect(longNameRes.status).toBe(400);

    // Description too long (> 500 characters)
    const longDescRes = await client.post('/api/v1/repositories').send({
      name: 'valid-repo',
      description: 'x'.repeat(501),
    });
    expect(longDescRes.status).toBe(400);
  });

  it('enforces unique repository names per owner and returns 409 conflict', async () => {
    const { client } = await createAuthenticatedUser();

    const firstRes = await client
      .post('/api/v1/repositories')
      .send({ name: 'unique-service', description: 'First attempt' });
    expect(firstRes.status).toBe(201);

    const duplicateRes = await client
      .post('/api/v1/repositories')
      .send({ name: 'unique-service', description: 'Duplicate attempt' });
    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error.code).toBe('REPOSITORY_EXISTS');
  });

  it('allows different users to have repositories with the same name', async () => {
    const userA = await createAuthenticatedUser();
    const userB = await createAuthenticatedUser();

    const resA = await userA.client.post('/api/v1/repositories').send({ name: 'shared-name-repo' });
    expect(resA.status).toBe(201);

    const resB = await userB.client.post('/api/v1/repositories').send({ name: 'shared-name-repo' });
    expect(resB.status).toBe(201);
  });

  it('retrieves an existing repository by ID', async () => {
    const { client } = await createAuthenticatedUser();

    const createRes = await client.post('/api/v1/repositories').send({
      name: 'get-test-repo',
      defaultBranch: 'develop',
      language: 'Rust',
    });
    const repoId = createRes.body.data.id;

    const getRes = await client.get(`/api/v1/repositories/${repoId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(repoId);
    expect(getRes.body.data.name).toBe('get-test-repo');
    expect(getRes.body.data.defaultBranch).toBe('develop');
    expect(getRes.body.data.language).toBe('Rust');
  });

  it('returns 404 for nonexistent repository or malformed UUID', async () => {
    const { client } = await createAuthenticatedUser();

    const notFoundRes = await client.get(`/api/v1/repositories/${randomUUID()}`);
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error.code).toBe('REPOSITORY_NOT_FOUND');

    const invalidIdRes = await client.get('/api/v1/repositories/not-a-valid-uuid');
    expect(invalidIdRes.status).toBe(400);
    expect(invalidIdRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('prevents cross-user access: user B cannot view, update, or delete user A repository', async () => {
    const userA = await createAuthenticatedUser();
    const userB = await createAuthenticatedUser();

    const createRes = await userA.client.post('/api/v1/repositories').send({
      name: 'user-a-private-repo',
      description: 'Confidential project',
    });
    const repoId = createRes.body.data.id;

    // User B tries to get User A's repo -> returns 404 to avoid leaking ownership
    const getRes = await userB.client.get(`/api/v1/repositories/${repoId}`);
    expect(getRes.status).toBe(404);
    expect(getRes.body.error.code).toBe('REPOSITORY_NOT_FOUND');

    // User B tries to update User A's repo -> returns 404
    const updateRes = await userB.client
      .patch(`/api/v1/repositories/${repoId}`)
      .send({ description: 'Hacked description' });
    expect(updateRes.status).toBe(404);
    expect(updateRes.body.error.code).toBe('REPOSITORY_NOT_FOUND');

    // User B tries to delete User A's repo -> returns 404
    const deleteRes = await userB.client.delete(`/api/v1/repositories/${repoId}`);
    expect(deleteRes.status).toBe(404);
    expect(deleteRes.body.error.code).toBe('REPOSITORY_NOT_FOUND');

    // Verify User A's repo is still intact
    const verifyRes = await userA.client.get(`/api/v1/repositories/${repoId}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.description).toBe('Confidential project');
  });

  it('updates repository metadata and handles conflicts', async () => {
    const { client } = await createAuthenticatedUser();

    const repo1 = await client.post('/api/v1/repositories').send({
      name: 'initial-name',
      description: 'Initial desc',
    });
    const repoId = repo1.body.data.id;

    // Create another repo to test rename conflict
    await client.post('/api/v1/repositories').send({ name: 'existing-other-repo' });

    // Update with valid fields
    const updateRes = await client.patch(`/api/v1/repositories/${repoId}`).send({
      name: 'renamed-repo',
      description: 'Updated description',
      defaultBranch: 'release',
      language: 'Go',
      status: 'ARCHIVED',
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe('renamed-repo');
    expect(updateRes.body.data.description).toBe('Updated description');
    expect(updateRes.body.data.defaultBranch).toBe('release');
    expect(updateRes.body.data.language).toBe('Go');
    expect(updateRes.body.data.status).toBe('ARCHIVED');

    // Try to rename to already existing name -> 409
    const conflictRes = await client
      .patch(`/api/v1/repositories/${repoId}`)
      .send({ name: 'existing-other-repo' });
    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.error.code).toBe('REPOSITORY_EXISTS');

    // Reject empty update body
    const emptyUpdateRes = await client.patch(`/api/v1/repositories/${repoId}`).send({});
    expect(emptyUpdateRes.status).toBe(400);
  });

  it('deletes a repository and verifies it cannot be retrieved', async () => {
    const { client } = await createAuthenticatedUser();

    const createRes = await client.post('/api/v1/repositories').send({
      name: 'repo-to-delete',
    });
    const repoId = createRes.body.data.id;

    const deleteRes = await client.delete(`/api/v1/repositories/${repoId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.deleted).toBe(true);
    expect(deleteRes.body.data.id).toBe(repoId);

    // Subsequent GET should return 404
    const getRes = await client.get(`/api/v1/repositories/${repoId}`);
    expect(getRes.status).toBe(404);

    // Subsequent DELETE should return 404
    const secondDeleteRes = await client.delete(`/api/v1/repositories/${repoId}`);
    expect(secondDeleteRes.status).toBe(404);
  });

  it('lists only the current user repositories with pagination and search', async () => {
    const userA = await createAuthenticatedUser();
    const userB = await createAuthenticatedUser();

    // User A creates 5 repos
    for (let i = 1; i <= 5; i++) {
      await userA.client.post('/api/v1/repositories').send({
        name: `user-a-repo-${i}`,
        description: i % 2 === 0 ? 'Microservice backend' : 'Frontend UI app',
        language: i % 2 === 0 ? 'TypeScript' : 'Python',
      });
    }

    // User B creates 2 repos
    await userB.client.post('/api/v1/repositories').send({ name: 'user-b-repo-1' });
    await userB.client.post('/api/v1/repositories').send({ name: 'user-b-repo-2' });

    // User A lists with limit=2, page=1
    const page1Res = await userA.client.get('/api/v1/repositories?page=1&limit=2');
    expect(page1Res.status).toBe(200);
    const page1Data = page1Res.body.data as PaginatedRepositories;
    expect(page1Data.items.length).toBe(2);
    expect(page1Data.pagination.totalItems).toBe(5);
    expect(page1Data.pagination.totalPages).toBe(3);
    expect(page1Data.pagination.page).toBe(1);
    expect(page1Data.pagination.limit).toBe(2);
    expect(page1Data.pagination.hasNextPage).toBe(true);
    expect(page1Data.pagination.hasPrevPage).toBe(false);

    // Ensure all returned repos belong to User A
    for (const repo of page1Data.items) {
      expect(repo.ownerId).toBe(userA.user.id);
      expect(repo.name).toContain('user-a-repo');
    }

    // User A lists page 3 (last page with 1 item)
    const page3Res = await userA.client.get('/api/v1/repositories?page=3&limit=2');
    expect(page3Res.status).toBe(200);
    const page3Data = page3Res.body.data as PaginatedRepositories;
    expect(page3Data.items.length).toBe(1);
    expect(page3Data.pagination.hasNextPage).toBe(false);
    expect(page3Data.pagination.hasPrevPage).toBe(true);

    // User A searches for "Microservice"
    const searchRes = await userA.client.get('/api/v1/repositories?search=Microservice');
    expect(searchRes.status).toBe(200);
    const searchData = searchRes.body.data as PaginatedRepositories;
    expect(searchData.items.length).toBe(2);
    for (const repo of searchData.items) {
      expect(repo.description).toContain('Microservice');
    }

    // User B lists their repositories
    const userBListRes = await userB.client.get('/api/v1/repositories');
    expect(userBListRes.status).toBe(200);
    const userBData = userBListRes.body.data as PaginatedRepositories;
    expect(userBData.pagination.totalItems).toBe(2);
    for (const repo of userBData.items) {
      expect(repo.ownerId).toBe(userB.user.id);
    }
  });
});
