# Authentication Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Web as React application
    participant API as Express API
    participant DB as PostgreSQL

    Browser->>Web: Submit email/password
    Web->>API: POST /auth/login (allowed Origin)
    API->>DB: Find normalized email, verify Argon2id hash
    API->>DB: Store hash(refresh token) + hash(CSRF token)
    API-->>Web: Access JWT + user; HttpOnly refresh and CSRF cookies
    Web->>Web: Keep access JWT in memory

    Web->>API: Protected request with Bearer access JWT
    API->>DB: Verify JWT claims, load current user and role
    API-->>Web: Protected response

    Note over Web,API: On 401, one shared refresh request is made
    Web->>API: POST /auth/refresh + refresh cookie + CSRF header
    API->>DB: Atomically revoke old token and store rotated hashes
    API-->>Web: New access JWT and rotated cookies
    Web->>API: Retry original request once

    Web->>API: POST /auth/logout + Origin + CSRF header
    API->>DB: Revoke current refresh session
    API-->>Web: Clear cookies
```

The access token contains only the user subject and standard issuer, audience, issued-at, and expiry claims. It is verified with an explicit HS256 allowlist. Middleware loads the current role from PostgreSQL; no client-supplied role or user ID is trusted. Refresh tokens are random opaque values; only their SHA-256 hashes and associated CSRF hashes are persisted. Each login creates an independent refresh-token family.

Cookie-authenticated mutations require an exact configured origin. Refresh and logout additionally compare the CSRF header to the readable cookie and then compare its hash with the active database session. The refresh cookie is `HttpOnly`; access JWTs are never written to browser storage. `SameSite=Lax` is used for the same-origin frontend/API deployment, which is expected to use a reverse proxy for `/api`; `Secure` is mandatory in production.
