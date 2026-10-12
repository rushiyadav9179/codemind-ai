# ADR-001: Project Stack Selection

**Status:** Accepted  
**Date:** 2026-10  
**Deciders:** Project team

## Context

CodeMind AI is an AI Software Engineering Intelligence Platform. We require a solid, production-grade foundation adhering to modern TypeScript standards and open-source tooling.

## Decisions

1. **Monorepo with npm workspaces**: Simple, no external orchestrators required.
2. **React 19 + TypeScript + Vite**: Fast, modern frontend framework.
3. **Tailwind CSS**: Utility-first styling with dark-mode aesthetic.
4. **Express 5**: Native async error handling.
5. **Zod**: Type-safe schema validation at runtime and startup.
6. **Pino**: High-performance structured NDJSON logger.
7. **PostgreSQL 16 + pgvector**: Relational data and vector similarity search in a single DB.
8. **Redis 7**: Cache and future BullMQ message broker.
9. **Vitest + Supertest**: Fast, modern test execution across client and server.

## Consequences

- Single language across frontend, backend, and types (TypeScript).
- Zero paid API requirements for Phase 1.
