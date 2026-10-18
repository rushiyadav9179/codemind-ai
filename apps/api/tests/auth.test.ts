import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import type { Express } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';

const origin = 'http://localhost:5173';
const password = 'StrongPassword123!';
const emails: string[] = [];
let app: Express;
let forwardedIpOctet = 10;

function uniqueEmail(): string {
  const email = `phase2-${randomUUID()}@example.test`;
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
  };
}

function cookieValue(
  response: { headers: Record<string, string | string[] | undefined> },
  name: string,
) {
  const cookies = response.headers['set-cookie'];
  const list = Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
  const cookie = list.find((value) => value.startsWith(`${name}=`));
  return cookie?.split(';', 1)[0]?.slice(name.length + 1);
}

async function registerUser(email = uniqueEmail()) {
  const agent = request.agent(app);
  const client = fromClient(agent);
  const response = await client.post('/api/v1/auth/register').send({ email, password });
  return { client, response, email };
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

describe('authentication API', () => {
  it('registers users with normalized email and never returns credentials', async () => {
    const email = uniqueEmail();
    const { response } = await registerUser(`  ${email.toUpperCase()}  `);

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.user.role).toBe('USER');
    expect(response.body.data.passwordHash).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toMatch(/passwordHash|refreshToken/i);
    const rawRefreshToken = cookieValue(response, 'cm_refresh');
    const setCookieHeaders = Array.isArray(response.headers['set-cookie'])
      ? response.headers['set-cookie'].join('; ')
      : (response.headers['set-cookie'] ?? '');
    expect(setCookieHeaders).toMatch(/cm_refresh=.*HttpOnly/i);
    const savedToken = await prisma.refreshToken.findFirst({
      where: { user: { email } },
    });
    expect(savedToken?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(savedToken?.tokenHash).not.toBe(rawRefreshToken);
  });

  it('rejects invalid email and weak passwords', async () => {
    const client = fromClient(request.agent(app));
    const invalidEmail = await client
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password });
    expect(invalidEmail.status).toBe(400);

    const weakPassword = await client
      .post('/api/v1/auth/register')
      .send({ email: uniqueEmail(), password: 'simplepassword' });
    expect(weakPassword.status).toBe(400);
  });

  it('returns a generic response for duplicate email registration', async () => {
    const email = uniqueEmail();
    expect((await registerUser(email)).response.status).toBe(201);
    const duplicate = await fromClient(request.agent(app))
      .post('/api/v1/auth/register')
      .send({ email, password });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.message).toBe('Unable to create an account');
    expect(duplicate.body.error.message).not.toMatch(/email|registered|exists/i);
  });

  it('stores an Argon2id hash instead of the submitted password', async () => {
    const email = uniqueEmail();
    await registerUser(email);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });

    expect(user.passwordHash).not.toBe(password);
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('logs in with normalized email and rejects invalid credentials generically', async () => {
    const email = uniqueEmail();
    await registerUser(email);
    const client = fromClient(request.agent(app));
    const login = await client
      .post('/api/v1/auth/login')
      .send({ email: email.toUpperCase(), password });
    expect(login.status).toBe(200);
    expect(login.body.data.user.email).toBe(email);

    const invalid = await fromClient(request.agent(app))
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword123!' });
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.message).toBe('Invalid email or password');
  });

  it('rejects attempts to self-assign ADMIN', async () => {
    const email = uniqueEmail();
    const response = await fromClient(request.agent(app))
      .post('/api/v1/auth/register')
      .send({ email, password, role: 'ADMIN' });

    expect(response.status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it('protects profile access and returns the authenticated database user', async () => {
    const { response: registration } = await registerUser();
    const accessToken = registration.body.data.accessToken as string;
    const userId = registration.body.data.user.id as string;

    const anonymous = await request(app).get('/api/v1/auth/me');
    expect(anonymous.status).toBe(401);

    const profile = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(profile.status).toBe(200);
    expect(profile.body.data.id).toBe(userId);
    expect(profile.body.data.role).toBe('USER');
  });

  it('rejects expired access tokens', async () => {
    const { response } = await registerUser();
    const userId = response.body.data.user.id as string;
    const expiredToken = jwt.sign({}, env.AUTH_ACCESS_TOKEN_SECRET, {
      algorithm: 'HS256',
      subject: userId,
      issuer: env.AUTH_JWT_ISSUER,
      audience: env.AUTH_JWT_AUDIENCE,
      expiresIn: -10,
    });

    const profile = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(profile.status).toBe(401);

    const noExpiryToken = jwt.sign({}, env.AUTH_ACCESS_TOKEN_SECRET, {
      algorithm: 'HS256',
      subject: userId,
      issuer: env.AUTH_JWT_ISSUER,
      audience: env.AUTH_JWT_AUDIENCE,
    });
    const noExpiryProfile = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${noExpiryToken}`);
    expect(noExpiryProfile.status).toBe(401);
  });

  it('rotates refresh tokens and revokes the family on reuse', async () => {
    const { client, response: registered } = await registerUser();
    const oldRefreshToken = cookieValue(registered, 'cm_refresh');
    const oldCsrfToken = cookieValue(registered, 'cm_csrf');
    expect(oldRefreshToken).toBeTruthy();
    expect(oldCsrfToken).toBeTruthy();

    const rotated = await client
      .post('/api/v1/auth/refresh')
      .set('X-CSRF-Token', oldCsrfToken!)
      .send();
    expect(rotated.status).toBe(200);
    const nextRefreshToken = cookieValue(rotated, 'cm_refresh');
    const nextCsrfToken = cookieValue(rotated, 'cm_csrf');
    expect(nextRefreshToken).toBeTruthy();
    expect(nextRefreshToken).not.toBe(oldRefreshToken);

    const reused = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', origin)
      .set('Cookie', [`cm_refresh=${oldRefreshToken}`, `cm_csrf=${oldCsrfToken}`])
      .set('X-CSRF-Token', oldCsrfToken!)
      .send();
    expect(reused.status).toBe(401);

    const familyRevoked = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', origin)
      .set('Cookie', [`cm_refresh=${nextRefreshToken}`, `cm_csrf=${nextCsrfToken}`])
      .set('X-CSRF-Token', nextCsrfToken!)
      .send();
    expect(familyRevoked.status).toBe(401);
  });

  it('requires a matching CSRF token for refresh', async () => {
    const { client } = await registerUser();
    const response = await client.post('/api/v1/auth/refresh').set('X-CSRF-Token', 'wrong').send();
    expect(response.status).toBe(403);
  });

  it('revokes the current refresh session on logout', async () => {
    const { client, response: registered } = await registerUser();
    const refreshToken = cookieValue(registered, 'cm_refresh');
    const csrfToken = cookieValue(registered, 'cm_csrf');

    const logout = await client.post('/api/v1/auth/logout').set('X-CSRF-Token', csrfToken!).send();
    expect(logout.status).toBe(200);

    const refresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', origin)
      .set('Cookie', [`cm_refresh=${refreshToken}`, `cm_csrf=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken!)
      .send();
    expect(refresh.status).toBe(401);
  });

  it('revokes all refresh sessions for the authenticated user', async () => {
    const { client, response: registered } = await registerUser();
    const accessToken = registered.body.data.accessToken as string;
    const refreshToken = cookieValue(registered, 'cm_refresh');
    const csrfToken = cookieValue(registered, 'cm_csrf');

    const logoutAll = await client
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();
    expect(logoutAll.status).toBe(200);
    expect(logoutAll.body.data.revokedSessions).toBeGreaterThanOrEqual(1);

    const refresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Origin', origin)
      .set('Cookie', [`cm_refresh=${refreshToken}`, `cm_csrf=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken!)
      .send();
    expect(refresh.status).toBe(401);
  });

  it('enforces role authorization against the stored user role', async () => {
    const { response } = await registerUser();
    const accessToken = response.body.data.accessToken as string;
    const userId = response.body.data.user.id as string;

    const forbidden = await request(app)
      .get('/api/v1/auth/admin')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(forbidden.status).toBe(403);

    await prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
    const allowed = await request(app)
      .get('/api/v1/auth/admin')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(allowed.status).toBe(200);
  });

  it('rate-limits repeated registration attempts from one IP', async () => {
    const ip = `198.51.100.${forwardedIpOctet++}`;
    const attempt = () =>
      request(app)
        .post('/api/v1/auth/register')
        .set('Origin', origin)
        .set('X-Forwarded-For', ip)
        .send({ email: uniqueEmail(), password });

    for (let index = 0; index < 5; index += 1) {
      expect((await attempt()).status).toBe(201);
    }
    expect((await attempt()).status).toBe(429);
  });
});
