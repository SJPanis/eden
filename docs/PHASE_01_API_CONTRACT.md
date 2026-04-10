# PHASE 01 — API CONTRACT (Unity ↔ Next.js)

> Source of truth for every endpoint and WebSocket event the Eden Unity client consumes from the Next.js backend.
> Companion to `docs/EDEN_WORLD_SPEC.md` (canonical spec) and `docs/PHASE_01_AUDIT.md` (current backend state).
> Last updated: 2026-04-10.

---

## §0 — Decisions locked in for Phase 01

These decisions resolve the open questions from `PHASE_01_AUDIT.md §8` and are the foundation for every contract below.

1. **Leaf balance** — `EdenWallet` is the single source of truth. The legacy `User.edenBalanceCredits` / `promoBalance` / `realBalance` / `withdrawableBalance` columns are deprecated. A one-time migration script consolidates them into `EdenWallet.leafsBalance`, after which the legacy columns are dropped. Every new endpoint reads/writes `EdenWallet` only. See §13 for the migration plan.
2. **Auth tokens** — Unity uses **JWT** (access + refresh). A new `POST /api/auth/login` mints tokens from `User.passwordHash` via argon2. Access tokens expire in 1h; refresh tokens in 30d with **rotation** (each refresh invalidates the old refresh token and issues a new one). Existing Auth.js cookie sessions continue to power the web app in parallel — both auth modes coexist.
3. **Agent model** — A fresh Prisma `Agent` model matching spec §9.1 is added. `EdenAgent`, `AgentBuild`, and `AgentTask` are kept as legacy references but no new code writes to them. `ProjectRuntimeTask` and friends stay — they're a separate owner-internal sandbox subsystem.
4. **Service naming** — Internal routes stay under `/api/wallet/*`, `/api/stripe/*`, etc. Unity-facing routes live under `/api/leaf/*` as thin aliases, because "Leaf" is the product-facing brand. Both can coexist. Aliases are registered as separate `route.ts` files that delegate to the canonical handler.
5. **WebSocket** — Socket.io embedded directly in `server.js`, sharing the existing HTTP server. No sidecar. Railway deploys one process.
6. **Governance** — Out of scope for Phase 01. The Council Ring zone can render a placeholder in Phase 04. No `/api/governance/*` routes or `Proposal` model in this phase.

---

## §1 — Conventions

### §1.1 Request / response shape

Every JSON API response follows:

```ts
{
  ok: boolean,
  data?: T,      // present when ok === true
  error?: {      // present when ok === false
    code: string,   // machine-readable, SCREAMING_SNAKE
    message: string // human-readable
  }
}
```

Tables below list the shape of `data` only. Error codes are enumerated per endpoint.

### §1.2 Authentication

- **Unity clients** — `Authorization: Bearer <accessToken>` on every REST call. For WebSocket, include `{ auth: { token: accessToken } }` in the Socket.io handshake.
- **Web browser** — existing Auth.js cookie session (unchanged).
- Any protected endpoint accepts **either** and resolves the user via a shared `resolveAuthenticatedUser(request)` helper (see §14).

### §1.3 HTTP status codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created (new row) |
| 204 | Success, no body |
| 400 | Invalid request (missing/malformed fields) |
| 401 | Not authenticated (no token, expired token, invalid signature) |
| 402 | Insufficient Leaf balance |
| 403 | Authenticated but not permitted (wrong role, locked resource) |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate, idempotency violation) |
| 422 | Validation failure (well-formed but semantically invalid) |
| 429 | Rate limit exceeded |
| 500 | Server error |
| 503 | Degraded (e.g., DB down) |

### §1.4 Idempotency

Mutating endpoints that can be retried accept an `Idempotency-Key` header. Server deduplicates by `(userId, key)` for 24h.

### §1.5 Versioning

The REST surface is versioned by **client version**, not URL version. The server checks `X-Eden-Client-Version` on every request and rejects (with `426 Upgrade Required`) if the client is below the minimum supported version. See §3.

---

## §2 — Auth

### §2.1 `POST /api/auth/login`

Mints a JWT pair from username (or email) + password. Unity uses this exclusively. The web app keeps using Auth.js.

**Request:**
```json
{
  "username": "sonny",
  "password": "••••••••",
  "clientVersion": "0.9.3",
  "platform": "windows"
}
```
`username` may be either a username or email. `platform` ∈ `"windows" | "macos" | "linux"`.

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "rt_8f3a...",
    "accessTokenExpiresAt": "2026-04-10T13:00:00.000Z",
    "refreshTokenExpiresAt": "2026-05-10T12:00:00.000Z",
    "user": {
      "id": "clx...",
      "username": "sonny",
      "displayName": "Sonny",
      "email": "sonny@example.com",
      "role": "owner"
    },
    "avatar": {
      "sprite": "seed-01",
      "color": "#69f0ae",
      "nameColor": "#ffffff"
    },
    "leafBalance": 4250
  }
}
```

**Errors:** `INVALID_CREDENTIALS` (401), `ACCOUNT_FROZEN` (403), `CLIENT_VERSION_UNSUPPORTED` (426), `RATE_LIMITED` (429, 5 attempts/min/IP).

**Token format:**

```
accessToken  = JWT signed with NEXTAUTH_SECRET (HS256)
               header:  { alg: "HS256", typ: "JWT" }
               payload: {
                 sub: userId,
                 username,
                 edenPlatformRole: "owner" | "business" | "consumer",
                 type: "access",
                 aud: "eden-unity-client",
                 iss: "eden",
                 iat, exp                      // 1h
               }

