# Repository Management API

All routes use the `/api/v1` prefix and the shared `{ success, data, timestamp }` / `{ success, error, timestamp }` response envelopes.

Every repository endpoint requires a valid JWT access token passed via the `Authorization: Bearer <accessToken>` header. Endpoints enforce strict multi-tenant ownership boundaries: users cannot view, edit, or delete repositories belonging to other users. Attempting to access an inaccessible or non-existent repository always returns a generic `404 REPOSITORY_NOT_FOUND` to prevent information leakage.

---

## `POST /repositories`

Creates a new repository owned by the authenticated user.

### Request Headers

- `Authorization: Bearer <accessToken>`
- `Content-Type: application/json`

### Request Body

```json
{
  "name": "core-platform",
  "description": "Microservices backend platform",
  "defaultBranch": "main",
  "language": "TypeScript"
}
```

- `name` _(string, required)_: 1–100 characters. May only contain letters, numbers, hyphens, periods, or underscores (`/^[a-zA-Z0-9._-]+$/`).
- `description` _(string, optional)_: Maximum 500 characters.
- `defaultBranch` _(string, optional)_: Default is `"main"`. Maximum 100 characters.
- `language` _(string, optional)_: Primary programming language. Maximum 50 characters.

### Responses

- `201 Created`: Repository successfully created.
  ```json
  {
    "success": true,
    "data": {
      "id": "c6a2b0e8-0b5c-43f6-932d-3c22d152a48f",
      "ownerId": "f7841c30-d021-4f10-9c2b-e1091563f6a2",
      "name": "core-platform",
      "description": "Microservices backend platform",
      "sourceType": "MANUAL",
      "defaultBranch": "main",
      "language": "TypeScript",
      "status": "ACTIVE",
      "createdAt": "2026-10-18T23:00:00.000Z",
      "updatedAt": "2026-10-18T23:00:00.000Z"
    },
    "timestamp": "2026-10-18T23:00:00.000Z"
  }
  ```
- `400 Bad Request`: Input validation failed (`VALIDATION_ERROR`).
- `401 Unauthorized`: Missing or invalid access token (`UNAUTHENTICATED`).
- `409 Conflict`: Repository name already exists for this owner (`REPOSITORY_EXISTS`).

---

## `GET /repositories`

Lists the authenticated user's repositories with pagination and optional search.

### Request Headers

- `Authorization: Bearer <accessToken>`

### Query Parameters

- `page` _(number, optional)_: Page number (1-indexed). Default is `1`.
- `limit` _(number, optional)_: Number of items per page. Default is `10`, maximum is `100`.
- `search` _(string, optional)_: Case-insensitive search filter matching name or description.

### Responses

- `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "c6a2b0e8-0b5c-43f6-932d-3c22d152a48f",
          "ownerId": "f7841c30-d021-4f10-9c2b-e1091563f6a2",
          "name": "core-platform",
          "description": "Microservices backend platform",
          "sourceType": "MANUAL",
          "defaultBranch": "main",
          "language": "TypeScript",
          "status": "ACTIVE",
          "createdAt": "2026-10-18T23:00:00.000Z",
          "updatedAt": "2026-10-18T23:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "totalItems": 1,
        "totalPages": 1,
        "hasNextPage": false,
        "hasPrevPage": false
      }
    },
    "timestamp": "2026-10-18T23:00:00.000Z"
  }
  ```
- `401 Unauthorized`: Missing or invalid access token (`UNAUTHENTICATED`).

---

## `GET /repositories/:id`

Retrieves a single repository by its UUID.

### Request Headers

- `Authorization: Bearer <accessToken>`

### Path Parameters

- `id` _(UUID string)_: Repository ID.

### Responses

- `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "id": "c6a2b0e8-0b5c-43f6-932d-3c22d152a48f",
      "ownerId": "f7841c30-d021-4f10-9c2b-e1091563f6a2",
      "name": "core-platform",
      "description": "Microservices backend platform",
      "sourceType": "MANUAL",
      "defaultBranch": "main",
      "language": "TypeScript",
      "status": "ACTIVE",
      "createdAt": "2026-10-18T23:00:00.000Z",
      "updatedAt": "2026-10-18T23:00:00.000Z"
    },
    "timestamp": "2026-10-18T23:00:00.000Z"
  }
  ```
- `400 Bad Request`: Malformed UUID parameter (`VALIDATION_ERROR`).
- `401 Unauthorized`: Missing or invalid access token (`UNAUTHENTICATED`).
- `404 Not Found`: Repository does not exist or belongs to another user (`REPOSITORY_NOT_FOUND`).

---

## `PATCH /repositories/:id`

Updates metadata for a repository owned by the authenticated user.

### Request Headers

- `Authorization: Bearer <accessToken>`
- `Content-Type: application/json`

### Request Body

At least one field must be provided:

```json
{
  "name": "core-platform-renamed",
  "description": "Updated platform description",
  "defaultBranch": "develop",
  "language": "Rust",
  "status": "ARCHIVED"
}
```

- `name` _(string, optional)_: 1–100 characters. Letters, numbers, hyphens, periods, or underscores only.
- `description` _(string | null, optional)_: Maximum 500 characters.
- `defaultBranch` _(string, optional)_: Maximum 100 characters.
- `language` _(string | null, optional)_: Maximum 50 characters.
- `status` _(enum, optional)_: `"ACTIVE"` or `"ARCHIVED"`.

### Responses

- `200 OK`: Returns updated repository object.
- `400 Bad Request`: Validation failure or empty update payload (`VALIDATION_ERROR`).
- `401 Unauthorized`: Missing or invalid access token (`UNAUTHENTICATED`).
- `404 Not Found`: Repository does not exist or belongs to another user (`REPOSITORY_NOT_FOUND`).
- `409 Conflict`: Target name conflicts with another repository owned by this user (`REPOSITORY_EXISTS`).

---

## `DELETE /repositories/:id`

Permanently deletes a repository owned by the authenticated user.

### Request Headers

- `Authorization: Bearer <accessToken>`

### Responses

- `200 OK`:
  ```json
  {
    "success": true,
    "data": {
      "deleted": true,
      "id": "c6a2b0e8-0b5c-43f6-932d-3c22d152a48f"
    },
    "timestamp": "2026-10-18T23:00:00.000Z"
  }
  ```
- `400 Bad Request`: Malformed UUID parameter (`VALIDATION_ERROR`).
- `401 Unauthorized`: Missing or invalid access token (`UNAUTHENTICATED`).
- `404 Not Found`: Repository does not exist or belongs to another user (`REPOSITORY_NOT_FOUND`).
