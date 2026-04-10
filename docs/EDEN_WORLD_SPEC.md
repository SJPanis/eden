# EDEN WORLD — MASTER SPECIFICATION v2.0

> Architecture for Eden as a Unity Game Client with Next.js Backend
> EdenOS LLC · Salvador Joseph Panis · April 2026
> LIVING DOCUMENT — Update as architecture evolves

---

## §1.0 — SYSTEM OVERVIEW

### §1.1 Vision

Eden is a **living, multiplayer world** — a downloadable Unity game client that connects to the existing Next.js backend. Users don't visit a website. They enter a garden. AI services exist as physical locations in a bioluminescent garden. Users navigate as avatars, spawn AI agents that perform tasks visibly in the world, and watch the platform evolve in real time. The world's graphics self-improve through the same Artist/Architect pipeline that builds features.

**RULE: Eden is not a dashboard with game skin. It is a world with utility built into the terrain.**

### §1.2 Architecture Split

Two completely separate systems connected by WebSocket and REST.

**Unity Client (Front-End):**
- 2.5D isometric world rendering (URP pipeline)
- Avatar movement, physics, camera control
- Real-time multiplayer presence rendering
- Agent sprite visualization & particle FX
- Eden Tree reactive animations
- Service zone UI overlay system
- Auto-update manager on launch
- Audio engine (ambient + contextual)
- Input handling (click-to-move + keyboard)
- Local asset cache & LOD management

**Next.js Backend (Logic Layer):**
- Authentication (NextAuth + JWT for Unity)
- Leaf economy engine & Stripe integration
- Agent orchestration (Artist/Architect pipeline)
- Service API routes (Market Lens, Imagine Auto, Spot Splore)
- WebSocket server (Socket.io on Railway)
- Database (PostgreSQL via Prisma on Supabase)
- Agent task queue, state machine, completion logic
- GitHub integration (PR pipeline, auto-merge)
- Visual asset pipeline (generation + optimization)
- Version management for auto-update

**⚠ CRITICAL: Unity NEVER executes business logic. It renders state received from the server. All Leaf transactions, agent spawning, auth, and service calls go through the API. The Unity client is a view layer.**

### §1.3 System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        UNITY CLIENT                              │
│                                                                  │
│  ┌────────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐ │
│  │ World      │  │ Avatar   │  │ Agent     │  │ UI Overlay   │ │
│  │ Renderer   │  │ System   │  │ Renderer  │  │ (Services)   │ │
│  └─────┬──────┘  └────┬─────┘  └─────┬─────┘  └──────┬───────┘ │
│        └───────────────┴──────────────┴───────────────┘          │
│                              │                                   │
│                    ┌─────────┴─────────┐                        │
│                    │  Network Manager  │                        │
│                    │  WS + REST Client │                        │
│                    └─────────┬─────────┘                        │
└──────────────────────────────┼──────────────────────────────────┘
                               │ wss:// + https://
┌──────────────────────────────┼──────────────────────────────────┐
│                    ┌─────────┴─────────┐     NEXT.JS BACKEND   │
│                    │  API Gateway      │     (Railway)          │
│                    │  Auth Middleware  │                        │
│                    └─────────┬─────────┘                        │
│        ┌─────────────┬───────┴────┬──────────────┐             │
│  ┌─────┴─────┐ ┌─────┴─────┐ ┌───┴────┐ ┌───────┴──────┐     │
│  │ Agent     │ │ Service   │ │ Leaf   │ │ Presence     │     │
│  │ Orchestr. │ │ Router    │ │ Engine │ │ (Socket.io)  │     │
│  └─────┬─────┘ └─────┬─────┘ └───┬────┘ └───────┬──────┘     │
│        └──────────────┴───────────┴──────────────┘             │
│                              │                                  │
│                    ┌─────────┴─────────┐                       │
│                    │   PostgreSQL      │                       │
│                    │   (Supabase)      │                       │
│                    └───────────────────┘                       │
└────────────────────────────────────────────────────────────────┘
```

### §1.4 Canonical Aesthetic

**RULE: Garden of Eden meets Tron. Dark, organic, bioluminescent. Living nature infused with digital energy.**

**Color Palette:**
- Primary: `#69f0ae` — Bioluminescent green
- Secondary: `#00e5ff` — Cyan energy
- Artist: `#ffd54f` — Gold creation
- Architect: `#00e5ff` — Blue evaluation
- Accent: `#e040fb` — Purple governance
- Ground: `#0a1a1a` — Dark earth
- Void: `#050f14` — Deep background

**Visual Elements:** Bioluminescent moss & mushrooms, cyan energy streams (animated shaders), floating spores & fireflies (particle systems), volumetric ground fog, root networks from Eden Tree, holographic UI overlays, particle trails on agents.

**Audio Palette:** Ambient forest base layer, tree low resonant hum, streams gentle water flow, agent spawn crystalline chime, agent complete harmonic resolve, Leaf transaction soft ding, zone entry tonal shift.

---

## §2.0 — DESIGN PRINCIPLES

**Principle 01 — World First, UI Second.**
Never show a form, modal, or dashboard without the garden behind it. Service UIs overlay the world — they don't replace it. The user should always feel physically located somewhere.

**Principle 02 — Everything Has a Physical Presence.**
Users are avatars. Agents are sprites. Services are buildings. Transactions are animations. Nothing happens invisibly. If the system does work, the world shows it.

**Principle 03 — The Client is Disposable, the Server is Truth.**
Unity renders state. It never computes state. If the client crashes, reconnects, or updates — it re-fetches world state and continues. All authority lives on the server. This prevents exploits and ensures consistency.

**Principle 04 — Self-Improving, Never Finished.**
The world visually evolves through the Artist/Architect pipeline. Every update can include improved textures, new particle effects, refined shaders. Users notice the world getting more beautiful over time.

