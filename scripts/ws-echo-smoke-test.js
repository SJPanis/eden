// Phase 01 WebSocket echo smoke test.
//
// Verifies the Socket.io server embedded in server.js:
//   * Default mode — dev-bypass handshake, echo + heartbeat round-trip.
//   * --sign-as <username> — mint a local JWT via jose and verify the
//     authenticated userId comes back in the echo reply.
//   * --expect-reject — connect without a token, expect handshake rejection
//     (use with EDEN_WS_STRICT_AUTH=true on the server).
//
// Usage:
//   npm run dev:ws
//   npm run ws:smoke
//   EDEN_WS_TOKEN_USER=sonny node scripts/ws-echo-smoke-test.js --sign-as sonny
//   EDEN_WS_STRICT_AUTH=true npm run dev:ws  # in another shell
//   node scripts/ws-echo-smoke-test.js --expect-reject
//
// Exits 0 on success, 1 on any failure.

const { io } = require('socket.io-client')
const { SignJWT } = require('jose')
const path = require('node:path')
const { existsSync } = require('node:fs')

// Load .env so NEXTAUTH_SECRET is available for --sign-as.
const envPath = path.resolve(process.cwd(), '.env')
if (existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envPath)
}

const URL = process.env.EDEN_WS_URL || 'http://127.0.0.1:3000'
const TIMEOUT_MS = 8000

const args = process.argv.slice(2)
const signAsIndex = args.indexOf('--sign-as')
const signAs = signAsIndex >= 0 ? args[signAsIndex + 1] : null
const expectReject = args.includes('--expect-reject')

function fail(msg) {
  console.error(`[smoke] FAIL: ${msg}`)
  process.exitCode = 1
}

function ok(msg) {
  console.log(`[smoke] OK:   ${msg}`)
}

async function signLocalAccessToken(username) {
  const secretValue = process.env.NEXTAUTH_SECRET
  if (!secretValue) {
    throw new Error('NEXTAUTH_SECRET must be set to sign tokens')
  }
  const secret = new TextEncoder().encode(secretValue)
  return await new SignJWT({
    username,
    edenPlatformRole: 'consumer',
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(`test-${username}`)
    .setIssuer('eden')
    .setAudience('eden-unity-client')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret)
}

async function main() {
  let authToken = null
  const expectedUserId = signAs ? `test-${signAs}` : null

  if (signAs) {
    authToken = await signLocalAccessToken(signAs)
    ok(`minted JWT for ${signAs} (sub=${expectedUserId})`)
  }

  const socket = io(URL, {
    auth: authToken ? { token: authToken } : {},
    transports: ['websocket'],
    reconnection: false,
    timeout: TIMEOUT_MS,
  })

  const state = {
    connected: false,
    ackReceived: false,
    emitReceived: false,
    heartbeatAckReceived: false,
    rejected: false,
  }

  const overallTimer = setTimeout(() => {
    if (expectReject && !state.rejected) {
      fail(`expected rejection but stayed connected — state=${JSON.stringify(state)}`)
    } else if (!expectReject) {
      fail(`timed out after ${TIMEOUT_MS}ms — state=${JSON.stringify(state)}`)
    }
    try {
      socket.disconnect()
    } catch {}
    process.exit(process.exitCode ?? 1)
  }, TIMEOUT_MS)

  socket.on('connect', () => {
    state.connected = true
    if (expectReject) {
      fail(`expected rejection but connected id=${socket.id}`)
      clearTimeout(overallTimer)
      socket.disconnect()
      return
    }

    ok(`connected id=${socket.id}`)

    socket.emit('echo', { message: 'hello from smoke test' }, (reply) => {
      if (!reply || reply.message !== 'hello from smoke test') {
        fail(`ack reply shape mismatch: ${JSON.stringify(reply)}`)
      } else if (expectedUserId && reply.userId !== expectedUserId) {
        fail(`ack userId mismatch — expected ${expectedUserId}, got ${reply.userId}`)
      } else {
        ok(`ack roundtrip: ${JSON.stringify(reply)}`)
        state.ackReceived = true
        finishIfReady()
      }
    })

    socket.emit('heartbeat', { timestamp: new Date().toISOString() })
  })

  socket.on('echo', (reply) => {
    if (state.emitReceived) return
    if (expectedUserId && reply.userId !== expectedUserId) {
      fail(`emit userId mismatch — expected ${expectedUserId}, got ${reply.userId}`)
      return
    }
    ok(`emit broadcast: ${JSON.stringify(reply)}`)
    state.emitReceived = true
    finishIfReady()
  })

  socket.on('heartbeat.ack', (reply) => {
    ok(`heartbeat.ack: ${JSON.stringify(reply)}`)
    state.heartbeatAckReceived = true
    finishIfReady()
  })

  socket.on('connect_error', (err) => {
    if (expectReject) {
      ok(`rejected as expected: ${err.message}`)
      state.rejected = true
      clearTimeout(overallTimer)
      setTimeout(() => process.exit(0), 50)
    } else {
      fail(`connect_error: ${err.message}`)
      clearTimeout(overallTimer)
      process.exit(1)
    }
  })

  socket.on('disconnect', (reason) => {
    console.log(`[smoke] disconnected: ${reason}`)
  })

  function finishIfReady() {
    if (
      state.ackReceived &&
      state.emitReceived &&
      state.heartbeatAckReceived
    ) {
      clearTimeout(overallTimer)
      ok('all checks passed — ack + emit + heartbeat')
      socket.disconnect()
      setTimeout(() => process.exit(process.exitCode ?? 0), 50)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
