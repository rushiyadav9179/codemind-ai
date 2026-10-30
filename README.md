# CodeMind AI

**AI Software Engineering Intelligence Platform**

CodeMind AI is a professional developer platform designed to analyze repositories, perform RAG-powered codebase Q&A with citations, review code, identify issues, and generate tests and documentation.

> **Phase 4 — Code Intelligence Engine**: Source file batch ingestion, TypeScript/JavaScript AST parsing using the TypeScript Compiler API, symbol extraction, resolved intra-repository dependency graph, persisted analysis runs, interactive dependency viewer, and file symbol inspector UI.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS, TanStack Query, React Router v7, Lucide Icons
- **Backend**: Node.js, TypeScript, Express 5, Zod, Helmet, CORS, Pino
- **Shared**: `@codemind/shared` contract types
- **Infra**: Docker Compose (PostgreSQL 16 + pgvector, Redis 7)
- **Testing**: Vitest, Supertest, React Testing Library
- **Code Quality**: ESLint 9 (Flat Config), Prettier

---

## Quickstart

### 1. Prerequisites

- Node.js >= 20 (v22 LTS recommended)
- npm >= 10
- Git

### 2. Setup

```bash
# Copy environment configuration (PowerShell)
Copy-Item .env.example .env

# Install all workspace dependencies
npm install

# Start PostgreSQL and Redis for local development
docker compose up -d postgres redis

# Generate the Prisma client and apply the initial schema
npm run prisma:generate
npm run prisma:migrate:dev --workspace=apps/api -- --name authentication
```

Set `AUTH_ACCESS_TOKEN_SECRET` in `.env` to a unique value generated locally:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`AUTH_COOKIE_SECURE=false` is only for local HTTP development. Production must set it to `true`, use HTTPS, and set `CORS_ORIGINS` to the exact browser origin(s).
When operating behind a reverse proxy, set `TRUST_PROXY_HOPS` to the number of trusted proxy hops only if that proxy overwrites forwarding headers.

### 3. Start the applications

```bash
npm run dev:api
npm run dev:web
```

The API runs on port 3001 and the Vite frontend on port 5173. The Vite development proxy forwards `/api` to the API.

### 4. Tests

The API integration tests use a separate PostgreSQL database named `codemind_test`. Create it once:

```bash
docker compose exec postgres createdb -U codemind codemind_test
```

Apply migrations to the test database, then run checks:

```powershell
$testDatabaseLine = Select-String '^TEST_DATABASE_URL=' .env | Select-Object -First 1
if (-not $testDatabaseLine) { throw 'Set TEST_DATABASE_URL in .env first' }
$env:DATABASE_URL = $testDatabaseLine.Line.Substring('TEST_DATABASE_URL='.Length)
if (([uri]$env:DATABASE_URL).AbsolutePath.TrimStart('/').Split('?')[0] -notmatch '_test$') {
  throw 'Refusing to migrate a database without a _test suffix'
}
npm run prisma:migrate:deploy --workspace=apps/api
Remove-Item Env:DATABASE_URL
npm run lint
npm run typecheck
npm test
npm run build
```

The test setup refuses any `TEST_DATABASE_URL` whose database name does not end in `_test`; it never falls back to the development database. CI provisions an isolated PostgreSQL 16 service and migrates it before tests.

## Authentication

- New users are always assigned `USER`. Promote an account to `ADMIN` only through a trusted database operation; registration does not accept roles.
- To promote a registered account as the database operator, run `UPDATE "User" SET "role" = 'ADMIN' WHERE "email" = 'admin@example.com';` against the configured database.
- Login and registration return an access token in the response body. The frontend keeps it in memory and sends it as a Bearer token.
- The opaque refresh token is stored only as a SHA-256 hash in PostgreSQL and is sent to the browser in an `HttpOnly` cookie. A successful refresh rotates both refresh and CSRF tokens.
- `GET /api/v1/auth/me` and all dashboard routes require a valid access token. The API re-reads the user and role from PostgreSQL for authorization.
- Cookie-based refresh and logout require an allowed `Origin` and matching `cm_csrf` cookie / `X-CSRF-Token` header. The CSRF value is bound to the stored refresh session. Refresh calls are single-flight in the frontend and an expired access-token request is retried at most once.
- Deploy the frontend and API through a same-origin reverse proxy (as Vite does locally) so the frontend can read the CSRF cookie. Configure `CORS_ORIGINS` with the exact browser origin.
- See [Authentication API](./docs/api/authentication.md) for endpoint contracts, [authentication flow](./docs/architecture/authentication.md) for the sequence diagram, and [ADR-002](./docs/decisions/ADR-002-authentication-tokens.md) for the token/cookie decision.

## Repository Management (Phase 3)

- All repository endpoints (`/api/v1/repositories`) require bearer authentication (`requireAuth`).
- Strict multi-tenant isolation: repositories are bound to `ownerId` derived directly from the authenticated token.
- Inaccessible or non-existent repositories return a generic `404 REPOSITORY_NOT_FOUND` to prevent ownership enumeration.
- Duplicate repository names for the same owner return `409 REPOSITORY_EXISTS`. Distinct users can register repositories with the same name.
- Pagination supports `page`, `limit` (max 100), and `search` query parameters with deterministic ordering (`createdAt DESC, id DESC`).
- Live frontend management under `/repositories` includes search filtering, empty states, creation modals, metadata editing, and deletion confirmation dialogs.
- See [Repository Management API](./docs/api/repositories.md) for full endpoint contracts and payload schemas.

## Code Intelligence Engine (Phase 4)

- **Source File Ingestion**: Secure batch file ingestion (`POST /api/v1/repositories/:id/analysis`) supporting JavaScript and TypeScript files with limits (50 files, 150KB/file, 2MB batch).
- **Security & Path Sanitization**: Rejects path traversal attempts (`../`), sensitive files (`.env`, `*.pem`, `*.key`), dependency folders (`node_modules`), build directories (`dist`, `build`), and binary files.
- **AST Parsing**: Powered directly by the TypeScript Compiler API (`typescript` 5.x) without external binaries or Python dependencies. Extracts functions, methods, classes, interfaces, type aliases, imports, exports, and comments.
- **Dependency Graph**: Resolves relative file imports (`./`, `../`) to actual repository files to construct a directed architectural dependency graph.
- **Persistence**: Backed by PostgreSQL via Prisma (`AnalysisRun` and `AnalyzedFile` models with relational integrity and cascade cleanup on repository deletion).
- **Frontend Intelligence Dashboard**:
  - Overview metrics: analyzed files count, total lines of code, symbol counts, and dependency edge counts.
  - Interactive file explorer with search, language filter, and AST symbol inspector (drilldown into functions, classes, interfaces, types).
  - Architecture dependency graph visualizer.
  - Ingestion modal with pre-loaded sample TypeScript architecture templates for immediate testing.
- See [Code Intelligence API](./docs/api/intelligence.md) for endpoint documentation.

### Prisma commands

```bash
npm run prisma:generate
npm run prisma:migrate:dev --workspace=apps/api -- --name <migration-name>
npm run prisma:migrate:deploy
```

Do not use the test database for development data, or run test cleanup against a non-test database.