**Principle 05 — Forced Integrity.**
Auto-update on launch. No stale clients. No modified binaries. The server validates the client version before allowing connection. Version mismatch = mandatory update.

**Principle 06 — Sound Follows Action.**
Every meaningful interaction has audio feedback. Ambient sound shifts by zone. Agent activity creates a living soundscape. Audio is a design element, not an afterthought.

---

## §3.0 — WORLD DESIGN

### §3.1 Topology

The Garden is a single continuous isometric map. No loading screens between zones. Camera follows the player avatar smoothly. Zone boundaries defined by terrain changes, lighting shifts, and ambient audio crossfades.

```
WORLD MAP — ISOMETRIC TOP-DOWN VIEW

                        NORTH
                    ┌───────────┐
                    │  SEALED   │   Future zones.
                    │  GARDENS  │   Locked until services launch.
                    │  🔒  🔒   │   Visible but inaccessible.
                    └─────┬─────┘
                          │
        WEST              │              EAST
   ┌──────────┐    ┌──────┴──────┐    ┌──────────┐
   │OBSERVA-  │    │             │    │WORKSHOP  │
   │TORY 🔭   │────│  EDEN TREE  │────│    ⚙️    │
   │Market    │    │     🌳      │    │Imagine   │
   │Lens      │    │             │    │Auto      │
   └────┬─────┘    │  SPAWN PT   │    └────┬─────┘
        │          │  WORLD HUB  │         │
        │          └──────┬──────┘         │
   ┌────┴─────┐          │          ┌─────┴────┐
   │COUNCIL   │    ┌─────┴─────┐   │THE GROVE │
   │RING ⚖️   │    │WELLSPRING │   │   🌿     │
   │Governance│    │  🍃       │   │Spot      │
   │          │    │Leaf Bank  │   │Splore    │
   └──────────┘    └───────────┘   └──────────┘
                       SOUTH

Zone Radius: ~50 Unity units from center
Total World: ~300 x 300 Unity units
Camera: Isometric 45° tilt, 30° rotation, orthographic
```

### §3.2 Terrain Layers

```
LAYER 0 — SKY/VOID (z: -100)
  Deep space gradient. Stars or subtle nebula.
  Parallax scrolls at 10% of camera movement.

LAYER 1 — BACKGROUND FOLIAGE (z: -50 to -10)
  Tree silhouettes, distant mushroom forests, fog.
  Parallax scrolls at 30% of camera movement.
  AI-generated assets, swapped/improved via visual pipeline.

LAYER 2 — GROUND PLANE (z: 0)
  Isometric tilemap. Dark soil, moss patches, stone paths.
  Procedural: Perlin noise for moss distribution.
  Energy streams rendered as animated shader on ground tiles.
  Root networks from Eden Tree beneath semi-transparent tiles.

LAYER 3 — ENTITIES (z: 1 to 50)
  Avatars, agents, zone structures, interactive objects.
  Sorted by Y position for correct depth ordering.
  Particle systems attached to entities render in this layer.

LAYER 4 — OVERLAY (z: 100+)
  UI elements, service overlays, HUD.
  Screen-space, not world-space.
```

### §3.3 Zone Boundaries

Zones don't have hard walls. Transitions communicated through:
- Ground texture gradients (soil → stone → moss → water)
- Lighting color temperature shifts (warm gold → cool cyan)
- Ambient audio crossfades (2-second blend zone at boundary)
- Particle density changes (dense spores near Grove, sparks near Workshop)
- Subtle camera zoom adjustment (tighter in enclosed zones)
- Border flora — unique plants mark each zone's perimeter

**RULE: If a user walks from the Observatory to the Workshop, the transition should feel like walking through a living forest — not crossing a loading boundary.**

---

## §4.0 — THE EDEN TREE

### §4.1 Specification

The Eden Tree is the structural and symbolic center of the world. It is simultaneously the spawn point, the visual heartbeat of system activity, and the connective tissue between all zones (its roots extend underground to every zone).

```
Physical Properties:
  Height:        ~80 Unity units (tallest object in world)
  Canopy Radius: ~40 Unity units (covers central clearing)
  Trunk Width:   ~8 Unity units at base, tapering to ~2
  Root Spread:   Extends to all zone boundaries underground
  Material:      Dark bark with bioluminescent vein texture
                  Veins pulse with system activity
  Canopy:        Semi-transparent leaf clusters
                  Individual leaves are particle instances
                  Color shifts: green (healthy) → gold (high activity)
  Collider:      Trunk only — players can walk under canopy
```

### §4.2 Spawn Sequence — Frame by Frame

Total duration: ~4 seconds from auth to control.

```
FRAME  TIME    EVENT                                CAMERA            AUDIO
─────────────────────────────────────────────────────────────────────────────
 0    0.0s    Auth success received                Static: login     Silence
 1    0.0s    Login UI fades out (0.3s ease)       Begin pan up      Low rumble fades in
 2    0.3s    Camera reaches canopy level           At canopy         Tree hum audible
 3    0.5s    Seed of light forms in branches      Focus on seed     Crystalline tone
              (point light + sphere, scale 0→1)
 4    0.8s    Seed detaches, begins falling         Track seed        Whoosh begins
              Physics: gravity 9.8, drag 0.3
 5    0.8-2s  Seed falls through canopy             Track seed        Wind whistle
              Trail: 20 light particles/frame
              Leaves disturbed along path
 6    2.0s    Seed reaches ground level              Pull back         Impact thud (soft)
              Collision: burst of 50 particles
              Ground ripple shader effect
 7    2.0-2.5s Particles coalesce into avatar        Pulling back      Harmonic chord
              Silhouette → full avatar (0.5s)
 8    2.5s    Avatar fully materialized              Reaching final    Ambient garden
              Idle animation begins                  isometric pos     fades in
 9    3.0s    HUD elements fade in (0.5s)           Final position    Full ambient
10    3.5s    Control enabled                        Settled           ──
              "Welcome to Eden" toast (subtle)

TECHNICAL NOTES:
- Seed light intensity: start 2.0, peak 4.0 at impact, settle 0
- Particle trail: world-space, persist 1.5s after seed passes
- Ground ripple: shader-based, UV displacement, 1.0s duration
- Avatar materialize: dissolve shader, threshold 0→1 over 0.5s
- Camera path: cubic bezier, eased in/out
- Skip option: holding SPACE skips to frame 8 (repeat visitors)
```