refreshToken = opaque random 32-byte hex, persisted server-side hashed
               format: rt_<32-hex>
```

Using `NEXTAUTH_SECRET` lets the existing `middleware.ts` (which calls `next-auth/jwt::getToken()`) validate Unity tokens with zero changes — same claim names, same signing secret. The `aud` claim lets server code distinguish Unity sessions from web sessions if needed.

### §2.2 `POST /api/auth/refresh`

Rotates the refresh token. The old refresh token is immediately revoked.

**Request:**
```json
{ "refreshToken": "rt_8f3a..." }
```

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "rt_new...",
    "accessTokenExpiresAt": "...",
    "refreshTokenExpiresAt": "..."
  }
}
```

**Errors:** `REFRESH_TOKEN_INVALID` (401), `REFRESH_TOKEN_EXPIRED` (401), `REFRESH_TOKEN_REVOKED` (401, likely token reuse attack → invalidate entire refresh chain for the user).

**Rotation rule:** if a revoked refresh token is presented, **invalidate every refresh token for that user** and require a fresh login. This is the standard defense against refresh-token theft.

### §2.3 `POST /api/auth/logout`

Revokes the supplied refresh token (and optionally all refresh tokens for the user if `everywhere: true`). Access tokens are stateless so they continue to work until their 1h expiry — clients must stop using them immediately.

**Request:**
```json
{ "refreshToken": "rt_8f3a...", "everywhere": false }
```

**Response 204**

### §2.4 `GET /api/auth/me`

Returns the authenticated user's profile snapshot. Unity hits this on launch after login to get current balance, avatar, and world spawn position.

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "clx...",
      "username": "sonny",
      "displayName": "Sonny",
      "email": "sonny@example.com",
      "role": "owner",
      "onboardingCompletedAt": "2026-03-15T00:00:00.000Z"
    },
    "leafBalance": 4250,
    "avatar": {
      "sprite": "seed-01",
      "color": "#69f0ae",
      "nameColor": "#ffffff"
    },
    "lastPosition": { "x": 0, "y": 0, "zone": "tree" },
    "referralCode": "SONNY-Q42X"
  }
}
```

**Errors:** `UNAUTHORIZED` (401).

---

## §3 — Version / auto-update

### §3.1 `GET /api/version`

Unauthenticated. Unity hits this **before login** on every launch. Response is cached at the CDN for 60s.

**Query:** `?platform=windows` (or `macos`, `linux`)

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "version": "0.9.3",
    "minimumSupportedVersion": "0.9.0",
    "required": true,
    "platform": {
      "windows": {
        "url": "https://cdn.edencloud.app/client/0.9.3/Eden-Setup-0.9.3.exe",
        "sha256": "3f8b…",
        "size": 187342528
      },
      "macos": {
        "url": "https://cdn.edencloud.app/client/0.9.3/Eden-0.9.3.dmg",
        "sha256": "a0c2…",
        "size": 193847293
      }
    },
    "changelog": "New Observatory interior. 3 improved textures. Bug fixes.",
    "assetManifest": {
      "mushroom_cluster_01": 3,
      "tree_bark": 5,
      "energy_stream_noise": 2
    },
    "releasedAt": "2026-04-09T18:00:00.000Z"
  }
}
```

Unity's launch logic (spec §11):
1. Compare `data.version` with `Application.version`. If different → forced update flow.
2. If same version, compare `data.assetManifest` with `StreamingAssets/assets.json`. Download only changed assets.
3. On any request: if server returns `426 Upgrade Required`, pop the update screen again.

**Errors:** `PLATFORM_UNSUPPORTED` (400).

### §3.2 `POST /api/admin/release` (owner only)

Registers a new client build. Triggers a `version.alert` WebSocket broadcast to all connected clients.

**Request:**
```json
{
  "version": "0.9.4",
  "platform": {
    "windows": { "url": "...", "sha256": "...", "size": 0 },
    "macos":   { "url": "...", "sha256": "...", "size": 0 }
  },
  "required": true,
  "minimumSupportedVersion": "0.9.0",
  "changelog": "..."
}
```

**Response 201** — returns the created `ClientVersion` row.

Requires `edenPlatformRole === "owner"` and a valid TOTP command token (via `lib/command-tokens.ts`).

---

## §4 — World state

### §4.1 `GET /api/world/state`

