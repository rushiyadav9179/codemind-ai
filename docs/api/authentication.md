# Authentication API

All routes use the `/api/v1` prefix and the shared `{ success, data, timestamp }` / `{ success, error, timestamp }` response envelopes. Authentication errors never return password hashes, refresh tokens, or token-validation details.

Cookie-based write requests must include the configured frontend `Origin`. Refresh and logout must also send the readable `cm_csrf` cookie value in the `X-CSRF-Token` header. The API rejects requests whose origin is not in `CORS_ORIGINS`.

## `POST /auth/register`

Creates a `USER` account and starts a session. Email is trimmed and lowercased. Passwords must be 12–128 characters and include at least three of lowercase, uppercase, number, and symbol.

```json
{ "email": "dev@example.com", "password": "CorrectHorseBattery9!" }
```

Returns `201` with `{ "accessToken": "...", "user": { "id": "...", "email": "...", "role": "USER" } }`, plus refresh and CSRF cookies. The optional `role` field is rejected.

Returns `400` for invalid input, `409 REGISTRATION_UNAVAILABLE` for duplicate email, and `429` after five attempts per IP per hour. The duplicate response does not state whether the email exists.

## `POST /auth/login`

```json
{ "email": "dev@example.com", "password": "CorrectHorseBattery9!" }
```

Returns `200` with the same body and cookies as registration. Bad email/password combinations return the same `401 INVALID_CREDENTIALS` response. Rate limit: ten attempts per IP per 15 minutes.

## `POST /auth/refresh`

No request body. Sends the `HttpOnly` refresh cookie and the CSRF cookie/header pair. Returns a new access token, user, refresh cookie, and CSRF cookie. The prior refresh token is invalidated in the same database transaction. Reuse of an already-rotated token revokes all active refresh tokens in that family.

Returns `401` for missing, expired, revoked, or reused sessions and `403` for failed CSRF validation.

## `POST /auth/logout`

No request body. Requires allowed `Origin` and CSRF cookie/header pair. Revokes the presented refresh token and clears both cookies. Returns `{ "loggedOut": true }`.

## `POST /auth/logout-all`

Requires `Authorization: Bearer <accessToken>`. Revokes all active refresh sessions for the authenticated user and clears the current browser cookies. Returns `{ "revokedSessions": 2 }`.

## `GET /auth/me`

Requires `Authorization: Bearer <accessToken>`. Returns the current database-backed user:

```json
{ "id": "uuid", "email": "dev@example.com", "role": "USER" }
```

## `GET /auth/admin`

Example admin-only endpoint for verifying role authorization. Returns `403 FORBIDDEN` for authenticated non-admin users and `401 UNAUTHENTICATED` if no valid access token is supplied.

## Cookies and status codes

`cm_refresh` is `HttpOnly`, `SameSite=Lax` by default, scoped to `/api/v1/auth`, and `Secure` in production. `cm_csrf` is readable by the frontend, `SameSite=Lax`, and scoped to `/` so the app can add its value to the required header. Local HTTP development explicitly uses `AUTH_COOKIE_SECURE=false`; production startup rejects this setting.

| Status | Meaning                                                          |
| ------ | ---------------------------------------------------------------- |
| `200`  | Login, refresh, logout, logout-all, or profile request succeeded |
| `201`  | Registration succeeded                                           |
| `400`  | Request validation failed                                        |
| `401`  | Missing/invalid authentication or invalid credentials            |
| `403`  | Untrusted origin, failed CSRF validation, or insufficient role   |
| `409`  | Registration unavailable (including duplicate email)             |
| `429`  | Authentication rate limit exceeded                               |