### §4.3 Tree Reactivity System

The tree's visual state is a function of real-time system metrics. Server pushes tree state via WebSocket every 5 seconds.

```
TreeState {
  glow_intensity:   float  // 0.0–1.0, based on active_agents / max_agents
  pulse_rate:       float  // Hz, base 0.5, scales with transaction_rate
  canopy_color:     vec3   // shifts green→gold with activity
  root_brightness:  float  // 0.0–1.0, Leaf flow volume
  leaf_fall_rate:   int    // particles/sec, task completion rate
  branch_growth:    float  // 0.0–1.0, progress toward next zone unlock
  seed_drops:       int    // concurrent user logins in last 30s
}

WS Event: tree.state → sent every 5s
Client interpolates between states for smooth transitions

MAPPING:
  0 active agents    → dim glow, slow pulse, deep green
  5 active agents    → medium glow, moderate pulse, green-gold
  20+ active agents  → bright glow, fast pulse, full gold
  Transaction spike  → root flash effect (0.3s, white)
  Service zone added → new branch grows over 24h (animated)
```

---

## §5.0 — AGENT SYSTEM

### §5.1 Agent Types

**RULE: Agents are first-class entities in the world. They are visible, trackable, and their work is public. Every task the system performs has a physical avatar doing it.**

**Artist Agent (Innovation):**
- Visual: Gold sprite, warm particle trail (amber)
- Model: Claude Sonnet for orchestration
- Trigger: User request OR usage gap detected
- Behavior: Purposeful walk to task zone
- Working FX: Creation particles, forge sparks
- On complete: Gold burst → particles float up to tree
- PR Tag: [eden-artist]
- Pool: ADAM pool (revenue-based)

**Architect Agent (Evaluation):**
- Visual: Blue sprite, cool particle trail (cyan)
- Model: Claude Haiku for efficiency
- Trigger: Scheduled OR error detected
- Behavior: Patrol between zones, scanning
- Working FX: Scan lines, data particles
- On complete: Blue dissolve → particles return to roots
- PR Tag: [eden-architect]
- Pool: EVE pool (commitment-based)

### §5.2 Agent State Machine

```
AgentState = SPAWNING | WALKING | WORKING | COMPLETING | TERMINATING | TERMINATED

SPAWNING (0.8s)
  Server: Creates agent record, assigns task, sets initial position (near tree)
  Client: Seed drops from tree → agent materializes at base
  Transition: → WALKING when sprite fully visible

WALKING (variable, 2-8s depending on distance)
  Server: Sends target zone coordinates
  Client: Agent walks toward zone using A* pathfinding on navmesh
  Visual: Particle trail active, name label + task preview visible
  Transition: → WORKING when agent reaches zone boundary

WORKING (variable, depends on task complexity)
  Server: Streams progress % via WebSocket (0-100)
  Client: Agent plays work animation at zone location
  Visual: Progress ring above agent, task-specific particles
    Artist: forge sparks, creation glow, building shapes
    Architect: scan lines, magnifying effect, cleanup particles
  Transition: → COMPLETING when progress reaches 100%

COMPLETING (1.2s)
  Server: Marks task complete, calculates Leaf distribution
  Client: Burst animation, celebration particles
  Visual: Golden/blue burst, result summary floats up
  Transition: → TERMINATING after burst

TERMINATING (1.5s)
  Server: Queues agent record for cleanup
  Client: Agent dissolves into particles
  Visual: Sprite breaks into 30 particles that float up toward tree
  Audio: Harmonic resolve chord
  Transition: → TERMINATED when all particles reach tree

TERMINATED
  Server: Deletes agent record, archives task result
  Client: Removes entity from scene
  Tree: Brief pulse when particles arrive back
```

### §5.3 Agent Ownership & Visibility

All agents from all users are visible to all connected clients.

```
Agent entity data (sent via WS):
{
  id:           string    // unique agent ID
  type:         "artist" | "architect"
  owner_id:     string    // user who spawned it
  owner_name:   string    // display name
  state:        AgentState
  task_summary: string    // "Building stock chart component"
  zone_target:  string    // "observatory"
  position:     { x, y }  // current world position
  progress:     float     // 0.0–1.0
  created_at:   timestamp
}

Client rendering rules:
- Own agents: full opacity, name highlighted green
- Other users' agents: 80% opacity, name in grey
- Hovering any agent shows task tooltip
- Clicking own agent opens task detail panel
- Cannot interact with other users' agents
```

### §5.4 Agent Limits & Anti-Spam

**⚠ Without limits, users could spam agent spawns to farm Leafs or overload the system.**

```
LIMITS:
  Max concurrent agents per user:  3
  Max agent spawns per hour:       10
  Max agent spawns per day:        50
  Minimum task complexity:         Must pass qualification check
  Leaf cost to spawn:              Deducted on spawn, not on complete

QUALIFICATION CHECK (server-side):
  Artist: Task must describe a buildable feature, not a duplicate
  Architect: Must reference a real file, error, or metric
  Rejection: Agent seed drops but fizzles (visual feedback)

ANTI-EXPLOIT:
  Client version must match server version
  Agent spawn requests signed with session JWT
  Rate limiting on /api/agents/spawn (token bucket: 3/min burst)
  Task results validated before Leaf distribution
```