Full world snapshot. Unity calls this on connect and after any WebSocket reconnection for reconciliation.

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "players": [
      {
        "id": "clx...",
        "username": "sonny",
        "displayName": "Sonny",
        "position": { "x": 12.5, "y": -3.2 },
        "zone": "observatory",
        "avatar": { "sprite": "seed-01", "color": "#69f0ae", "nameColor": "#ffffff" },
        "isMoving": false
      }
    ],
    "agents": [
      {
        "id": "clx...",
        "type": "artist",
        "ownerId": "clx...",
        "ownerName": "sonny",
        "state": "working",
        "taskSummary": "Building stock chart component",
        "zoneTarget": "observatory",
        "position": { "x": 15.1, "y": -2.8 },
        "progress": 0.42,
        "spawnedAt": "2026-04-10T12:01:15.000Z"
      }
    ],
    "tree": {
      "glowIntensity": 0.6,
      "pulseRate": 0.9,
      "canopyColor": [0.52, 0.94, 0.68],
      "rootBrightness": 0.4,
      "leafFallRate": 3,
      "branchGrowth": 0.72,
      "seedDrops": 2
    },
    "zones": [
      { "id": "observatory", "playerCount": 1, "agentCount": 1, "isActive": true },
      { "id": "workshop",    "playerCount": 0, "agentCount": 0, "isActive": true },
      { "id": "grove",       "playerCount": 0, "agentCount": 0, "isActive": true },
      { "id": "wellspring",  "playerCount": 0, "agentCount": 0, "isActive": true },
      { "id": "council",     "playerCount": 0, "agentCount": 0, "isActive": false }
    ],
    "serverTime": "2026-04-10T12:05:32.123Z"
  }
}
```

Zone ids are canonical strings: `tree`, `observatory`, `workshop`, `grove`, `wellspring`, `council`, `sealed`.

**Errors:** `UNAUTHORIZED` (401).

---

## §5 — Leaf (wallet aliases)

Public Unity-facing aliases. Each delegates to the canonical `/api/wallet/*` handler internally. After the `EdenWallet` migration (§13), both layers read/write `EdenWallet` only.

### §5.1 `GET /api/leaf/balance`

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "balance": 4250,
    "locked": 0,
    "totalPurchased": 5000,
    "totalGranted": 750,
    "totalSpent": 1500,
    "contributionScore": 12,
    "recent": [
      {
        "id": "clx...",
        "type": "SERVICE_PURCHASE",
        "leafsAmount": -5,
        "description": "Market Lens · TSLA analyze",
        "createdAt": "2026-04-10T11:58:02.000Z"
      }
    ]
  }
}
```

`recent` is the 20 most recent `EdenTransaction` rows for the user's wallet.

### §5.2 `POST /api/leaf/topup`

Creates a Stripe Checkout session. Unity opens `data.checkoutUrl` in the OS default browser (or in an embedded WebView overlay).

**Request:**
```json
{ "packageId": "starter_275" }
```
`packageId` ∈ `"starter_275" | "balanced_1150" | "high_3250"` (prices defined server-side; Unity never sends cents).

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_...",
    "sessionId": "cs_test_...",
    "expectedLeafs": 275,
    "amountCents": 1000,
    "currency": "usd",
    "expiresAt": "2026-04-10T13:05:00.000Z"
  }
}
```

On successful payment, the Stripe webhook (§5.3) credits `EdenWallet` and broadcasts a `leaf.transaction` WebSocket event back to the user.

**Errors:** `UNKNOWN_PACKAGE` (400), `STRIPE_ERROR` (502).

### §5.3 `POST /api/leaf/webhook` (Stripe)

Server-to-server. Verifies Stripe signature, upserts `CreditsTopUpPayment`, credits `EdenWallet`, emits `leaf.transaction` WebSocket event to the purchasing user. Not called by Unity.

### §5.4 `POST /api/leaf/spend` (internal / service execution)

**Not called directly by Unity.** Service execution routes (§7) deduct Leafs inline via `eden-economy-service.deductLeafs()`. This endpoint exists only for the web app's legacy spend flow and is aliased for parity. A future phase may remove it.

---

## §6 — Avatar

### §6.1 `GET /api/avatar/config`

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "sprite": "seed-01",
    "color": "#69f0ae",
    "nameColor": "#ffffff"
  }
}
```

Defaults are generated server-side on first call and persisted to `User.avatarConfig` (a new JSON column added in the same migration as the wallet cleanup).

### §6.2 `PUT /api/avatar/config`

**Request:**
```json
{
  "sprite": "seed-02",
  "color": "#00e5ff",
  "nameColor": "#ffffff"
}
```

**Validation:**
- `sprite` must be one of a server-side allowlist (`seed-01`, `seed-02`, ... — extended as new sprites ship via the visual pipeline).
- `color` and `nameColor` must be 7-char hex strings.

**Response 200** — returns the updated config.

**Errors:** `INVALID_SPRITE` (422), `INVALID_COLOR` (422), `UNAUTHORIZED` (401).

---

## §7 — Services

Unity-facing aliases of the three live Claude-backed services. Each costs Leafs, charged on successful response.

### §7.1 `POST /api/services/market-lens`

Alias of `POST /api/services/market-lens/analyze`.

**Request:**
```json
{
  "ticker": "TSLA",
  "analysisType": "full"
}
```
`analysisType` ∈ `"technical" | "fundamental" | "sentiment" | "full"`.

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "ticker": "TSLA",
    "currentPrice": 245.32,
    "change": -1.42,
    "changePercent": -0.58,
    "peRatio": 68.2,
    "analystConsensus": "Hold",
    "priceTargets": { "low": 180, "mean": 260, "high": 340 },
    "priceHistory": {
      "30d": [ /* ... */ ],
      "21d": [ /* ... */ ],
      "14d": [ /* ... */ ],
      "7d":  [ /* ... */ ],
      "3d":  [ /* ... */ ]
    },
    "catalysts": ["Q2 earnings 2026-04-22", "Model Y refresh launch"],
    "risks": ["Margin compression", "China demand softening"],
    "leafCost": 5,
    "balanceAfter": 4245
  }
}
```

**Errors:** `INSUFFICIENT_BALANCE` (402), `INVALID_TICKER` (422), `UPSTREAM_ERROR` (502, Claude/web-search failure).

**Cost:** 5 Leafs per call (source: `EdenService[slug="market-lens"].leafCost`).

### §7.2 `POST /api/services/imagine-auto`

Alias of `POST /api/services/imagine-auto/visualize`.

**Request:**
```json
{
  "year": 2024,
  "make": "Toyota",
  "model": "Tacoma",
  "description": "matte black lift kit overlanding rig"
}
```

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "vehicle": { "year": 2024, "make": "Toyota", "model": "Tacoma" },
    "prompt": "Photorealistic matte black 2024 Toyota Tacoma with 3-inch lift...",
    "imageUrl": "https://pollinations.ai/...",
    "leafCost": 8,
    "balanceAfter": 4237
  }
}
```

