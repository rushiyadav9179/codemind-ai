# Code Intelligence API

All routes use the `/api/v1` prefix and the shared `{ success, data, timestamp }` / `{ success, error, timestamp }` response envelopes.

Every code intelligence endpoint requires a valid JWT access token passed via the `Authorization: Bearer <accessToken>` header. Endpoints enforce strict multi-tenant ownership boundaries: users cannot trigger or view code intelligence analysis for repositories belonging to other users. Attempting to access an inaccessible or non-existent repository always returns a generic `404 REPOSITORY_NOT_FOUND` to prevent information leakage.

---

## `POST /repositories/:id/analysis`

Triggers a synchronous source file ingestion and AST analysis run for a repository.

### Ingestion Constraints & Security Guardrails

- **File count limit**: Maximum 50 files per ingestion batch.
- **File size limit**: Maximum 150 KB per file.
- **Batch size limit**: Maximum 2 MB total batch size.
- **Allowed file types**: JavaScript and TypeScript source files (`.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`).
- **Excluded / Blocked paths**: Path traversal patterns (`../`), hidden directories (`.git`), dependency folders (`node_modules`), build output folders (`dist`, `build`, `out`, `.next`), sensitive files (`.env*`, `*.pem`, `*.key`, `credentials*`, etc.), and binary files.

### Request Headers

- `Authorization: Bearer <accessToken>`
- `Content-Type: application/json`

### Request Body

```json
{
  "files": [
    {
      "filePath": "src/services/userService.ts",
      "content": "export class UserService { async getUser(id: string) { return id; } }"
    },
    {
      "filePath": "src/controllers/userController.ts",
      "content": "import { UserService } from '../services/userService';\nexport const controller = new UserService();"
    }
  ]
}
```

### Responses

- `200 OK`: Analysis successfully performed and persisted.
  ```json
  {
    "success": true,
    "data": {
      "id": "e98e4d92-2b6d-4c8d-8a8b-3e5f2a1b9c0d",
      "repositoryId": "c6a2b0e8-0b5c-43f6-932d-3c22d152a48f",
      "status": "COMPLETED",
      "filesAnalyzed": 2,
      "totalLines": 3,
      "errorSummary": null,
      "completedAt": "2026-10-30T10:00:00.000Z",
      "createdAt": "2026-10-30T10:00:00.000Z"
    },
    "timestamp": "2026-10-30T10:00:00.000Z"
  }
  ```
- `400 Bad Request`: Input validation failed (`VALIDATION_ERROR`) or batch limits violated (`INGESTION_ERROR`).
- `401 Unauthorized`: Missing or invalid access token (`UNAUTHENTICATED`).
- `404 Not Found`: Repository not found or inaccessible (`REPOSITORY_NOT_FOUND`).

---

## `GET /repositories/:id/analysis/latest`

Retrieves the latest completed `AnalysisRun` and aggregated code intelligence metrics for the repository.

### Request Headers

- `Authorization: Bearer <accessToken>`

### Responses

- `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "id": "e98e4d92-2b6d-4c8d-8a8b-3e5f2a1b9c0d",
      "repositoryId": "c6a2b0e8-0b5c-43f6-932d-3c22d152a48f",
      "status": "COMPLETED",
      "filesAnalyzed": 2,
      "totalLines": 3,
      "completedAt": "2026-10-30T10:00:00.000Z",
      "createdAt": "2026-10-30T10:00:00.000Z",
      "summary": {
        "classes": 1,
        "functions": 0,
        "methods": 1,
        "interfaces": 0,
        "types": 0,
        "exports": 2,
        "imports": 1,
        "resolvedDependencies": 1
      }
    },
    "timestamp": "2026-10-30T10:00:00.000Z"
  }
  ```
  _(Returns `data: null` if no analysis run exists for the repository)._
- `401 Unauthorized`: Missing or invalid access token (`UNAUTHENTICATED`).
- `404 Not Found`: Repository not found or inaccessible (`REPOSITORY_NOT_FOUND`).

---

## `GET /repositories/:id/analysis/:analysisId`

Retrieves details and summary metrics for a specific `AnalysisRun`.

### Request Headers

- `Authorization: Bearer <accessToken>`

### Responses

- `200 OK`: Analysis run metadata and summary counts.
- `404 Not Found`: Analysis run or repository not found (`ANALYSIS_NOT_FOUND` / `REPOSITORY_NOT_FOUND`).

---

## `GET /repositories/:id/analysis/:analysisId/files`

Returns a paginated list of analyzed files for the specified analysis run, with optional path/name search and language filtering.

### Query Parameters

- `page` _(integer, optional, default: 1)_: Page number.
- `pageSize` _(integer, optional, default: 20, max: 100)_: Number of items per page.
- `search` _(string, optional)_: Substring filter for file path.
- `language` _(string, optional)_: Exact language filter (`typescript`, `javascript`).

### Responses

- `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "f12a3b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
          "filePath": "src/services/userService.ts",
          "language": "typescript",
          "lineCount": 1,
          "symbolCounts": {
            "functions": 0,
            "classes": 1,
            "methods": 1,
            "interfaces": 0,
            "types": 0,
            "imports": 0,
            "exports": 1
          }
        }
      ],
      "pagination": {
        "page": 1,
        "pageSize": 20,
        "total": 1,
        "totalPages": 1
      }
    },
    "timestamp": "2026-10-30T10:00:00.000Z"
  }
  ```

---

## `GET /repositories/:id/analysis/:analysisId/files/:fileId`

Retrieves the full AST structure and symbol breakdown for a specific analyzed file.

### Responses

- `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "id": "f12a3b4c-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
      "filePath": "src/services/userService.ts",
      "language": "typescript",
      "lineCount": 1,
      "symbols": {
        "functions": [],
        "classes": [
          {
            "name": "UserService",
            "isExported": true,
            "isAbstract": false,
            "properties": [],
            "methods": [
              {
                "name": "getUser",
                "parameters": ["id"],
                "returnType": "Promise<string>",
                "isAsync": true,
                "isStatic": false,
                "visibility": "public"
              }
            ]
          }
        ],
        "interfaces": [],
        "types": [],
        "imports": [],
        "exports": [
          {
            "name": "UserService",
            "type": "class",
            "isDefault": false
          }
        ]
      },
      "dependencies": []
    },
    "timestamp": "2026-10-30T10:00:00.000Z"
  }
  ```
- `404 Not Found`: File not found (`FILE_NOT_FOUND`).

---

## `GET /repositories/:id/analysis/:analysisId/dependencies`

Returns the complete intra-repository architectural dependency graph resolved during the analysis run.

### Responses

- `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "nodes": [
        {
          "id": "src/services/userService.ts",
          "label": "userService.ts",
          "filePath": "src/services/userService.ts",
          "language": "typescript",
          "lineCount": 1,
          "symbolCount": 1
        },
        {
          "id": "src/controllers/userController.ts",
          "label": "userController.ts",
          "filePath": "src/controllers/userController.ts",
          "language": "typescript",
          "lineCount": 2,
          "symbolCount": 1
        }
      ],
      "edges": [
        {
          "source": "src/controllers/userController.ts",
          "target": "src/services/userService.ts",
          "specifier": "../services/userService",
          "importedSymbols": ["UserService"]
        }
      ]
    },
    "timestamp": "2026-10-30T10:00:00.000Z"
  }
  ```