---

## §6.0 — SELF-IMPROVING GRAPHICS PIPELINE

**RULE: The world gets more beautiful with every update. Visual quality is not a fixed state — it's a trajectory. The same Artist/Architect pipeline that builds features also improves the world itself.**

Three rendering layers compose the final visual. Each layer can be independently improved through the pipeline without breaking the others.

### §6.1 Layer 1 — AI-Generated Base Assets

Foundation visuals generated by image AI, hand-polished for consistency, imported as Unity sprites and textures.

```
ASSET CATEGORIES:
  Environment:    Cave walls, rock formations, soil textures
  Flora:          Mushroom clusters, moss patches, ferns, vines
  Structures:     Zone buildings (Observatory dome, Workshop gears, etc.)
  Tree:           Trunk bark texture, leaf sprites, root textures
  Atmospheric:    Cloud/fog layers, distant forest silhouettes
  UI:             Zone signs, interaction prompts, panel frames

GENERATION WORKFLOW:
  1. Artist agent generates base image (image gen AI)
  2. Style-transfer pass to enforce Eden palette + aesthetic
  3. Human polish: remove artifacts, fix edges, ensure tileability
  4. Import to Unity: sprite sheet, set PPU, configure materials
  5. Version tag: asset_name_v{N}.png
  6. Git LFS for binary assets (Unity project repo)

IMPROVEMENT CYCLE:
  Architect agent flags low-quality assets:
    - Resolution below threshold (< 512px for environment)
    - Visual inconsistency with surrounding assets
    - Tiling artifacts visible at camera distance
  Artist agent generates replacement:
    - Higher resolution
    - Better style consistency
    - PR tagged [eden-artist-visual]
  Review → merge → auto-deploy → users see improved world next launch
```

### §6.2 Layer 2 — Procedural Shader System

Dynamic visuals that make the world feel alive. Unity Shader Graph / custom HLSL. Respond to game state in real time.

```
SHADER REGISTRY:

EdenGlow.shader
  Purpose:  Bioluminescent pulse on moss, mushrooms, tree veins
  Inputs:   _GlowColor, _PulseSpeed, _Intensity, _SystemActivity
  Behavior: Sine-wave modulated emission, intensity scales with
            tree.glow_intensity from server
  Improve:  Architect can A/B test pulse curves and color ramps

EnergyStream.shader
  Purpose:  Animated energy rivers between zones
  Inputs:   _FlowSpeed, _Color, _Width, _NoiseScale
  Behavior: UV-scrolling noise texture with additive blend
  Improve:  Artist can generate better noise textures,
            Architect can optimize draw calls

GroundFog.shader
  Purpose:  Volumetric fog near ground level
  Inputs:   _Density, _Height, _Color, _WindDirection
  Behavior: Ray-marched fog in screen space (mobile-friendly variant)
  Improve:  Architect optimizes for target framerate

AvatarDissolve.shader
  Purpose:  Spawn/despawn materialize effect
  Inputs:   _Threshold (0→1 = invisible→visible), _EdgeColor
  Behavior: Noise-based dissolve with glowing edge
  Improve:  Artist can create better dissolve noise patterns

TreeBark.shader
  Purpose:  Living bark with pulsing veins
  Inputs:   _VeinMap, _VeinColor, _PulseData (from tree state)
  Behavior: Overlays emissive vein pattern on bark texture
  Improve:  Both agents — better vein maps, optimized sampling
```

### §6.3 Layer 3 — Continuous Visual Evolution

The self-improvement loop. The world visually evolves through its own AI pipeline.

```
ARCHITECT VISUAL TASKS (automated, scheduled):
  SCAN: Identify visual quality issues
    - Texture resolution audit (flag < threshold)
    - Shader performance profiling (flag > budget)
    - Particle system performance (flag overdraw)
    - Asset consistency scoring (style drift detection)
    - Screenshot comparison: prev version vs current

  FIX: Generate improvement PRs
    - Optimize shaders that exceed frame budget
    - Compress textures without visible quality loss
    - Reduce particle counts while maintaining density feel
    - Fix Z-fighting and sorting artifacts
    - PR tag: [eden-architect-visual]

ARTIST VISUAL TASKS (triggered by need or schedule):
  CREATE: Generate new visual content
    - New flora species for zone variety
    - Seasonal variations (spring bloom, winter frost)
    - Event decorations (launch celebrations, milestones)
    - New zone interior art when services launch
    - Higher-res replacements for placeholder assets
    - New particle effect patterns
    - Skybox variations for time-of-day cycle

  QUALITY: Upgrade existing assets
    - Upscale textures (512→1024, 1024→2048)
    - Add normal maps to flat textures
    - Create ambient occlusion maps
    - Generate sprite sheet animation frames
    - PR tag: [eden-artist-visual]

VERSIONING:
  Every visual asset carries a version number.
  Asset manifest (assets.json) tracks:
    { "mushroom_cluster_01": { "version": 3, "res": "1024", "date": "..." } }
  Client compares manifest on update — only downloads changed assets.
  Users see: "Eden has grown... downloading 3 new textures"
```

### §6.4 Quality Gates

**⚠ AI-generated visuals must pass quality checks before reaching users.**

```
BEFORE MERGE (automated):
  □ Asset renders correctly in Unity Editor (screenshot test)
  □ No visible artifacts at default camera zoom
  □ Consistent with Eden palette (color histogram check)
  □ Meets minimum resolution for its category
  □ File size within budget (sprite < 2MB, texture < 4MB)
  □ No copyrighted/watermarked content (CLIP check)
  □ Frame rate stays above target with new asset loaded

BEFORE DEPLOY (manual review — Sonny approves):
  □ Feels right aesthetically
  □ Doesn't clash with neighboring assets
  □ Adds to immersion, doesn't distract
```