**Cost:** 8 Leafs per call.

### §7.3 `POST /api/services/spot-splore`

Alias of `POST /api/services/spot-splore/discover`.

**Request:**
```json
{
  "vibe": "late-night autumn drive",
  "location": "Portland, OR"
}
```

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "vibe": "late-night autumn drive",
    "location": "Portland, OR",
    "tracks": [
      {
        "title": "Midnight City",
        "artist": "M83",
        "year": 2011,
        "why": "Shimmering synths match the cold damp streets."
      }
    ],
    "artists": ["M83", "Beach House", "The War on Drugs"],
    "places": [
      { "name": "Powell's City of Books", "area": "Pearl District", "note": "Open till 11p, perfect decompression stop." }
    ],
    "playlistName": "Wet Streets, Warm Dash",
    "spotifyQuery": "synthwave dream pop autumn drive",
    "leafCost": 4,
    "balanceAfter": 4233
  }
}
```

**Cost:** 4 Leafs per call.

---

## §8 — Agents

Fresh `Agent` model introduced in this phase. Legacy `AgentBuild` / `AgentTask` / `EdenAgent` stay in the schema for historical reference but no new code writes to them.

### §8.1 Agent entity shape

```ts
type Agent = {
  id: string
  type: "artist" | "architect"
  state: "spawning" | "walking" | "working" | "completing" | "terminating" | "terminated"
  ownerId: string
  ownerName: string
  taskSummary: string
  taskDetail?: object
  zoneTarget: string               // one of the canonical zone ids
  position: { x: number, y: number }
  progress: number                 // 0.0–1.0
  result?: object
  leafCost: number
  leafReward: number
  prTag?: string                   // "[eden-artist]" | "[eden-architect]"
  prUrl?: string
  spawnedAt: string                // ISO
  completedAt?: string
  terminatedAt?: string
}
```

### §8.2 `POST /api/agents/spawn`

Creates an agent row, deducts Leaf cost immediately, and emits an `agent.spawn` WebSocket event to all clients. The server selects the initial position (near the Eden Tree) and begins the state machine.

**Request:**
```json
{
  "type": "artist",
  "task": "Add a candlestick chart toggle to the Market Lens results panel"
}
```
`type` ∈ `"artist" | "architect"`.

**Response 201:**
```json
{
  "ok": true,
  "data": {
    "agent": {
      "id": "clx...",
      "type": "artist",
      "state": "spawning",
      "ownerId": "clx...",
      "ownerName": "sonny",
      "taskSummary": "Add a candlestick chart toggle to the Market Lens results panel",
      "zoneTarget": "observatory",
      "position": { "x": 0, "y": 0 },
      "progress": 0,
      "leafCost": 25,
      "leafReward": 0,
      "spawnedAt": "2026-04-10T12:15:00.000Z"
    },
    "balanceAfter": 4208
  }
}
```

**Rate limits** (spec §5.4):
- 3 concurrent agents per user (state != `terminated`)
- 10 spawns per hour
- 50 spawns per day
- Token bucket: 3/min burst

**Errors:** `INSUFFICIENT_BALANCE` (402), `AGENT_LIMIT_REACHED` (429, returns `{ limit, current, resetAt }` in error details), `QUALIFICATION_FAILED` (422, task rejected by qualification check — spec §5.4), `RATE_LIMITED` (429).

**Cost:**
- Artist: 25 Leafs
- Architect: 15 Leafs

### §8.3 `GET /api/agents/mine`

Lists all agents owned by the authenticated user, most recent first.

**Query:** `?state=working,walking` (optional comma-separated filter), `?limit=50`

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "agents": [ /* Agent[] */ ],
    "activeCount": 1,
    "dailyCount": 4,
    "hourlyCount": 1,
    "limits": {
      "maxConcurrent": 3,
      "maxPerHour": 10,
      "maxPerDay": 50
    }
  }
}
```

### §8.4 `GET /api/agents/:id`

