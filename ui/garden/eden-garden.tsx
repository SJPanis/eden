"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────

type EdenGardenProps = {
  username: string;
  role: string;
};

type Building = {
  id: string;
  name: string;
  type: "founder" | "adam" | "eve";
  x: number;
  width: number;
  height: number;
  color: string;
  glowColor: string;
  completion: number;
  isTownHall: boolean;
};

type AgentState = "walking" | "gathering" | "trading" | "building";

type Agent = {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: AgentState;
  color: string;
  size: number;
  speed: number;
  timer: number;
  resourceOrb: { color: string; size: number } | null;
  trail: { x: number; y: number }[];
  targetBuildingId: string | null;
  tradingPartnerId: number | null;
};

type ResourceNode = {
  id: number;
  x: number;
  y: number;
  color: string;
  label: string;
  pulse: number;
};

type TaskEntry = {
  id: string;
  text: string;
  status: "complete" | "active" | "pending" | "queued" | "failed";
  time: string;
  leafCost?: number;
  result?: string;
};

type Star = {
  x: number;
  y: number;
  size: number;
  brightness: number;
  drift: number;
};

type OverflowParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const GROUND_Y_RATIO = 0.72;

const BUILDINGS: Building[] = [
  {
    id: "town-hall",
    name: "Eden",
    type: "founder",
    x: 0.5,
    width: 80,
    height: 120,
    color: "#2dd4bf",
    glowColor: "rgba(45,212,191,0.4)",
    completion: 1.0,
    isTownHall: true,
  },
  {
    id: "imagine-auto",
    name: "Imagine Auto",
    type: "adam",
    x: 0.32,
    width: 60,
    height: 85,
    color: "#f59e0b",
    glowColor: "rgba(245,158,11,0.3)",
    completion: 0.85,
    isTownHall: false,
  },
  {
    id: "market-lens",
    name: "Market Lens",
    type: "adam",
    x: 0.67,
    width: 55,
    height: 70,
    color: "#10b981",
    glowColor: "rgba(16,185,129,0.3)",
    completion: 0.6,
    isTownHall: false,
  },
  {
    id: "spot-splore",
    name: "Spot Splore",
    type: "adam",
    x: 0.2,
    width: 50,
    height: 60,
    color: "#a855f7",
    glowColor: "rgba(168,85,247,0.3)",
    completion: 0.4,
    isTownHall: false,
  },
];

const RESOURCE_LABELS = ["API", "Data", "Logic", "UI", "Schema", "Tests"];
const RESOURCE_COLORS = ["#2dd4bf", "#f59e0b", "#a855f7", "#10b981", "#3b82f6", "#ec4899"];

const AGENT_PRESETS = [
  { color: "#2dd4bf", size: 5, speed: 1.2 },
  { color: "#f59e0b", size: 6, speed: 0.9 },
  { color: "#a855f7", size: 7, speed: 0.7 },
  { color: "#2dd4bf", size: 5, speed: 1.1 },
  { color: "#10b981", size: 5, speed: 1.0 },
  { color: "#f59e0b", size: 6, speed: 0.8 },
  { color: "#ec4899", size: 5, speed: 1.3 },
  { color: "#3b82f6", size: 6, speed: 0.95 },
];

const DEFAULT_TASKS: TaskEntry[] = [
  { id: "1", text: "Imagine Auto \u2014 Find Parts API wired", status: "complete", time: "09:42" },
  { id: "2", text: "Leaf spending route created", status: "complete", time: "09:38" },
  { id: "3", text: "Market Lens chart canvas building...", status: "active", time: "09:35" },
  { id: "4", text: "Spot Splore constellation map building...", status: "active", time: "09:30" },
  { id: "5", text: "Digital Garden agent AI pending...", status: "queued", time: "09:25" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function createStars(count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random() * GROUND_Y_RATIO,
    size: Math.random() * 1.5 + 0.3,
    brightness: Math.random() * 0.5 + 0.3,
    drift: (Math.random() - 0.5) * 0.00005,
  }));
}