---

## §7.0 — SERVICE ZONES

Each service is a physical zone in the garden. Walking into the zone triggers a UI overlay for that service. The world stays visible. The service renders on top.

### §7.1 The Observatory — Market Lens

- **Exterior:** Domed structure with rotating holographic constellation projections. Telescope extends from top. Cyan glow emanates from windows.
- **Interior:** Circular room. SVG flashlight visualization renders as a holographic sphere in the center. Stock data orbits the sphere. Query input appears as a floating console.
- **Trigger:** Walk within 5 units of entrance. Door glows. Press E or click to enter. Service UI overlays bottom 60% of screen, garden still visible above.

### §7.2 The Workshop — Imagine Auto

- **Exterior:** Industrial-organic hybrid. Living wood frame with mechanical gears visible through walls. Sparks and steam particle effects. Warm light from forge inside.
- **Interior:** Workbenches with parts floating above them as holograms. Search bar as a mechanical input device. Results display on rotating part stands.
- **Trigger:** Same as Observatory. Interior has ambient hammer/forge sounds.

### §7.3 The Grove — Spot Splore

- **Exterior:** Dense sub-garden. Unique plants not found elsewhere. Floating orbs of different colors represent vibe categories. More fireflies here than anywhere.
- **Interior:** No traditional interior — it's an open garden. Vibe orbs float at head height. Walking near an orb activates that vibe category. Results bloom as flowers with info petals.
- **Trigger:** Gradual — no hard entry. Vibe orbs appear as you enter the zone boundary. Deeper in = more orbs = more results.

### §7.4 The Wellspring — Leaf Bank

- **Exterior:** Glowing pool at tree base where roots converge. Water level represents system-wide Leaf volume. Waterfall from tree trunk feeds the pool.
- **Interior:** Stand at pool edge. Balance shown as water level in personal basin. Top-up button triggers Stripe → success = waterfall animation filling basin. History on stone tablets.
- **Trigger:** Walk to pool edge. UI overlay shows balance and top-up options.

### §7.5 The Council Ring — Governance

- **Exterior:** Stone circle with hovering rune stones. Each rune = active proposal. Purple energy connects the stones in a ring. Torches with purple flame.
- **Interior:** Walk into the ring. Proposals display on rune stones. Vote by walking to a position (for/against/abstain). Blind voting — can't see others' positions until reveal. Results: runes illuminate.
- **Trigger:** Walk into ring boundary. Runes activate and display proposals.

---

## §8.0 — NETWORK PROTOCOL

### §8.1 WebSocket Protocol

Socket.io over WSS. Connected on auth. Reconnects with exponential backoff.

```
SERVER → CLIENT EVENTS:

world.state          Full world snapshot (on connect/reconnect)
                     { players[], agents[], tree_state, zones[] }

player.join          { id, name, position, avatar_config }
player.move          { id, position }           // 10 updates/sec max
player.leave         { id }
player.zone_enter    { id, zone_id }
player.zone_leave    { id, zone_id }

agent.spawn          { id, type, owner_id, owner_name, task_summary, zone_target }
agent.move           { id, position }           // pathfinding updates
agent.state_change   { id, state, progress }
agent.complete       { id, result_summary }
agent.terminate      { id }

tree.state           { glow, pulse, canopy_color, root_brightness, ... }
                     Every 5 seconds

leaf.transaction     { user_id, amount, type, balance_after }
zone.update          { zone_id, active_users, active_agents }
version.alert        { new_version, required, url }

CLIENT → SERVER EVENTS:

player.move          { position }               // throttled 10/sec
player.zone_enter    { zone_id }
player.zone_leave    { zone_id }
agent.spawn_request  { type, task }             // validated server-side
heartbeat            { timestamp }              // every 30s
```

### §8.2 REST API Contract

```
AUTH:
  POST   /api/auth/login        { email, password } → { token, user, avatar }
  POST   /api/auth/refresh      { refresh_token }   → { token }
  GET    /api/auth/me            → { user, leaf_balance, avatar_config }

WORLD:
  GET    /api/world/state        → { players[], agents[], tree, zones[] }
  GET    /api/version            → { version, url, hash, required }

AGENTS:
  POST   /api/agents/spawn      { type, task }      → { agent_id, status }
  GET    /api/agents/mine        → { agents[] }
  GET    /api/agents/:id         → { agent, task_detail, progress }
  DELETE /api/agents/:id         → { success }       // manual terminate

SERVICES:
  POST   /api/services/market-lens    { query }      → { result, leaf_cost }
  POST   /api/services/imagine-auto   { query }      → { result, leaf_cost }
  POST   /api/services/spot-splore    { query }      → { result, leaf_cost }

LEAF:
  GET    /api/leaf/balance       → { balance, history[] }
  POST   /api/leaf/topup         { package_id }      → { stripe_session_url }
  POST   /api/leaf/webhook       (Stripe webhook)

GOVERNANCE:
  GET    /api/governance/proposals    → { proposals[] }
  POST   /api/governance/vote        { proposal_id, position }

AVATAR:
  GET    /api/avatar/config      → { sprite, color, name_color }
  PUT    /api/avatar/config      { updates }

All endpoints require Authorization: Bearer {jwt}
All responses: { success: bool, data?: T, error?: string }
```

### §8.3 Connection Lifecycle

```
1. Client launches
2. GET /api/version → compare with local build
3. If mismatch → force update flow (see §11)
4. POST /api/auth/login → receive JWT + user data
5. Connect WebSocket with JWT in handshake
6. Receive world.state (full snapshot)
7. Render world, play spawn sequence
8. Begin heartbeat loop (30s interval)
9. Listen for all server events, render accordingly
10. On disconnect:
    - Show "Reconnecting..." overlay (garden dims 30%)
    - Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
    - On reconnect: re-fetch world.state, reconcile
    - If 5 min timeout: return to login screen
11. On close: send player.leave, disconnect cleanly
```