Agent detail including task payload and result. Authenticated user must own the agent OR the agent must be in a non-terminated state (since spec §5.3 makes all active agents visible to all users, but task details are private to the owner).

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "agent": { /* Agent */ },
    "taskDetail": {
      "fullPrompt": "Add a candlestick chart toggle...",
      "context": { "file": "app/services/market-lens/ResultsPanel.tsx" }
    },
    "result": null,
    "logs": [
      { "at": "2026-04-10T12:15:01.000Z", "event": "spawned" },
      { "at": "2026-04-10T12:15:04.000Z", "event": "walking", "position": { "x": 5, "y": -1 } }
    ]
  }
}
```

For non-owners, `taskDetail`, `result`, and `logs` are omitted.

**Errors:** `AGENT_NOT_FOUND` (404), `FORBIDDEN` (403).

### §8.5 `DELETE /api/agents/:id`

Manual termination. Only the owner can terminate. Sets state to `terminating`, which transitions to `terminated` after the 1.5s dissolve animation completes server-side. Refunds unused Leaf cost prorated by `(1 - progress)`.

**Response 200:**
```json
{
  "ok": true,
  "data": {
    "agent": { /* Agent with state: "terminating" */ },
    "refund": 18,
    "balanceAfter": 4226
  }
}
```

**Errors:** `AGENT_NOT_FOUND` (404), `NOT_AGENT_OWNER` (403), `AGENT_ALREADY_TERMINATED` (409).

---

## §9 — WebSocket protocol

Socket.io over WSS. Endpoint: `wss://edencloud.app/` (same origin as REST, same HTTP server — see §10 below for the server.js implementation).

### §9.1 Handshake

Unity connects with:

```js
io("wss://edencloud.app", {
  auth: { token: "<accessToken>" },
  transports: ["websocket"],
  extraHeaders: {
    "X-Eden-Client-Version": "0.9.3"
  }
})
```

Server validates the access token via the same `jose.jwtVerify()` call used by the REST auth middleware, extracts `sub` (userId) and attaches it to the socket instance. On invalid/expired token → disconnect with reason `"auth_failed"`.

### §9.2 Server → Client events

| Event | Payload | When |
|---|---|---|
| `world.state` | `WorldState` (same shape as `GET /api/world/state` data) | On connect + on reconnect |
| `player.join` | `{ id, username, displayName, position, avatar }` | A user enters the world |
| `player.move` | `{ id, position, isMoving }` | Position update, max 10/sec/player |
| `player.leave` | `{ id }` | Disconnect |
| `player.zone_enter` | `{ id, zoneId }` | Crossed zone boundary |
| `player.zone_leave` | `{ id, zoneId }` | Crossed zone boundary |
| `agent.spawn` | `Agent` | New agent created |
| `agent.move` | `{ id, position }` | Pathfinding step |
| `agent.state_change` | `{ id, state, progress }` | State machine transition |
| `agent.complete` | `{ id, resultSummary }` | Work finished |
| `agent.terminate` | `{ id }` | Dissolve complete |
| `tree.state` | `TreeState` | Every 5s, server-timed |
| `leaf.transaction` | `{ userId, type, leafsAmount, balanceAfter, description }` | Per-user, balance changed |
| `zone.update` | `{ zoneId, playerCount, agentCount }` | Zone occupancy changed |
| `version.alert` | `{ newVersion, required, url }` | New release published |

### §9.3 Client → Server events

| Event | Payload | Throttle |
|---|---|---|
| `player.move` | `{ position: { x, y }, isMoving: bool }` | Server enforces 10/sec max |
| `player.zone_enter` | `{ zoneId }` | — |
| `player.zone_leave` | `{ zoneId }` | — |
| `agent.spawn_request` | `{ type, task }` | Same limits as REST §8.2 |
| `heartbeat` | `{ timestamp }` | Every 30s |

**Note:** `agent.spawn_request` exists as a WS convenience but the canonical path is `POST /api/agents/spawn`. Phase 01 ships only the REST variant.

### §9.4 Rate limits

| Scope | Limit |
|---|---|
| Per connection | 100 events/sec |
| Per user | 10 `player.move` events/sec |
| Handshake | 5/min/IP |
| Agent spawn | 3/min burst, 10/hr, 50/day |

Violation → disconnect with reason `"rate_limit"`.

### §9.5 Reconnect protocol

1. On disconnect, client shows the reconnect overlay and dims the garden 30%.
2. Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s.
3. On successful reconnect, client refetches `world.state` (server emits it automatically) and reconciles.
4. After 5 min of failed reconnects → return to login screen.

### §9.6 Echo test (Phase 01 deliverable)

Phase 01 ships a **minimal echo handler** for Unity connectivity testing. It is **removed before Phase 02**.

Event: `echo`

**Client sends:** `{ message: "hello from unity" }`
**Server replies:** `{ message: "hello from unity", echoedAt: "2026-04-10T12:00:00.000Z", socketId: "abc123", userId: "clx..." }`

This verifies: (1) TCP/WS connectivity, (2) TLS, (3) JWT handshake validation, (4) event round-trip. No game state involved.

---

## §10 — Server.js integration

Phase 01 embeds Socket.io directly in `server.js` (decision §0.5).

**High-level shape:**

