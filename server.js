// Eden custom Next.js server with embedded Socket.io.
//
// Architecture note: docs/PHASE_01_API_CONTRACT.md §10 — Socket.io is attached
// directly to the Next.js HTTP server so Railway deploys one process. No sidecar.
//
// Phase 01 scope:
//   - Echo handler (WS connectivity + round-trip test for Unity client)
//   - Heartbeat ack
//   - Handshake auth skeleton (permissive in dev, verifies JWT when present)
//   - Active-connection counter surfaced via process memory
//
// Follow-ups (per contract §15):
//   - Wire JWT verification to required in production
//   - world.state / player.* / agent.* / tree.state event broadcasts
//   - Prisma-backed WorldSession rows on connect/disconnect

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { jwtVerify } = require('jose')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Presence state kept in module scope. Replaced by Prisma WorldSession + world-state
// in-memory cache in a later phase.
const activeSockets = new Map() // socketId -> { userId, username, role, connectedAt }

function wsSummary() {
  return {
    activeConnections: activeSockets.size,
    connections: Array.from(activeSockets.entries()).map(([socketId, info]) => ({
      socketId,
      userId: info.userId,
      username: info.username,
      role: info.role,
      connectedAt: info.connectedAt,
    })),
  }
}

// Expose the summary on globalThis so API routes (server-side only) can read it.
// Not ideal long-term, but fine until we move presence to Redis / a dedicated service.
globalThis.__edenWsSummary = wsSummary

// Strict auth is ON in production unconditionally and OFF in dev unless the
// EDEN_WS_STRICT_AUTH flag is set. The flag lets local tests exercise the
// production rejection path without flipping NODE_ENV.
const strictAuth = !dev || process.env.EDEN_WS_STRICT_AUTH === 'true'

async function resolveHandshakeIdentity(socket) {
  const token = socket.handshake.auth?.token

  if (!token) {
    if (strictAuth) {
      throw new Error('auth_failed: missing token')
    }
    // Dev-mode permissive connection. Lets Unity devs run the echo test before
    // /api/auth/login is implemented. Remove when JWT login ships.
    return {
      userId: 'dev-anonymous',
      username: 'dev-anonymous',
      role: 'consumer',
      source: 'dev-bypass',
    }
  }

  const secretValue = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  if (!secretValue) {
    if (strictAuth) throw new Error('auth_failed: server missing NEXTAUTH_SECRET')
    console.warn('[ws] NEXTAUTH_SECRET not set — accepting token without verification (dev only)')
    return {
      userId: 'dev-unverified',
      username: 'dev-unverified',
      role: 'consumer',
      source: 'dev-unverified',
    }
  }

  try {
    const secret = new TextEncoder().encode(secretValue)
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'eden',
      audience: 'eden-unity-client',
    })
    if (payload.type !== 'access') {
      throw new Error('auth_failed: wrong token type')
    }
    return {
      userId: String(payload.sub),
      username: String(payload.username ?? ''),
      role: String(payload.edenPlatformRole ?? 'consumer'),
      source: 'unity-jwt',
    }
  } catch (err) {
    throw new Error(`auth_failed: ${err.message || 'invalid token'}`)
  }
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      await handle(req, res, parse(req.url, true))
    } catch (err) {
      console.error('[http] request error', err)
      res.statusCode = 500
      res.end('internal error')
    }
  })

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  })

  io.use(async (socket, next) => {
    try {
      const identity = await resolveHandshakeIdentity(socket)
      socket.data.userId = identity.userId
      socket.data.username = identity.username
      socket.data.role = identity.role
      socket.data.authSource = identity.source
      socket.data.connectedAt = new Date().toISOString()
      next()
    } catch (err) {
      console.warn(`[ws] handshake rejected: ${err.message}`)
      next(err instanceof Error ? err : new Error(String(err)))
    }
  })

  io.on('connection', (socket) => {
    const info = {
      userId: socket.data.userId,
      username: socket.data.username,
      role: socket.data.role,
      connectedAt: socket.data.connectedAt,
      authSource: socket.data.authSource,
    }
    activeSockets.set(socket.id, info)
    console.log(
      `[ws] connect id=${socket.id} user=${info.userId} auth=${info.authSource} total=${activeSockets.size}`
    )

    // Phase 01 echo handler — contract §9.6. Supports both ack callback and
    // emit-style reply so Unity clients can use either pattern.
    socket.on('echo', (msg, ack) => {
      const reply = {
        message: msg?.message ?? '',
        echoedAt: new Date().toISOString(),
        socketId: socket.id,
        userId: socket.data.userId,
      }
      if (typeof ack === 'function') ack(reply)
      socket.emit('echo', reply)
    })

    socket.on('heartbeat', (payload) => {
      socket.emit('heartbeat.ack', {
        clientTimestamp: payload?.timestamp ?? null,
        serverTimestamp: new Date().toISOString(),
      })
    })

    socket.on('disconnect', (reason) => {
      activeSockets.delete(socket.id)
      console.log(
        `[ws] disconnect id=${socket.id} user=${info.userId} reason=${reason} total=${activeSockets.size}`
      )
    })
  })

  httpServer.listen(port, hostname, () => {
    console.log(`> Next.js ready on http://${hostname}:${port}`)
    console.log(`> Socket.io attached (dev=${dev} strictAuth=${strictAuth})`)
  })
})