---

## §9.0 — DATA MODELS

### §9.1 Database Schema

PostgreSQL via Prisma. Extends existing Eden schema — does not replace it.

```prisma
// === EXISTING (preserved) ===
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  name          String
  leafBalance   Int      @default(0)
  referralCode  String?
  createdAt     DateTime @default(now())
  // ... existing fields preserved

  // NEW FIELDS:
  avatarConfig  Json?    // { sprite, color, nameColor }
  lastPosition  Json?    // { x, y, zone }
  lastOnline    DateTime?
  agents        Agent[]
  sessions      WorldSession[]
}

// === NEW MODELS ===
model Agent {
  id            String      @id @default(uuid())
  type          AgentType   // ARTIST | ARCHITECT
  state         AgentState  // SPAWNING → TERMINATED
  ownerId       String
  owner         User        @relation(fields: [ownerId], references: [id])
  taskSummary   String
  taskDetail    Json?
  zoneTarget    String
  position      Json        // { x, y }
  progress      Float       @default(0)
  result        Json?
  leafCost      Int         @default(0)
  leafReward    Int         @default(0)
  prTag         String?     // [eden-artist] or [eden-architect]
  prUrl         String?
  spawnedAt     DateTime    @default(now())
  completedAt   DateTime?
  terminatedAt  DateTime?
}

model WorldSession {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  connectedAt   DateTime @default(now())
  disconnectedAt DateTime?
  clientVersion String
  platform      String   // windows | macos | linux
}

model VisualAsset {
  id            String   @id @default(uuid())
  name          String   @unique  // "mushroom_cluster_01"
  category      String   // environment | flora | structure | texture
  version       Int      @default(1)
  resolution    String   // "1024x1024"
  filePath      String   // path in Unity project
  fileSize      Int      // bytes
  generatedBy   String?  // agent ID that created it
  improvedBy    String?  // agent ID that last improved it
  qualityScore  Float?   // 0.0–1.0
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model ClientVersion {
  id            String   @id @default(uuid())
  version       String   @unique  // semver "0.9.2"
  platform      String   // windows | macos | all
  downloadUrl   String
  sha256        String
  required      Boolean  @default(true)
  releaseNotes  String?
  releasedAt    DateTime @default(now())
}

enum AgentType { ARTIST ARCHITECT }
enum AgentState { SPAWNING WALKING WORKING COMPLETING TERMINATING TERMINATED }
```

### §9.2 Runtime State Objects

In-memory structures synced via WebSocket. Not persisted per-frame.

```
WorldState {
  players:    Map<string, PlayerState>
  agents:     Map<string, AgentState>
  tree:       TreeState
  zones:      Map<string, ZoneState>
  timestamp:  number
}

PlayerState {
  id, name, position: {x,y}, zone: string|null,
  avatar: {sprite, color}, isMoving: boolean
}

ZoneState {
  id, playerCount, agentCount, isActive, ambientData: any
}
```

---

## §10.0 — SECURITY MODEL

**RULE: The client is untrusted. Always. Every action is validated server-side. The Unity client is a renderer — it has no authority over game state.**

```
THREAT                          MITIGATION
─────────────────────────────────────────────────────────────
Modified client binary          Forced update + version check on WS connect.
                                Server rejects connections from unknown versions.
                                Client SHA verified on download.

Spoofed agent completion        Agent results validated server-side.
                                Completion requires actual API call results.
                                Leaf distribution computed server-side only.

Leaf balance manipulation       Balance is server-side only.
                                Client displays from GET /api/leaf/balance.
                                All transactions go through Stripe or server logic.

Position spoofing               Positions are cosmetic — no gameplay advantage.
                                Server rate-limits position updates (10/sec).
                                Teleportation detection: flag >100 units/frame.

Token theft                     JWT with 1h expiry + refresh token rotation.
                                WS disconnects on token expiry.

Replay attacks                  Nonce on agent spawn requests.
                                Idempotency keys on Leaf transactions.

DDOS on WebSocket               Rate limiting per connection (100 events/sec).
                                Auto-disconnect on violation.

Fake version endpoint           Client pins TLS cert for edencloud.app.
                                Download URLs on known CDN only.
```

### §10.1 Auth Flow for Unity

```
1. Unity shows login screen (email + password fields)
2. POST /api/auth/login → { accessToken, refreshToken, user }
3. Store tokens in Unity's encrypted player prefs
4. All REST calls: Authorization: Bearer {accessToken}
5. WS handshake: { auth: { token: accessToken } }
6. On 401: attempt refresh → POST /api/auth/refresh
7. On refresh failure: return to login screen
8. On logout: clear tokens, disconnect WS, show login
```

---

## §11.0 — AUTO-UPDATE SYSTEM

**RULE: Every launch checks version. Mismatch = mandatory update. No exceptions. No "remind me later."**

```
LAUNCH SEQUENCE:

1. Eden.exe / Eden.app opens
2. Splash screen: Eden Tree animation (pre-rendered, cached)
3. GET https://edencloud.app/api/version
   Response: {
     version: "0.9.3",
     platform: {
       windows: { url, sha256, size },
       mac: { url, sha256, size }
     },
     required: true,
     changelog: "New Observatory interior, 3 improved textures, bug fixes"
   }

4. Compare response.version with local Application.version
   ├── MATCH → proceed to login (step 8)
   └── MISMATCH → begin update (step 5)

5. Show update screen over blurred garden:
   "Eden is growing..."
   Changelog displayed. Download size shown.

6. Download new binary from platform-specific URL
   Progress bar: downloaded / total bytes

7. Verify SHA-256 hash
   ├── MATCH → replace local files, restart
   └── MISMATCH → retry 3x, then show manual download link

8. Login screen appears.

ASSET-ONLY UPDATES (hot patches):
  GET /api/version also returns:
    assetManifest: { "mushroom_01": 3, "bark_texture": 5, ... }
  Client compares with local manifest.
  Downloads only changed assets in background.
  "Eden grew 3 new textures" toast on completion.
```

