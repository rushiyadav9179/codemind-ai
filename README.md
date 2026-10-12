# CodeMind AI

**AI Software Engineering Intelligence Platform**

CodeMind AI is a professional developer platform designed to analyze repositories, perform RAG-powered codebase Q&A with citations, review code, identify issues, and generate tests and documentation.

> **Phase 1 — Project Foundation**: Scaffold, monorepo setup, type contracts, Express 5 backend with health checks, React 19 frontend shell, Docker configuration, and test suites.

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
# Copy environment configuration
cp .env.example .env

# Install all workspace dependencies
npm install

# Start Backend (Port 3001)
npm run dev:api

# Start Frontend (Port 5173)
npm run dev:web
```

### 3. Docker Infrastructure (Optional for Phase 1)

```bash
docker compose up -d
```

### 4. Verification

```bash
npm run typecheck
npm run test
npm run build
```
