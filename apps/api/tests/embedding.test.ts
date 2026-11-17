import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  truncateEmbeddingInput,
  buildEmbeddingInput,
  OllamaEmbeddingProvider,
  EmbeddingUnavailableError,
  getEmbeddingProvider,
  setEmbeddingProvider,
  EMBEDDING_DIMENSION,
} from '../src/lib/embedding';

afterEach(() => {
  // Reset singleton so tests do not bleed into each other
  setEmbeddingProvider(null);
  vi.restoreAllMocks();
});

describe('truncateEmbeddingInput', () => {
  it('returns text unchanged when within limit', () => {
    const text = 'function validateToken(token: string): boolean';
    expect(truncateEmbeddingInput(text, 2048)).toBe(text);
  });

  it('truncates text that exceeds maxChars', () => {
    const text = 'a'.repeat(3000);
    const result = truncateEmbeddingInput(text, 2048);
    expect(result.length).toBeLessThanOrEqual(2049); // 2048 + ellipsis char
    expect(result.endsWith('…')).toBe(true);
  });

  it('uses default of 2048 chars', () => {
    const text = 'x'.repeat(3000);
    const result = truncateEmbeddingInput(text);
    expect(result.length).toBeLessThanOrEqual(2050);
  });
});

describe('buildEmbeddingInput', () => {
  it('formats as "{kind}: {name}\\n{context}"', () => {
    const result = buildEmbeddingInput({
      kind: 'function',
      name: 'hashPassword',
      context: 'async function hashPassword(password: string): Promise<string> in auth.service.ts',
    });
    expect(result).toContain('function: hashPassword\n');
    expect(result).toContain('hashPassword');
  });

  it('truncates long inputs', () => {
    const result = buildEmbeddingInput({
      kind: 'class',
      name: 'VeryLongClass',
      context: 'z'.repeat(3000),
    });
    expect(result.length).toBeLessThanOrEqual(2050);
  });
});

describe('OllamaEmbeddingProvider', () => {
  function makeFetchMock(embedding: number[]) {
    return vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding }),
      text: async () => JSON.stringify({ embedding }),
    });
  }

  it('returns empty array for empty input', async () => {
    const provider = new OllamaEmbeddingProvider({
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434',
    });
    const result = await provider.embed([]);
    expect(result).toEqual([]);
  });

  it('calls Ollama API and returns embeddings', async () => {
    const fakeEmbedding = Array(EMBEDDING_DIMENSION).fill(0.1);
    vi.stubGlobal('fetch', makeFetchMock(fakeEmbedding));

    const provider = new OllamaEmbeddingProvider({
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434',
    });
    const result = await provider.embed(['function validateToken(token: string)']);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(EMBEDDING_DIMENSION);
    expect(result[0]![0]).toBeCloseTo(0.1);
  });

  it('throws EmbeddingUnavailableError on HTTP error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      }),
    );

    const provider = new OllamaEmbeddingProvider({
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434',
    });

    await expect(provider.embed(['some text'])).rejects.toThrow(EmbeddingUnavailableError);
  });

  it('throws EmbeddingUnavailableError on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const provider = new OllamaEmbeddingProvider({
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434',
    });

    await expect(provider.embed(['some text'])).rejects.toThrow(EmbeddingUnavailableError);
  });

  it('throws EmbeddingUnavailableError on dimension mismatch', async () => {
    // Returns wrong dimension (100 instead of 768)
    vi.stubGlobal('fetch', makeFetchMock(Array(100).fill(0.5)));

    const provider = new OllamaEmbeddingProvider({
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434',
    });

    await expect(provider.embed(['some text'])).rejects.toThrow(EmbeddingUnavailableError);
  });

  it('throws EmbeddingUnavailableError when embedding is empty array', async () => {
    vi.stubGlobal('fetch', makeFetchMock([]));

    const provider = new OllamaEmbeddingProvider({
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434',
    });

    await expect(provider.embed(['some text'])).rejects.toThrow(EmbeddingUnavailableError);
  });

  it('modelId matches configured model', () => {
    const provider = new OllamaEmbeddingProvider({ model: 'nomic-embed-text' });
    expect(provider.modelId).toBe('nomic-embed-text');
  });

  it('dimension is EMBEDDING_DIMENSION', () => {
    const provider = new OllamaEmbeddingProvider();
    expect(provider.dimension).toBe(EMBEDDING_DIMENSION);
  });
});

describe('setEmbeddingProvider / getEmbeddingProvider', () => {
  it('returns a provider after setEmbeddingProvider', () => {
    const mockProvider = {
      modelId: 'mock-model',
      dimension: EMBEDDING_DIMENSION,
      embed: vi.fn().mockResolvedValue([Array(EMBEDDING_DIMENSION).fill(0)]),
    };
    setEmbeddingProvider(mockProvider);
    expect(getEmbeddingProvider()).toBe(mockProvider);
  });

  it('creates a new provider when set to null', () => {
    setEmbeddingProvider(null);
    const provider = getEmbeddingProvider();
    expect(provider).toBeDefined();
    expect(provider.dimension).toBe(EMBEDDING_DIMENSION);
  });
});