### §11.1 Build Pipeline

```
1. Sonny approves PRs (features + visual improvements)
2. Main branch updated on GitHub
3. Unity Cloud Build triggers (or local build script)
4. Builds: Windows (.exe + installer), macOS (.app + DMG)
5. Upload to CDN (Cloudflare R2 or S3)
6. Compute SHA-256 hashes
7. POST /api/admin/release { version, platform urls, changelog }
8. All connected clients receive version.alert via WS
9. On next launch: forced update flow
```

---

## §12.0 — PROJECT STRUCTURE

### §12.1 Unity Project

```
eden-client/
├── Assets/
│   ├── _Eden/
│   │   ├── Scripts/
│   │   │   ├── Core/
│   │   │   │   ├── GameManager.cs
│   │   │   │   ├── NetworkManager.cs
│   │   │   │   ├── AuthManager.cs
│   │   │   │   ├── UpdateManager.cs
│   │   │   │   └── StateManager.cs
│   │   │   ├── World/
│   │   │   │   ├── WorldRenderer.cs
│   │   │   │   ├── CameraController.cs
│   │   │   │   ├── ZoneManager.cs
│   │   │   │   ├── EdenTree.cs
│   │   │   │   └── EnvironmentFX.cs
│   │   │   ├── Entities/
│   │   │   │   ├── AvatarController.cs
│   │   │   │   ├── RemoteAvatar.cs
│   │   │   │   ├── AgentEntity.cs
│   │   │   │   ├── AgentSpawner.cs
│   │   │   │   └── EntitySorter.cs
│   │   │   ├── UI/
│   │   │   │   ├── HUDController.cs
│   │   │   │   ├── ServiceOverlay.cs
│   │   │   │   ├── LoginScreen.cs
│   │   │   │   ├── UpdateScreen.cs
│   │   │   │   └── ToastManager.cs
│   │   │   ├── Services/
│   │   │   │   ├── MarketLensUI.cs
│   │   │   │   ├── ImagineAutoUI.cs
│   │   │   │   ├── SpotSploreUI.cs
│   │   │   │   ├── LeafBankUI.cs
│   │   │   │   └── GovernanceUI.cs
│   │   │   └── Audio/
│   │   │       ├── AudioManager.cs
│   │   │       └── ZoneAudioProfile.cs
│   │   ├── Shaders/
│   │   │   ├── EdenGlow.shader
│   │   │   ├── EnergyStream.shader
│   │   │   ├── GroundFog.shader
│   │   │   ├── AvatarDissolve.shader
│   │   │   └── TreeBark.shader
│   │   ├── Art/
│   │   │   ├── Environment/
│   │   │   ├── Flora/
│   │   │   ├── Structures/
│   │   │   ├── Avatars/
│   │   │   ├── Agents/
│   │   │   └── UI/
│   │   ├── Audio/
│   │   │   ├── Ambient/
│   │   │   ├── SFX/
│   │   │   └── Music/
│   │   ├── Prefabs/
│   │   │   ├── Avatar.prefab
│   │   │   ├── ArtistAgent.prefab
│   │   │   ├── ArchitectAgent.prefab
│   │   │   ├── EdenTree.prefab
│   │   │   └── Zones/
│   │   └── Scenes/
│   │       ├── Boot.unity          # Update check + login
│   │       └── Garden.unity        # Main world scene
│   ├── Plugins/
│   │   ├── SocketIO/
│   │   └── DOTween/
│   └── StreamingAssets/
│       └── assets.json             # Asset version manifest
├── ProjectSettings/
└── Packages/
```

### §12.2 Backend Additions

New routes added to existing Next.js project. Does not restructure existing code.

```
eden/ (existing Next.js project)
├── src/
│   ├── app/api/
│   │   ├── ...existing routes preserved...
│   │   ├── version/route.ts          # NEW
│   │   ├── world/state/route.ts      # NEW
│   │   ├── avatar/config/route.ts    # NEW
│   │   └── admin/release/route.ts    # NEW
│   ├── lib/
│   │   ├── ...existing lib preserved...
│   │   ├── ws-server.ts              # NEW — Socket.io
│   │   ├── world-state.ts            # NEW — in-memory state
│   │   ├── agent-state-machine.ts    # NEW — lifecycle
│   │   └── visual-pipeline.ts        # NEW — asset quality
│   └── prisma/
│       └── schema.prisma             # EXTENDED
```

---

## §13.0 — PERFORMANCE SPEC

### §13.1 Targets

```
FRAME RATE:
  Target:    60 FPS constant
  Minimum:   30 FPS (trigger LOD reduction)
  Budget:    16.6ms per frame

  CPU budget:    Game logic 2ms, Network 1ms, Physics 1ms,
                 Animation 2ms, UI 2ms, Audio 1ms, Headroom 7.6ms

  GPU budget:    Terrain 4ms, Entities 3ms, Particles 3ms,
                 Shaders 3ms, UI 2ms, Post-processing 1.6ms

NETWORK:
  WebSocket latency:   < 100ms (acceptable up to 200ms)
  Position updates:    10/sec outbound, interpolated client-side
  World state sync:    < 500ms on connect
  API response time:   < 300ms for service calls

MEMORY:
  Texture: 256MB, Mesh: 64MB, Audio: 32MB, Script: 128MB
  Total target: < 512MB RAM

DISK:
  Initial install: < 200MB, Max with assets: < 500MB
  Update patches: < 50MB typical

SCALABILITY:
  Concurrent users per server:  200
  Concurrent agents:            100
  Scale: horizontal — multiple world instances
```

