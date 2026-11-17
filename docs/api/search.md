# Semantic Code Search API (Phase 5)

All endpoints require a valid Bearer access token.

---

## POST `/api/v1/repositories/:id/search/index`

Triggers embedding generation for all analyzed symbols in the repository.

Requires the **Ollama** local embedding server to be running with `nomic-embed-text` pulled.

### Path parameters

| Parameter | Type          | Description   |
| --------- | ------------- | ------------- |
| `id`      | string (CUID) | Repository ID |

### Responses

| Status | Code                   | Description                                          |
| ------ | ---------------------- | ---------------------------------------------------- |
| 200    | —                      | `{ "message": "Indexing complete", "indexed": N }`   |
| 503    | `MODEL_UNAVAILABLE`    | Ollama is not reachable or the model is not loaded   |
| 404    | `REPOSITORY_NOT_FOUND` | Repository does not exist or belongs to another user |
| 401    | `UNAUTHORIZED`         | Missing or invalid access token                      |

---

## GET `/api/v1/repositories/:id/search/status`

Returns the current embedding index status for the repository.

### Path parameters

| Parameter | Type          | Description   |
| --------- | ------------- | ------------- |
| `id`      | string (CUID) | Repository ID |

### Response body (`IndexStatus`)

```ts
{
  status: 'not_indexed' | 'indexed';
  embeddingCount: number;
  lastIndexedAt: string | null; // ISO 8601
}
```

### Responses

| Status | Code                   | Description                                          |
| ------ | ---------------------- | ---------------------------------------------------- |
| 200    | —                      | IndexStatus object                                   |
| 404    | `REPOSITORY_NOT_FOUND` | Repository does not exist or belongs to another user |
| 401    | `UNAUTHORIZED`         | Missing or invalid access token                      |

---

## GET `/api/v1/repositories/:id/search/query`

Runs a semantic (vector similarity) search against the repository's indexed embeddings.

Requires Ollama to be running to embed the query.

### Path parameters

| Parameter | Type          | Description   |
| --------- | ------------- | ------------- |
| `id`      | string (CUID) | Repository ID |

### Query parameters

| Parameter | Type   | Default | Description                                 |
| --------- | ------ | ------- | ------------------------------------------- |
| `q`       | string | —       | **Required.** Natural-language search query |
| `limit`   | number | 10      | Maximum results (1–50)                      |

### Response body

```ts
{
  results: SearchResult[];
  query: string;
}
```

Where each `SearchResult` is:

```ts
{
  symbolName: string;
  symbolKind: string; // "function" | "class" | "interface" | "type"
  filePath: string;
  score: number; // cosine similarity [0, 1]
  snippet: string | null;
  analysisRunId: string;
}
```

### Responses

| Status | Code                   | Description                                          |
| ------ | ---------------------- | ---------------------------------------------------- |
| 200    | —                      | Search results array (empty array if no matches)     |
| 422    | `VALIDATION_ERROR`     | Missing or invalid `q` parameter                     |
| 503    | `MODEL_UNAVAILABLE`    | Ollama is not reachable for query embedding          |
| 404    | `REPOSITORY_NOT_FOUND` | Repository does not exist or belongs to another user |
| 401    | `UNAUTHORIZED`         | Missing or invalid access token                      |

---

## Ollama Setup

1. **Install Ollama**: <https://ollama.com/download>

2. **Pull the embedding model** (once):

   ```bash
   ollama pull nomic-embed-text
   ```

3. **Start the Ollama server** (it starts automatically on login on macOS/Linux; on Windows you may need to run `ollama serve`):

   ```
   http://localhost:11434
   ```

4. **Configure environment** (`.env`):
   ```
   EMBEDDING_MODEL=nomic-embed-text
   OLLAMA_BASE_URL=http://localhost:11434
   EMBEDDING_DIMENSION=768
   ```

> **Without Ollama**: The index and search endpoints return `503 MODEL_UNAVAILABLE`. The rest of the application (auth, repositories, code intelligence) continues to work normally.

---

## Index Status Values

| Value         | Meaning                                                         |
| ------------- | --------------------------------------------------------------- |
| `not_indexed` | No embeddings have been generated for this repository yet       |
| `indexed`     | At least one embedding exists; `embeddingCount` shows the total |

There is no separate `indexing` status persisted in the database; the UI infers an in-progress state while the index request is in flight.

---

## Error Format

All error responses use the standard envelope:

```ts
{
  error: {
    code: string; // e.g. "MODEL_UNAVAILABLE"
    message: string;
  }
}
```
