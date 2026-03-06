---
title: API Reference
description: REST endpoints, request/response examples, and operational contracts.
---

This page is the API entry point for Hivemind.

## Base URL

- Local: `http://localhost:8000`
- Production: set by your deployment ingress/domain

## Authentication

Hivemind expects a bearer token for protected routes.

```http
Authorization: Bearer <token>
```

## Core Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness and readiness check |
| `POST` | `/v1/tasks` | Create a new orchestrated task |
| `GET` | `/v1/tasks/{task_id}` | Fetch task state and metadata |
| `GET` | `/v1/tasks/{task_id}/events` | Stream task events and agent actions |

## Request/Response Schemas

For complete payload definitions and examples, see the detailed API docs:

- [Detailed API Reference](/reference/api)

## Error Contract

All non-2xx responses return JSON:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {}
  }
}
```

## Versioning

- Current major version prefix: `/v1`
- Backward-incompatible changes are introduced in a new major prefix.
