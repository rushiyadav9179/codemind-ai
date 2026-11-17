/**
 * Embedding provider abstraction for Phase 5 semantic search.
 *
 * Uses Ollama's local inference API (http://localhost:11434 by default).
 * Falls back cleanly when the model is unavailable — never silently returns zeros.
 *
 * Model: nomic-embed-text (768 dimensions, ~274MB, Apache 2.0)
 * Dimension is fixed at EMBEDDING_DIMENSION (768). Do NOT mix embeddings from different
 * dimension models — they are incompatible.
 */
import { logger } from '../middleware/requestLogger';
import { env } from '../config/env';

export const EMBEDDING_DIMENSION = 768;

export class EmbeddingUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbeddingUnavailableError';
  }
}

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
  readonly modelId: string;
  readonly dimension: number;
}

/**
 * Truncates text to approximately maxChars characters, preserving whole words where possible.
 * Embedding models have context windows; nomic-embed-text supports 8192 tokens but we
 * cap at 2048 chars (~512 tokens) per unit to stay well within limits.
 */
export function truncateEmbeddingInput(text: string, maxChars = 2048): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trimEnd() + '…';
}

/**
 * Builds a structured embedding input string for a code unit.
 * Format: "{kind}: {name}\n{context}"
 */
export function buildEmbeddingInput(opts: { kind: string; name: string; context: string }): string {
  return truncateEmbeddingInput(`${opts.kind}: ${opts.name}\n${opts.context}`);
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly modelId: string;
  readonly dimension = EMBEDDING_DIMENSION;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(opts?: { model?: string; baseUrl?: string; timeoutMs?: number }) {
    this.modelId = opts?.model ?? env.EMBEDDING_MODEL;
    this.baseUrl = opts?.baseUrl ?? env.OLLAMA_BASE_URL;
    this.timeoutMs = opts?.timeoutMs ?? 30_000;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results: number[][] = [];

    for (const text of texts) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(`${this.baseUrl}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: this.modelId, prompt: text }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new EmbeddingUnavailableError(
            `Ollama returned HTTP ${response.status}: ${body.slice(0, 200)}`,
          );
        }

        const data = (await response.json()) as { embedding?: number[] };
        if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
          throw new EmbeddingUnavailableError('Ollama returned empty or invalid embedding');
        }

        if (data.embedding.length !== this.dimension) {
          throw new EmbeddingUnavailableError(
            `Embedding dimension mismatch: expected ${this.dimension}, got ${data.embedding.length}. ` +
              `Ensure the configured model '${this.modelId}' produces ${this.dimension}-dimensional embeddings.`,
          );
        }

        results.push(data.embedding);
      } catch (err) {
        if (err instanceof EmbeddingUnavailableError) throw err;
        // Network errors, AbortError, etc.
        const message = err instanceof Error ? err.message : String(err);
        logger.warn({ err: message, model: this.modelId }, 'Ollama embedding request failed');
        throw new EmbeddingUnavailableError(
          `Could not reach Ollama at ${this.baseUrl}: ${message}. ` +
            `Install and run Ollama, then pull the model: ollama pull ${this.modelId}`,
        );
      } finally {
        clearTimeout(timer);
      }
    }

    return results;
  }
}

// Singleton provider — instantiated once, shared across requests.
let _provider: EmbeddingProvider | null = null;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (!_provider) {
    _provider = new OllamaEmbeddingProvider();
  }
  return _provider;
}

// Allows tests to inject a mock provider.
export function setEmbeddingProvider(provider: EmbeddingProvider | null): void {
  _provider = provider;
}