### §13.2 LOD Strategy

```
LEVEL 0 (60+ FPS) — Full quality. All particles, shaders, textures.
LEVEL 1 (45-60 FPS) — Particle counts halved, distant particles culled.
LEVEL 2 (30-45 FPS) — Disable volumetric fog, simplify glow, reduce shadows.
LEVEL 3 (<30 FPS) — Emergency. No post-processing, half textures, minimal particles.
```

---

## §14.0 — BUILD PHASES

**Total: ~13 weeks** with AI-assisted Unity development. Each phase produces a shippable milestone.

**⚠ Timeline assumes full-time focus with Claude Code. Adjust if building part-time alongside school.**

### Phase 01 — AUDIT & EXTRACT (Week 1–2)
1. Full codebase evaluation of current Eden on edencloud.app
2. Document every working API route, Prisma model, service
3. Map auth flow, Leaf economy, Stripe integration
4. Identify Artist/Architect pipeline state (built vs spec)
5. Create API contract document (what Unity needs from backend)
6. Set up Socket.io server on Railway alongside existing app
7. Test WS connectivity from local Unity test scene
8. **DELIVERABLE: API contract doc + WS echo test**

### Phase 02 — UNITY FOUNDATION (Week 3–5)
1. Unity 2022 LTS project setup with URP 2D renderer
2. Isometric camera controller with smooth follow
3. Tilemap-based ground plane with zone coloring
4. Click-to-move player avatar with A* pathfinding
5. NetworkManager: REST client + Socket.io connection
6. AuthManager: login flow, JWT storage, token refresh
7. UpdateManager: version check against /api/version
8. **DELIVERABLE: Walk around empty garden, logged in, version-checked**

### Phase 03 — THE EDEN TREE (Week 5–6)
1. Eden Tree prefab: trunk, canopy, roots, particle systems
2. Bark shader with bioluminescent veins
3. Spawn sequence: seed drop → avatar materialize (4s)
4. Tree reactivity: glow/pulse driven by server tree.state
5. Root network extending to zone boundaries (shader-based)
6. Ambient particles: fireflies, floating spores
7. **DELIVERABLE: Login → spawn from tree → walk around tree area**

### Phase 04 — ZONES & SERVICES (Week 6–8)
1. Zone boundary system with trigger colliders
2. Zone transition effects (lighting, audio, particles)
3. 5 zone exterior structures (procedural + AI assets)
4. Service overlay system (UI renders over world view)
5. Wire up each service: Market Lens, Imagine Auto, Spot Splore
6. Leaf Bank UI with balance + Stripe top-up flow
7. Governance UI with voting mechanic
8. **DELIVERABLE: Walk to any zone, use any service, spend Leafs**

### Phase 05 — AGENTS COME ALIVE (Week 8–10)
1. Agent sprite system (gold Artist, blue Architect)
2. Agent state machine with full animation set
3. Agent spawn sequence (seed from tree → walk to zone)
4. Agent work animations with task-specific particles
5. Agent termination (dissolve → particles to tree)
6. Multiplayer: see all users' agents in real time
7. Agent hover tooltip + detail panel for own agents
8. **DELIVERABLE: Spawn agent → watch it work → see it terminate**

### Phase 06 — VISUAL PIPELINE (Week 10–11)
1. Asset manifest system (assets.json versioning)
2. AI asset generation workflow (generate → polish → import)
3. Architect visual scanner (flag low-quality assets)
4. Artist visual creator (generate improvements, new flora)
5. Quality gate automation (resolution, palette, file size)
6. Hot-patch asset updates (download only changed assets)
7. **DELIVERABLE: Architect flags asset → Artist improves → users see update**

### Phase 07 — POLISH & SHIP (Week 11–13)
1. Audio system: ambient layers, contextual SFX, zone crossfades
2. Performance profiling + LOD system implementation
3. Auto-update full pipeline (build → CDN → version → client)
4. Windows build (.exe + installer)
5. macOS build (.app + DMG)
6. Replace download link on edencloud.app
7. Beta test with 5–10 users, iterate on feel
8. **DELIVERABLE: Downloadable Eden World, auto-updating, production-ready**

---

## §15.0 — GLOSSARY

- **Eden Tree** — Central world structure. Spawn point. Visual heartbeat of system activity.
- **Artist Agent** — Gold AI agent. Innovation pipeline. Builds new features and visual assets. Formerly "Adam."
- **Architect Agent** — Blue AI agent. Evaluation pipeline. Fixes bugs, optimizes, audits. Formerly "Eve."
- **The Garden** — The isometric world space. Contains all zones, the tree, and all entities.
- **Zone** — A physical area in the garden mapped to a service or system feature.
- **Leaf** — Eden's internal currency. Earned through contribution, spent on services. Backed by Stripe.
- **ADAM Pool** — Revenue-based reward pool. Artist agents earn from this. `a` in `a + v = E`.
- **EVE Pool** — Commitment-based reward pool. Time/usage weighted. `v` in `a + v = E`.
- **Spawn Sequence** — The 4-second animation when a user logs in. Seed falls from tree canopy.
- **Service Overlay** — UI that renders on top of the garden view when entering a service zone.
- **Visual Pipeline** — The self-improving graphics system. AI generates → hand polishes → deploys.
- **Forced Update** — Client must match server version. No stale binaries. Checked every launch.
- **World State** — Server-authoritative snapshot of all players, agents, tree state, and zones.
- **Asset Manifest** — JSON tracking version numbers of all visual assets for incremental updates.
- **URP** — Universal Render Pipeline. Unity's lightweight renderer for 2D/2.5D.

---

*End of specification. This document is the source of truth for all Eden World development. Reference specific sections (§1.0–§15.0) when directing builds in Claude Code.*
