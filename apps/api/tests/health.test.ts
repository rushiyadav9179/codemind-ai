import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app';

let app: Express;

beforeAll(() => {
  app = createApp();
});

describe('GET /api/v1/health', () => {
  it('responds with 200 OK', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
  });

  it('returns JSON content type', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('returns success: true', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.body.success).toBe(true);
  });

  it('returns healthy status', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.body.data.status).toBe('healthy');
  });

  it('returns api service as up', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.body.data.services.api).toBe('up');
  });

  it('returns a timestamp', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.body.data.timestamp).toBeDefined();
    expect(new Date(response.body.data.timestamp).toISOString()).toBe(response.body.data.timestamp);
  });

  it('returns uptime as a positive number', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(typeof response.body.data.uptime).toBe('number');
    expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
  });

  it('does not expose DATABASE_URL or credentials', async () => {
    const response = await request(app).get('/api/v1/health');
    const body = JSON.stringify(response.body);
    expect(body).not.toMatch(/postgresql:\/\//i);
    expect(body).not.toMatch(/redis:\/\//i);
    expect(body).not.toMatch(/password/i);
    expect(body).not.toMatch(/secret/i);
  });

  it('returns the application version', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.body.data.version).toBeDefined();
    expect(typeof response.body.data.version).toBe('string');
  });
});

describe('GET /api/v1/nonexistent', () => {
  it('responds with 404 for unknown routes', async () => {
    const response = await request(app).get('/api/v1/nonexistent');
    expect(response.status).toBe(404);
  });

  it('returns a structured error body', async () => {
    const response = await request(app).get('/api/v1/nonexistent');
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBeDefined();
    expect(response.body.error.message).toBeDefined();
  });
});