```js
// server.js
const { createServer } = require("http")
const { parse } = require("url")
const next = require("next")
const { Server } = require("socket.io")
const { jwtVerify } = require("jose")

const port = parseInt(process.env.PORT || "3000", 10)
const hostname = "0.0.0.0"
const dev = process.env.NODE_ENV !== "production"

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url, true))
  })

  const io = new Server(httpServer, {
    cors: { origin: "*" },
    transports: ["websocket"],
  })

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) throw new Error("missing token")
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
      const { payload } = await jwtVerify(token, secret, {
        issuer: "eden",
        audience: "eden-unity-client",
      })
      socket.data.userId = payload.sub
      socket.data.username = payload.username
      socket.data.role = payload.edenPlatformRole
      next()
    } catch (err) {
      next(new Error("auth_failed"))
    }
  })

  io.on("connection", (socket) => {
    console.log(`[ws] connect ${socket.id} user=${socket.data.userId}`)

    socket.on("echo", (msg, ack) => {
      const reply = {
        message: msg?.message ?? "",
        echoedAt: new Date().toISOString(),
        socketId: socket.id,
        userId: socket.data.userId,
      }
      if (typeof ack === "function") ack(reply)
      socket.emit("echo", reply)
    })

    socket.on("heartbeat", () => {
      socket.emit("heartbeat.ack", { at: new Date().toISOString() })
    })

    socket.on("disconnect", (reason) => {
      console.log(`[ws] disconnect ${socket.id} reason=${reason}`)
    })
  })

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Socket.io attached`)
  })
})
```

Phase 01 ships exactly this plus a permissive dev-mode auth bypass (see §14 below) so the echo test can run before the JWT login route exists.

**Railway:** `railway.json` sets `startCommand` to `npx prisma migrate deploy && node server.js`. Every deploy applies any new migrations in `prisma/migrations/` *before* the server boots, then brings up Next.js + Socket.io in the same process. No infra changes are needed for Phase 01 — the schema migration for this phase (`20260410120000_phase_01_unity_foundation`) ships on the next push.

**Dependencies to add:** `socket.io` (server) and `jose` (JWT verify). `jose` is already a transitive dep of `next-auth` but should be declared explicitly.

---

## §11 — Admin / owner

### §11.1 `POST /api/admin/release`

See §3.2.

### §11.2 `GET /api/admin/connections` (owner only)

Returns active WebSocket connection count for monitoring. Not exposed to Unity.

---

## §12 — Deferred to later phases

These endpoints appear in the Eden World spec §8.2 but are **explicitly out of scope** for Phase 01.

| Endpoint | Target phase | Reason |
|---|---|---|
| `GET /api/governance/proposals` | Phase 04 | Council Ring zone UI is Phase 04 scope. |
| `POST /api/governance/vote` | Phase 04 | Same. |
| Full `/api/agents/spawn_request` WS shortcut | Phase 05 | REST path is sufficient for MVP. |
| `/api/admin/visual-pipeline/*` | Phase 06 | Visual asset pipeline is Phase 06. |

---

## §13 — Migration plan: legacy balances → EdenWallet

### §13.0 Where things run

Eden is containerized and deployed on Railway. There is no local-database workflow for any of the steps in this section:

- **Schema migrations** (Prisma `prisma/migrations/*`) apply automatically on every Railway deploy via the `npx prisma migrate deploy && node server.js` startCommand in `railway.json`. Nobody runs them by hand.
- **Data migrations** (one-shot TypeScript scripts in `scripts/`) are not auto-run. They're triggered against the live Railway environment with `railway run`, which loads the Railway service's env vars (including the real `DATABASE_URL`) and shells into the local source so `tsx` can execute the script against prod.

### §13.1 Pre-conditions

- The `20260410120000_phase_01_unity_foundation` schema migration has shipped via a Railway deploy. Push to main → Railway build → the new migration applies automatically → `EdenWallet`, `RefreshToken`, `Agent`, `WorldSession`, `ClientVersion`, and the additive `User.avatarConfig` / `lastPosition` / `lastOnline` columns all exist on prod.
- `scripts/verify-ledger-consistency.ts` passes on prod (run via `railway run npx tsx scripts/verify-ledger-consistency.ts`).
- Announce a ~5 minute window if you want to block new Stripe top-ups mid-migration (the script is idempotent, so this is optional — overlapping top-ups just land in `EdenWallet` directly and the reconciliation row still balances).

### §13.2 Data migration script

New file: `scripts/migrate-balances-to-eden-wallet.ts` (already written — see the file for the full source).

**Execution against Railway:**

```bash
# Dry run — no writes, prints the plan summary and the first 20 actionable rows
railway run npx tsx scripts/migrate-balances-to-eden-wallet.ts --dry-run

# Apply for real
railway run npx tsx scripts/migrate-balances-to-eden-wallet.ts
```

**What it does** (consolidated from the script header):

- Pulls every `User` with their legacy `edenBalanceCredits` + `promoBalance` + `realBalance` + `withdrawableBalance` + `lifetimePromoSpent` + `lifetimeRealSpent` columns and their current `EdenWallet` row (if any).
- For each user, computes `legacyTotal` and `lifetimeSpent`.
- **Creates** an `EdenWallet` row for users without one, seeded with the legacy totals.
- **Increments** the existing `EdenWallet.leafsBalance` for users who already have a wallet (which is how Stripe-topped-up users end up — the script adds the legacy delta without overwriting).
- Writes a stable `EdenTransaction` audit row per reconciled user with `transactionType: "MANUAL_ADJUSTMENT"`, `description: "Migration from legacy User.*Balance columns (phase-01 cutover)"`, and full metadata (every legacy column value plus the chosen action). Re-runs detect this row and skip the user.
- Per-user transactions so a single failure doesn't abort the batch; exits non-zero if any row failed.

### §13.3 Code cutover

The following endpoints are rewritten to read/write `EdenWallet` + `EdenTransaction` only, and each rewrite ships on its own Railway deploy:

- `GET /api/wallet/balance` → read `EdenWallet.leafsBalance`
- `POST /api/wallet/spend` → `eden-economy-service.deductLeafs()` + transaction row
- `POST /api/user/welcome-grant` → `grantLeafs()`
- `POST /api/owner/leaves-grants` → `grantLeafs()`
- `/api/health` → verifies `EdenWallet` table exists instead of User columns

The Stripe webhook path already writes `EdenWallet` (via `recordLeafsTopup()`), so no change there.

The new `readOrBackfillWallet()` helper in `modules/core/economy/wallet-read.ts` is the transitional bridge: any Unity-facing route that needs a balance (e.g., `/api/auth/login`, `/api/auth/me`) calls it, and if the wallet row doesn't exist yet it's created on the fly from the legacy columns. This makes the above cutover commits safe to ship *before* the bulk data migration has run — users who haven't been touched by the bulk script yet get their wallet backfilled lazily on first Unity login.

### §13.4 Column drop

After the code cutover has soaked on Railway for 24h and `verify-ledger-consistency` still passes, a follow-up Prisma migration in `prisma/migrations/` drops:

- `User.edenBalanceCredits`
- `User.promoBalance`
- `User.realBalance`
- `User.withdrawableBalance`
- `User.lifetimePromoSpent`
- `User.lifetimeRealSpent`

This migration ships like any other — commit it, push, Railway runs `prisma migrate deploy` and the columns go away. Same push should delete the legacy-backfill branch in `readOrBackfillWallet()` since it can no longer fire. Two-phase (code first, column drop second) avoids a brief window where a rollback would lose balance data.

### §13.5 Verification

`scripts/verify-ledger-consistency.ts` (existing) is updated to reconcile `EdenWallet.leafsBalance` against the sum of `EdenTransaction.leafsAmount` for each wallet. Run it via `railway run npx tsx scripts/verify-ledger-consistency.ts` after each step. A failure blocks the column-drop commit.

---

## §14 — Implementation notes & shared helpers

### §14.1 `resolveAuthenticatedUser(request)`

New helper in `modules/core/session/server.ts` that accepts either a cookie session or a Unity bearer JWT:

```ts
export async function resolveAuthenticatedUser(request: Request | NextRequest) {
  // 1. Bearer JWT (Unity)
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    try {
      const { payload } = await jwtVerify(token, secret, {
        issuer: "eden",
        audience: "eden-unity-client",
      });
      if (payload.type !== "access") return null;
      return {
        userId: payload.sub as string,
        username: payload.username as string,
        role: payload.edenPlatformRole as EdenRole,
        source: "unity-jwt" as const,
      };
    } catch {
      return null;
    }
  }

  // 2. Existing cookie session (web)
  return getServerSession();
}
```

Every Unity-facing route uses this helper instead of calling `getServerSession()` directly.

### §14.2 JWT signing helper

New file: `modules/core/session/jwt-unity.ts`

```ts
import { SignJWT, jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function signUnityAccessToken(user: {
  id: string;
  username: string;
  role: "owner" | "business" | "consumer";
}) {
  return new SignJWT({
    username: user.username,
    edenPlatformRole: user.role,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("eden")
    .setAudience("eden-unity-client")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(await secret());
}

export async function verifyUnityAccessToken(token: string) {
  const { payload } = await jwtVerify(token, await secret(), {
    issuer: "eden",
    audience: "eden-unity-client",
  });
  return payload;
}
```

### §14.3 `RefreshToken` model

New Prisma model added alongside `EdenWallet`:

```prisma
model RefreshToken {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation("UserRefreshTokens", fields: [userId], references: [id], onDelete: Cascade)
  tokenHash       String   @unique        // sha256 hex of the opaque token
  platform        String                   // "windows" | "macos" | "linux" | "web"
  clientVersion   String?
  issuedAt        DateTime @default(now())
  expiresAt       DateTime                 // 30d
  revokedAt       DateTime?
  replacedByTokenId String?
  lastUsedAt      DateTime?
  ipAddress       String?

  @@index([userId, issuedAt])
  @@index([tokenHash])
}
```

The raw refresh token is never stored — only `sha256(token)`. On refresh, the server looks up by hash, verifies not revoked and not expired, marks revoked, and issues a new one.

### §14.4 `ClientVersion` model

```prisma
model ClientVersion {
  id                      String   @id @default(cuid())
  version                 String   @unique
  minimumSupportedVersion String
  required                Boolean  @default(true)
  platforms               Json     // { windows: {url, sha256, size}, macos: {...} }
  changelog               String?
  assetManifest           Json?
  releasedAt              DateTime @default(now())
  releasedByUserId        String
  releasedByUser          User     @relation("ClientVersionReleaser", fields: [releasedByUserId], references: [id])

  @@index([releasedAt])
}
```

### §14.5 `Agent` model (spec §9.1, cuid-adjusted)

```prisma
enum AgentType { ARTIST ARCHITECT }
enum AgentState { SPAWNING WALKING WORKING COMPLETING TERMINATING TERMINATED }

model Agent {
  id            String      @id @default(cuid())
  type          AgentType
  state         AgentState  @default(SPAWNING)
  ownerId       String
  owner         User        @relation("UserAgentsV2", fields: [ownerId], references: [id], onDelete: Cascade)
  taskSummary   String
  taskDetail    Json?
  zoneTarget    String
  position      Json         // { x: number, y: number }
  progress      Float        @default(0)
  result        Json?
  leafCost      Int          @default(0)
  leafReward    Int          @default(0)
  prTag         String?
  prUrl         String?
  spawnedAt     DateTime     @default(now())
  completedAt   DateTime?
  terminatedAt  DateTime?

  @@index([ownerId, spawnedAt])
  @@index([state, spawnedAt])
  @@index([zoneTarget])
}
```

Uses `cuid()` instead of the spec's `uuid()` to match the rest of the Eden schema.

### §14.6 `WorldSession` model

```prisma
model WorldSession {
  id             String    @id @default(cuid())
  userId         String
  user           User      @relation("UserWorldSessions", fields: [userId], references: [id], onDelete: Cascade)
  connectedAt    DateTime  @default(now())
  disconnectedAt DateTime?
  clientVersion  String
  platform       String    // "windows" | "macos" | "linux"
  socketId       String
  ipAddress      String?

  @@index([userId, connectedAt])
  @@index([disconnectedAt])
}
```

Created on WebSocket connect, closed on disconnect. Used for presence + connection audit.

### §14.7 `User` additions

Additive fields on `User`:

```prisma
avatarConfig          Json?         // { sprite, color, nameColor }
lastPosition          Json?         // { x, y, zone }
lastOnline            DateTime?
refreshTokens         RefreshToken[]       @relation("UserRefreshTokens")
agentsV2              Agent[]              @relation("UserAgentsV2")
worldSessions         WorldSession[]       @relation("UserWorldSessions")
releasedClientVersions ClientVersion[]     @relation("ClientVersionReleaser")
```

---

## §15 — Implementation order (Phase 01 remaining)

The contract above is the target. Actual build order, and where each step runs:

| # | Item | Mechanism |
|---|---|---|
| 1 | **Socket.io echo** — `server.js` wired up, JWT-verifying handshake in place, dev bypass behind `EDEN_WS_STRICT_AUTH` flag. | Commit, runs in the same Railway process as Next.js. |
| 2 | **`jose` dep + JWT helper** (`signUnityAccessToken` / `verifyUnityAccessToken`). | Commit. |
| 3 | **Schema migration**: `Agent`, `WorldSession`, `ClientVersion`, `RefreshToken`, plus `User.avatarConfig` / `lastPosition` / `lastOnline` — migration file `prisma/migrations/20260410120000_phase_01_unity_foundation/migration.sql`. | **Applies automatically on next Railway deploy** via the `prisma migrate deploy` step in `railway.json` startCommand. No manual action. |
| 4 | **`POST /api/auth/login` + `/refresh` + `/logout` + `/me`** — JWT login flow, backed by `RefreshToken` + `readOrBackfillWallet()`. | Commit. Ships on next Railway deploy. |
| 5 | **Balance data migration** — `scripts/migrate-balances-to-eden-wallet.ts`, a one-shot `tsx` script. | `railway run npx tsx scripts/migrate-balances-to-eden-wallet.ts --dry-run` → review → run without `--dry-run`. See §13.2. |
| 6 | **Code cutover to EdenWallet-only** — rewrite `wallet/balance`, `wallet/spend`, `welcome-grant`, `leaves-grants`, `/api/health` to read/write `EdenWallet`. | Commit. Ships on next Railway deploy. Safe to ship before step 5 finishes thanks to `readOrBackfillWallet()`. |
| 7 | **`GET /api/version`** + `ClientVersion` CRUD. | Commit. |
| 8 | **Leaf alias routes** (`/api/leaf/*`) delegating to canonical handlers. | Commit. |
| 9 | **Avatar routes** (`GET` / `PUT /api/avatar/config`). | Commit. |
| 10 | **`GET /api/world/state`** — empty world snapshot; no real presence yet. | Commit. |
| 11 | **`/api/agents/*`** REST endpoints (spawn, mine, detail, terminate) — state-machine stub; real agent execution lands in Phase 05. | Commit. |
| 12 | **Drop legacy User balance columns** — new Prisma migration after 24h soak of steps 5 + 6. | Commit the migration file. Applies automatically on the next Railway deploy. Delete the legacy branch of `readOrBackfillWallet()` in the same commit. |
| 13 | **`verify-ledger-consistency`** re-run against prod. | `railway run npx tsx scripts/verify-ledger-consistency.ts` |

Steps 1, 2, 3, and 4 are complete as of this session (schema migration sitting in `prisma/migrations/`, auth routes and JWT helper in place). Everything else is the follow-up.

---

*End of API contract. Companion files: `docs/EDEN_WORLD_SPEC.md` (canonical), `docs/PHASE_01_AUDIT.md` (current state).*
