# Architecture Overview — CodeMind AI

## Architecture Diagram

```mermaid
graph TB
    subgraph Browser["Browser (apps/web)"]
        UI[React 19 + Vite Frontend]
        RQ[TanStack Query]
        RR[React Router v7]
    end

    subgraph API["API Server (apps/api)"]
        EX[Express 5]
        HLM[Helmet Middleware]
        CORS[CORS Middleware]
        LOG[Pino Logger]
        VAL[Zod Validation]
        ERR[Error Handler]
        HC[Health Controller]
        HS[Health Service]
    end

    subgraph Shared["packages/shared"]
        TYPES[TypeScript Types Only]
    end

    subgraph Docker["Docker Infrastructure (Local Dev)"]
        PG[(PostgreSQL 16 + pgvector)]
        RD[(Redis 7)]
    end

    UI --> RQ
    UI --> RR
    RQ -->|HTTP /api/v1| EX
    EX --> HLM --> CORS --> LOG
    EX --> HC
    HC --> HS
    EX --> ERR
    API -.->|Phase 2| PG
    API -.->|Phase N| RD
    TYPES -.->|import type| UI
    TYPES -.->|import type| API
```

## Monorepo Layout

- **apps/web**: React application running on Vite.
- **apps/api**: Express application with layered controller/service pattern.
- **packages/shared**: Shared DTOs and type contracts.
- **infrastructure/docker**: Docker compose and configuration definitions.
- **docs/**: Architectural diagrams and ADR records.
