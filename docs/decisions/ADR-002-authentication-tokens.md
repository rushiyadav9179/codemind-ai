# ADR-002: Authentication Token and Cookie Strategy

- **Status:** Accepted
- **Date:** 2026-10-14

## Context

CodeMind AI needs revocable sessions for a browser-based frontend, while avoiding persistent access-token storage and protecting cookie-authenticated requests against CSRF. Authentication must persist in PostgreSQL and must not depend on a paid identity service.

## Decision

- Persist users, roles, and refresh-token sessions with Prisma/PostgreSQL.
- Hash passwords with Argon2id and use database uniqueness for normalized email.
- Issue short-lived access JWTs signed with HS256; verify the algorithm allowlist, expiry, issuer, audience, and subject.
- Keep access tokens in frontend memory only.
- Generate cryptographically random opaque refresh tokens, store only SHA-256 hashes, and rotate them transactionally on every successful refresh.
- Group rotated tokens into a family; reuse of a revoked token revokes all active members of the family.
- Send refresh tokens in `HttpOnly`, `SameSite=Lax` cookies. Require secure cookies in production.
- Use a separate readable CSRF cookie, require an allowed `Origin` and matching `X-CSRF-Token` on refresh/logout, and bind the CSRF hash to the refresh-token database row.
- Re-read role and account state from PostgreSQL for authenticated requests.

## Consequences

- PostgreSQL must be configured and migrations applied before authentication is available.
- Local HTTP development may set `AUTH_COOKIE_SECURE=false`; production cannot.
- The frontend and API should be exposed through the same origin (normally a reverse proxy for `/api`) so the frontend can read the CSRF cookie; `SameSite=Lax` is used for this deployment.
- Concurrent refresh requests share one frontend refresh promise. A reused token invalidates the affected family and requires the user to sign in again.
- Administrators are provisioned through a trusted database operation; public registration can only create `USER` accounts.