function createResources(canvasW: number, groundY: number): ResourceNode[] {
  return RESOURCE_LABELS.map((label, i) => ({
    id: i,
    x: 0.1 * canvasW + (i / (RESOURCE_LABELS.length - 1)) * 0.8 * canvasW,
    y: groundY + 8 + Math.random() * 20,
    color: RESOURCE_COLORS[i],
    label,
    pulse: Math.random() * Math.PI * 2,
  }));
}

function createAgents(count: number, canvasW: number, groundY: number): Agent[] {
  return Array.from({ length: count }, (_, i) => {
    const preset = AGENT_PRESETS[i % AGENT_PRESETS.length];
    const ax = 0.15 * canvasW + Math.random() * 0.7 * canvasW;
    const ay = groundY - 2 + Math.random() * 6;
    return {
      id: i,
      x: ax,
      y: ay,
      targetX: 0.15 * canvasW + Math.random() * 0.7 * canvasW,
      targetY: groundY - 2 + Math.random() * 6,
      state: "walking" as AgentState,
      color: preset.color,
      size: preset.size,
      speed: preset.speed,
      timer: 0,
      resourceOrb: null,
      trail: [],
      targetBuildingId: null,
      tradingPartnerId: null,
    };
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export function EdenGarden({ username }: EdenGardenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const frameRef = useRef(0);
  const starsRef = useRef<Star[]>(createStars(60));
  const resourcesRef = useRef<ResourceNode[]>([]);
  const agentsRef = useRef<Agent[]>([]);
  const buildingsRef = useRef<Building[]>(BUILDINGS.map((b) => ({ ...b })));
  const overflowRef = useRef<OverflowParticle[]>([]);
  const initRef = useRef(false);

  const [tasks, setTasks] = useState<TaskEntry[]>(DEFAULT_TASKS);
  const [chatInput, setChatInput] = useState("");
  const [buildRunning, setBuildRunning] = useState(false);

  // ── Helper functions ────────────────────────────────────────────────────
  function addToLog(entry: TaskEntry) {
    setTasks((prev) => [entry, ...prev]);
  }

  function updateLog(id: string, updates: Partial<TaskEntry>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }

  function incrementBuildingProgress(taskType: string) {
    const typeToBuilding: Record<string, string> = {
      schema: "imagine-auto",
      api: "imagine-auto",
      ui: "market-lens",
      copy: "spot-splore",
      config: "imagine-auto",
      test: "market-lens",
      assemble: "town-hall",
    };
    const targetId = typeToBuilding[taskType] ?? "spot-splore";
    const bs = buildingsRef.current;
    const target = bs.find((b) => b.id === targetId) ?? bs.find((b) => !b.isTownHall && b.completion < 1);
    if (target) target.completion = Math.min(1, target.completion + 0.05);
  }

  // ── Handle "Build" command — real orchestrator ──────────────────────────
  const handleBuild = useCallback(async () => {
    const userRequest = chatInput.trim();
    if (!userRequest || buildRunning) return;
    setChatInput("");
    setBuildRunning(true);

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const pendingId = Date.now().toString();
    addToLog({ id: pendingId, text: userRequest, status: "pending", time: now });

    // Spawn 2 new agents for the visual
    const canvas = canvasRef.current;
    if (canvas) {
      const groundY = canvas.height * GROUND_Y_RATIO;
      const newAgents = createAgents(2, canvas.width, groundY);
      const base = agentsRef.current.length;
      for (let i = 0; i < newAgents.length; i++) newAgents[i].id = base + i;
      agentsRef.current.push(...newAgents);
    }

    try {
      // 1. Orchestrate
      const orchRes = await fetch("/api/agents/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: userRequest }),
      });
      const orchData = await orchRes.json();

      if (!orchData.ok) throw new Error(orchData.error ?? "Orchestration failed");

      const { buildId, tasks: agentTasks } = orchData as {
        buildId: string;
        tasks: Array<{ id: string; index: number; type: string; description: string; leafCost: number; status: string }>;
      };

      updateLog(pendingId, { status: "active", text: `Breaking into ${agentTasks.length} tasks...` });

      // 2. Add each task to the log
      for (const task of agentTasks) {
        addToLog({
          id: `${buildId}-${task.index}`,
          text: task.description,
          status: "queued",
          time: now,
          leafCost: task.leafCost,
        });
      }

      // 3. Call Architect — it handles execute, absorb, security, and commit
      fetch("/api/agents/architect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildId }),
      }).catch(() => {
        updateLog(pendingId, { status: "failed", text: `\u2717 ${userRequest}` });
        setBuildRunning(false);
      });

      // 4. Poll for live status updates
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/agents/status?buildId=${buildId}`);
          const data = await res.json();
          if (!data.ok) return;

          data.tasks.forEach((task: { index: number; status: string; type?: string }) => {
            const logId = `${buildId}-${task.index}`;
            const mappedStatus =
              task.status === "complete"
                ? "complete"
                : task.status === "running"
                  ? "active"
                  : task.status === "failed"
                    ? "failed"
                    : "queued";
            updateLog(logId, { status: mappedStatus as TaskEntry["status"] });
            if (task.status === "complete" && task.type) {
              incrementBuildingProgress(task.type);
            }
          });

          if (data.build.status === "complete" || data.build.status === "failed") {
            clearInterval(pollInterval);
            setBuildRunning(false);
            updateLog(pendingId, {
              status: data.build.status === "complete" ? "complete" : "failed",
              text:
                data.build.status === "complete"
                  ? `\u2713 ${userRequest}`
                  : `\u2717 ${userRequest}`,
            });
          }
        } catch {
          // Polling error — will retry on next interval
        }
      }, 2000);
    } catch {
      updateLog(pendingId, { status: "failed", text: `\u2717 ${userRequest}` });
      setBuildRunning(false);
    }
  }, [chatInput, buildRunning]);

  // ── Main animation loop ────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;
    const groundY = H * GROUND_Y_RATIO;
    const frame = frameRef.current++;

    // Init resources/agents on first frame
    if (!initRef.current) {
      resourcesRef.current = createResources(W, groundY);
      agentsRef.current = createAgents(8, W, groundY);
      initRef.current = true;
    }

    const buildings = buildingsRef.current;
    const agents = agentsRef.current;
    const resources = resourcesRef.current;
    const stars = starsRef.current;
    const overflow = overflowRef.current;

    // ── Sky ──────────────────────────────────────────────────────────────
    const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0, "#060e1a");
    skyGrad.addColorStop(1, "#0a1628");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, groundY);

    // ── Stars ────────────────────────────────────────────────────────────
    for (const s of stars) {
      s.x += s.drift;
      if (s.x < 0) s.x = 1;
      if (s.x > 1) s.x = 0;
      const twinkle = s.brightness + Math.sin(frame * 0.02 + s.x * 100) * 0.15;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0.1, twinkle)})`;
      ctx.fill();
    }

    // ── Ground ───────────────────────────────────────────────────────────
    ctx.fillStyle = "#0d2010";
    ctx.fillRect(0, groundY, W, H - groundY);
    // Ground top edge
    ctx.fillStyle = "#142d15";
    ctx.fillRect(0, groundY, W, 3);
    // Underground layers
    const layers = ["#0b1c0e", "#091609", "#071207"];
    for (let i = 0; i < layers.length; i++) {
      const ly = groundY + 30 + i * 25;
      if (ly < H) {
        ctx.fillStyle = layers[i];
        ctx.fillRect(0, ly, W, 25);
      }
    }

    // ── Resource nodes ───────────────────────────────────────────────────
    for (const r of resources) {
      r.pulse += 0.03;
      const pulseSize = 6 + Math.sin(r.pulse) * 2;
      // Glow
      const glow = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, pulseSize * 3);
      glow.addColorStop(0, r.color + "40");
      glow.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(r.x, r.y, pulseSize * 3, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      // Core
      ctx.beginPath();
      ctx.arc(r.x, r.y, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = r.color + "cc";
      ctx.fill();
      // Label
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillText(r.label, r.x, r.y + pulseSize + 12);
    }

    // ── Eve foundations (draw before buildings) ───────────────────────────
    for (const b of buildings) {
      const bx = b.x * W;
      const fW = b.width * 2;
      const fH = 16;
      const fX = bx - fW / 2;
      const fY = groundY - fH / 2;
      ctx.fillStyle = "rgba(59,130,246,0.18)";
      ctx.fillRect(fX, fY, fW, fH);
      ctx.strokeStyle = "rgba(59,130,246,0.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(fX, fY, fW, fH);
    }

    // ── Buildings ────────────────────────────────────────────────────────
    for (const b of buildings) {
      const bx = b.x * W;
      const builtH = b.height * b.completion;
      const bLeft = bx - b.width / 2;
      const bTop = groundY - builtH;

      // Base glow
      const baseGlow = ctx.createRadialGradient(bx, groundY, 0, bx, groundY, b.width * 1.5);
      baseGlow.addColorStop(0, b.glowColor);
      baseGlow.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(bx, groundY, b.width * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = baseGlow;
      ctx.fill();

      // Building body
      ctx.fillStyle = b.color + "30";
      ctx.fillRect(bLeft, bTop, b.width, builtH);
      ctx.strokeStyle = b.color + "80";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bLeft, bTop, b.width, builtH);

      // Windows
      const winCols = Math.floor(b.width / 16);
      const winRows = Math.floor(builtH / 18);
      for (let r = 0; r < winRows; r++) {
        for (let c = 0; c < winCols; c++) {
          const wx = bLeft + 6 + c * 16;
          const wy = bTop + 8 + r * 18;
          const flicker = Math.sin(frame * 0.05 + r * 3 + c * 7 + b.x * 100) > 0.2;
          ctx.fillStyle = flicker ? "rgba(255,245,200,0.6)" : "rgba(255,245,200,0.15)";
          ctx.fillRect(wx, wy, 8, 10);
        }
      }

      // Town hall beacon
      if (b.isTownHall) {
        const beaconY = bTop - 8;
        const beaconPulse = 4 + Math.sin(frame * 0.04) * 2;
        const beaconGlow = ctx.createRadialGradient(bx, beaconY, 0, bx, beaconY, beaconPulse * 5);
        beaconGlow.addColorStop(0, "rgba(45,212,191,0.7)");
        beaconGlow.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(bx, beaconY, beaconPulse * 5, 0, Math.PI * 2);
        ctx.fillStyle = beaconGlow;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx, beaconY, beaconPulse, 0, Math.PI * 2);
        ctx.fillStyle = "#2dd4bf";
        ctx.fill();
      }

      // Name label
      ctx.font = "12px serif";
      ctx.textAlign = "center";
      ctx.fillStyle = b.color;
      ctx.fillText(b.name, bx, bTop - 18);

      // Completion bar
      if (!b.isTownHall) {
        const barW = 40;
        const barH = 4;
        const barX = bx - barW / 2;
        const barY = bTop - 12;
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = b.color + "aa";
        ctx.fillRect(barX, barY, barW * b.completion, barH);
        ctx.font = "9px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillText(`${Math.round(b.completion * 100)}%`, bx, barY - 3);
      }
    }

    // ── Agent AI & Drawing ───────────────────────────────────────────────
    for (const a of agents) {
      // Trail
      a.trail.push({ x: a.x, y: a.y });
      if (a.trail.length > 10) a.trail.shift();

      switch (a.state) {
        case "walking": {
          const dx = a.targetX - a.x;
          const dy = a.targetY - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 5) {
            // Arrived — determine next action
            if (a.resourceOrb && a.targetBuildingId) {
              a.state = "building";
              a.timer = 0;
            } else if (!a.resourceOrb) {
              a.state = "gathering";
              a.timer = 0;
            } else {
              // Pick a building to deliver to
              const target = buildings[Math.floor(Math.random() * buildings.length)];
              a.targetBuildingId = target.id;
              a.targetX = target.x * W + (Math.random() - 0.5) * 20;
              a.targetY = groundY - 4;
            }
          } else {
            a.x += (dx / dist) * a.speed;
            a.y += (dy / dist) * a.speed;
          }
          break;
        }
        case "gathering": {
          a.timer++;
          if (a.timer > 90) {
            // 1.5s at 60fps
            const rc = RESOURCE_COLORS[Math.floor(Math.random() * RESOURCE_COLORS.length)];
            a.resourceOrb = { color: rc, size: 6 };
            a.state = "walking";
            // Target a building
            const target = buildings.filter((b) => !b.isTownHall)[Math.floor(Math.random() * (buildings.length - 1))];
            if (target) {
              a.targetBuildingId = target.id;
              a.targetX = target.x * W + (Math.random() - 0.5) * 20;
              a.targetY = groundY - 4;
            } else {
              a.targetX = Math.random() * W * 0.7 + W * 0.15;
              a.targetY = groundY - 2 + Math.random() * 6;
            }
          }
          break;
        }
        case "building": {
          a.timer++;
          if (a.timer > 30) {
            // Deposit orb
            const b = buildings.find((bld) => bld.id === a.targetBuildingId);
            if (b && b.completion < 1) {
              const prevCompletion = b.completion;
              b.completion = Math.min(1, b.completion + 0.015);
              // Emit overflow particles on completion
              if (prevCompletion < 1 && b.completion >= 1) {
                for (let p = 0; p < 20; p++) {
                  overflow.push({
                    x: b.x * W,
                    y: groundY - b.height,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -Math.random() * 3 - 1,
                    life: 120,
                    color: "#f59e0b",
                  });
                }
              }
            }
            a.resourceOrb = null;
            a.targetBuildingId = null;
            a.state = "walking";
            // Go to a resource node
            const rn = resources[Math.floor(Math.random() * resources.length)];
            a.targetX = rn.x + (Math.random() - 0.5) * 20;
            a.targetY = rn.y + (Math.random() - 0.5) * 10;
          }
          break;
        }
        case "trading": {
          a.timer++;
          if (a.timer > 48) {
            a.state = "walking";
            a.tradingPartnerId = null;
            a.targetX = Math.random() * W * 0.7 + W * 0.15;
            a.targetY = groundY - 2 + Math.random() * 6;
          }
          break;
        }
      }

      // Check for trading opportunity (two nearby agents with resources)
      if (a.state === "walking" && a.resourceOrb) {
        for (const other of agents) {
          if (
            other.id !== a.id &&
            other.state === "walking" &&
            other.resourceOrb &&
            other.tradingPartnerId === null &&
            a.tradingPartnerId === null
          ) {
            const td = Math.hypot(other.x - a.x, other.y - a.y);
            if (td < 30) {
              a.state = "trading";
              a.timer = 0;
              a.tradingPartnerId = other.id;
              other.state = "trading";
              other.timer = 0;
              other.tradingPartnerId = a.id;
              // Swap orb colors
              const tmp = a.resourceOrb.color;
              a.resourceOrb.color = other.resourceOrb.color;
              other.resourceOrb.color = tmp;
              break;
            }
          }
        }
      }

      // ── Draw agent trail ───────────────────────────────────────────────
      for (let ti = 0; ti < a.trail.length; ti++) {
        const alpha = (ti / a.trail.length) * 0.25;
        ctx.beginPath();
        ctx.arc(a.trail[ti].x, a.trail[ti].y, a.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = a.color + Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }

      // ── Draw agent ─────────────────────────────────────────────────────
      // Glow
      const agentGlow = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.size * 3);
      agentGlow.addColorStop(0, a.color + "40");
      agentGlow.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = agentGlow;
      ctx.fill();

      // Body
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
      ctx.fillStyle = a.color;
      ctx.fill();

      // Resource orb
      if (a.resourceOrb) {
        ctx.beginPath();
        ctx.arc(a.x, a.y - a.size - 6, a.resourceOrb.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = a.resourceOrb.color + "cc";
        ctx.fill();
        // Orb glow
        ctx.beginPath();
        ctx.arc(a.x, a.y - a.size - 6, a.resourceOrb.size, 0, Math.PI * 2);
        ctx.fillStyle = a.resourceOrb.color + "20";
        ctx.fill();
      }

      // Trading sparkle
      if (a.state === "trading") {
        for (let s = 0; s < 3; s++) {
          const sx = a.x + (Math.random() - 0.5) * 16;
          const sy = a.y + (Math.random() - 0.5) * 16;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.fill();
        }
      }
    }

    // ── Overflow particles ───────────────────────────────────────────────
    for (let i = overflow.length - 1; i >= 0; i--) {
      const p = overflow[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02; // gravity toward Eve foundations
      p.life--;
      if (p.life <= 0) {
        overflow.splice(i, 1);
        continue;
      }
      const alpha = p.life / 120;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.round(alpha * 200).toString(16).padStart(2, "0");
      ctx.fill();
    }

    // ── Ambient particles (teal, subtle) ─────────────────────────────────
    if (frame % 3 === 0) {
      const px = Math.random() * W;
      const py = Math.random() * H * 0.6;
      ctx.beginPath();
      ctx.arc(px, py, 0.8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(45,212,191,0.12)";
      ctx.fill();
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Re-init agents/resources on resize
  useEffect(() => {
    function handleResize() {
      initRef.current = false;
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Task status helpers ────────────────────────────────────────────────
  const statusIcon = (s: TaskEntry["status"]) => {
    switch (s) {
      case "complete": return "\u2713";
      case "active": return "~";
      case "pending": return "\u25cb";
      case "queued": return "\u00b7";
      case "failed": return "\u2717";
    }
  };
  const statusColor = (s: TaskEntry["status"]) => {
    switch (s) {
      case "complete": return "#10b981";
      case "active": return "#f59e0b";
      case "pending": return "#2dd4bf";
      case "queued": return "rgba(255,255,255,0.2)";
      case "failed": return "#ef4444";
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ backgroundColor: "#060e1a" }}>
      {/* ── Left Panel: Chat + Tasks ──────────────────────────────────── */}
      <div
        className="flex h-full w-[320px] shrink-0 flex-col border-r"
        style={{ borderColor: "rgba(45,212,191,0.1)", background: "rgba(6,14,26,0.95)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/consumer" className="text-xs uppercase tracking-[0.14em] text-white/40 hover:text-white transition-colors">
            &#8592; Eden
          </Link>
          <span className="text-xs text-white/30">{username}</span>
        </div>

        <div className="px-4 pb-2">
          <h2 className="text-lg text-white" style={{ fontFamily: "var(--font-serif)" }}>
            Digital Garden
          </h2>
          <p className="mt-1 text-xs text-white/30">AI agents building Eden services in real time</p>
        </div>

        {/* Task log */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <span className="mt-px font-mono font-bold" style={{ color: statusColor(t.status) }}>
                {statusIcon(t.status)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white/70 leading-snug" style={{ color: t.status === "queued" ? "rgba(255,255,255,0.25)" : t.status === "failed" ? "rgba(239,68,68,0.7)" : undefined }}>
                  {t.text}
                </p>
                <span className="text-white/20">
                  {t.time}
                  {t.leafCost ? ` · ${t.leafCost} 🍃` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Chat input */}
        <div className="border-t p-3" style={{ borderColor: "rgba(45,212,191,0.1)" }}>
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleBuild(); } }}
            placeholder="Tell Eden what to build..."
            rows={2}
            className="w-full resize-none rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none border border-white/[0.06] focus:border-[rgba(45,212,191,0.3)] transition"
          />
          <button
            type="button"
            onClick={handleBuild}
            disabled={!chatInput.trim() || buildRunning}
            className="mt-2 w-full rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-30"
            style={{ background: "#2dd4bf", color: "#060e1a" }}
          >
            {buildRunning ? "Building..." : "Build"}
          </button>
        </div>
      </div>

      {/* ── Center: Canvas World ──────────────────────────────────────── */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ display: "block" }}
        />
      </div>

      {/* ── Right Panel: Economy Stats ────────────────────────────────── */}
      <div
        className="flex h-full w-[240px] shrink-0 flex-col border-l p-4 space-y-4 overflow-y-auto"
        style={{ borderColor: "rgba(45,212,191,0.1)", background: "rgba(6,14,26,0.95)" }}
      >
        <h3 className="text-base text-white" style={{ fontFamily: "var(--font-serif)" }}>
          Eden Economy
        </h3>

        {/* Adam Pool */}
        <div className="rounded-xl p-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
          <p className="text-[10px] uppercase tracking-wider text-amber-400/70">Adam — Innovation</p>
          <div className="mt-2 h-2 w-full rounded-full" style={{ background: "rgba(245,158,11,0.1)" }}>
            <div className="h-full rounded-full" style={{ width: "55%", background: "#f59e0b" }} />
          </div>
          <p className="mt-1.5 text-xs text-amber-400/50">55% of E — Revenue based</p>
          <p className="mt-1 text-[10px] text-amber-400/35">Imagine Auto: +12% this week</p>
        </div>

        {/* Eve Pool */}
        <div className="rounded-xl p-3" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
          <p className="text-[10px] uppercase tracking-wider text-blue-400/70">Eve — Commitment</p>
          <div className="mt-2 h-2 w-full rounded-full" style={{ background: "rgba(59,130,246,0.1)" }}>
            <div className="h-full rounded-full" style={{ width: "45%", background: "#3b82f6" }} />
          </div>
          <p className="mt-1.5 text-xs text-blue-400/50">45% of E — Usage based</p>
          <p className="mt-1 text-[10px] text-blue-400/35">Your stake: 100% (early)</p>
        </div>

        {/* Equilibrium */}
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] uppercase tracking-wider text-white/30">Equilibrium</p>
          <div className="mt-2 relative h-3 w-full rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
            {/* 40% and 60% markers */}
            <div className="absolute top-0 h-full w-px" style={{ left: "0%", background: "rgba(255,255,255,0.1)" }} />
            <div className="absolute top-0 h-full w-px" style={{ left: "100%", background: "rgba(255,255,255,0.1)" }} />
            {/* Valid range highlight */}
            <div className="absolute top-0 h-full rounded-full" style={{ left: "0%", width: "100%", background: "rgba(45,212,191,0.08)" }} />
            {/* Current marker at 55% → maps to 75% within 40-60 range display */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full"
              style={{ left: "75%", transform: "translate(-50%, -50%)", background: "#2dd4bf", boxShadow: "0 0 6px rgba(45,212,191,0.5)" }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-white/20">
            <span>40%</span>
            <span>50%</span>
            <span>60%</span>
          </div>
          <p className="mt-1 text-[10px] text-emerald-400/50">Within range</p>
        </div>

        {/* Leaf Flow */}
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] uppercase tracking-wider text-white/30">Leaf Flow</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-emerald-400/60">Earned</span>
              <span className="font-mono text-emerald-400">+1,340</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-red-400/60">Spent</span>
              <span className="font-mono text-red-400">-920</span>
            </div>
            <div className="border-t pt-1" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Net</span>
                <span className="font-mono text-[#2dd4bf]">+420 &#127809;</span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] uppercase tracking-wider text-white/30">Agents</p>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span className="h-2 w-2 rounded-full" style={{ background: "#2dd4bf" }} />
            Worker
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span className="h-2 w-2 rounded-full" style={{ background: "#f59e0b" }} />
            Carrier
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span className="h-2 w-2 rounded-full" style={{ background: "#a855f7" }} />
            Assembler
          </div>
        </div>
      </div>
    </div>
  );
}
