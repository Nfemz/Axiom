# API Patterns

## Overview

Two API surfaces:
1. **Dashboard API** — Next.js 15 App Router API routes (`packages/dashboard/src/app/api/`)
2. **Orchestrator HTTP** — Minimal Node.js HTTP server (health endpoint only, port 3001)

All client-facing APIs go through the Dashboard. The Orchestrator exposes only `/health`.

## Route Structure

Next.js App Router file-based routing:

```text
app/api/
├── agents/
│   ├── route.ts              # GET (list), POST (create)
│   └── [id]/
│       ├── route.ts          # GET, PATCH, DELETE
│       ├── checkpoints/route.ts
│       ├── children/route.ts
│       ├── memory/route.ts
│       └── sessions/route.ts
├── definitions/
│   ├── route.ts
│   └── [id]/route.ts
├── pipelines/
│   ├── route.ts
│   └── [id]/route.ts
├── secrets/
│   ├── route.ts
│   └── [id]/route.ts
├── alerts/
│   ├── route.ts
│   └── rules/[id]/route.ts
├── auth/
│   ├── register/route.ts
│   ├── login/route.ts
│   └── logout/route.ts
├── stream/
│   ├── agents/route.ts       # SSE
│   ├── alerts/route.ts       # SSE
│   ├── costs/route.ts        # SSE
│   └── pipeline/[id]/route.ts # SSE
├── financial/route.ts
├── identities/route.ts
├── skills/route.ts
└── system/
    ├── config/route.ts
    ├── setup/route.ts
    ├── backup/route.ts
    └── memory-health/route.ts
```

## Route Handler Pattern

Every route follows this structure:

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAuth();
  if (authError) return authError;

  const db = getDb();
  const result = await db.select().from(agents);

  return NextResponse.json({ agents: result, total: result.length });
}
```

Key patterns:
1. `export const dynamic = "force-dynamic"` — disable Next.js caching for API routes
2. Auth check first — `requireAuth()` returns a `NextResponse` error or `null`
3. Early return on auth failure
4. Get DB connection via `getDb()`
5. Return `NextResponse.json()` with data

## Request Validation

Validate request bodies with Zod schemas from `@axiom/shared`:

```typescript
import { SpawnAgentRequest } from "@axiom/shared";

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const parsed = SpawnAgentRequest.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // Use parsed.data...
}
```

## Error Responses

Consistent JSON error shape:

```typescript
// 400 — validation error
{ "error": "definitionId is required" }

// 404 — not found
{ "error": "Agent definition not found" }

// 401 — unauthorized
{ "error": "Authentication required" }
```

Always use appropriate HTTP status codes. No wrapping errors in 200 responses.

## Authentication

WebAuthn/Passkey flow via @simplewebauthn:

1. `POST /api/auth/register` — register a new passkey
2. `POST /api/auth/login` — authenticate with passkey
3. `POST /api/auth/logout` — destroy session

Sessions managed by iron-session (encrypted, stateless cookies). Every API route (except auth) calls `requireAuth()`.

## SSE Streaming

Server-sent events for real-time dashboard updates:

```text
GET /api/stream/agents    — Agent status changes
GET /api/stream/alerts    — Alert events
GET /api/stream/costs     — LLM cost updates
GET /api/stream/pipeline/[id] — Pipeline progress
```

SSE routes use `ReadableStream` with `text/event-stream` content type. They poll Redis or subscribe to channels and push events to the client.

## Orchestrator Health Endpoint

The orchestrator exposes only one HTTP endpoint:

```typescript
// GET /health on port 3001
{
  "status": "healthy",
  "uptime": 12345,
  "subsystems": { ... }
}
```

All other orchestrator functionality communicates via Redis (BullMQ queues and Streams).

## Adding a New API Route

1. Create `route.ts` in the appropriate `app/api/` directory
2. Add `export const dynamic = "force-dynamic"`
3. Start with `requireAuth()` check
4. Define Zod schema in `@axiom/shared` if needed
5. Validate request body before processing
6. Return `NextResponse.json()` with appropriate status code
7. Add SSE stream route if the resource needs real-time updates
