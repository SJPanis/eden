"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  stage: number; // 0-4: tent, shack, workshop, office, tower
  isTownHall: boolean;
  href: string;
};

type AgentRole = "worker" | "carrier" | "assembler" | "adam" | "eve";
type AgentState = "walking" | "gathering" | "trading" | "building";

type Agent = {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: AgentState;
  role: AgentRole;
  color: string;
  speed: number;
  timer: number;
  resourceOrb: { color: string; kind: ResourceKind } | null;
  trail: { x: number; y: number }[];
  targetBuildingId: string | null;
  tradingPartnerId: number | null;
};

type ResourceKind = "crystal" | "timber" | "ore" | "energy" | "data";

type ResourceNode = {
  id: number;
  x: number;
  y: number;
  kind: ResourceKind;
  color: string;
  label: string;
  pulse: number;
  floaters: { dx: number; dy: number; phase: number }[];
  flashTimer: number;
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

type SmokeParticle = {
  x: number;
  y: number;
  size: number;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
};

// ── Constants ────────────────────────────────────────────────────────────────

const GROUND_Y_RATIO = 0.72;

const ROLE_COLORS: Record<AgentRole, string> = {
  worker: "#2dd4bf",
  carrier: "#f59e0b",
  assembler: "#a855f7",
  adam: "#fbbf24",
  eve: "#5eead4",
};

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
    stage: 4,
    isTownHall: true,
    href: "/consumer",
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
    stage: 3,
    isTownHall: false,
    href: "/services/imagine-auto",
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
    stage: 2,
    isTownHall: false,
    href: "/services/market-lens",
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
    stage: 1,
    isTownHall: false,
    href: "/services/spot-splore",
  },
];

const RESOURCE_DEFS: { kind: ResourceKind; label: string; color: string }[] = [
  { kind: "crystal", label: "Crystal", color: "#2dd4bf" },
  { kind: "timber", label: "Timber", color: "#92400e" },
  { kind: "ore", label: "Ore", color: "#9ca3af" },
  { kind: "energy", label: "Energy", color: "#f59e0b" },
  { kind: "data", label: "Data", color: "#a855f7" },
];

const AGENT_PRESETS: { role: AgentRole; speed: number }[] = [
  { role: "worker", speed: 1.2 },
  { role: "carrier", speed: 0.9 },
  { role: "assembler", speed: 0.7 },
  { role: "worker", speed: 1.1 },
  { role: "adam", speed: 1.0 },
  { role: "carrier", speed: 0.8 },
  { role: "eve", speed: 1.3 },
  { role: "worker", speed: 0.95 },
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
  return RESOURCE_DEFS.map((def, i) => ({
    id: i,
    x: 0.1 * canvasW + (i / (RESOURCE_DEFS.length - 1)) * 0.8 * canvasW,
    y: groundY + 8 + Math.random() * 20,
    kind: def.kind,
    color: def.color,
    label: def.label,
    pulse: Math.random() * Math.PI * 2,
    floaters: Array.from({ length: 3 + Math.floor(Math.random() * 2) }, () => ({
      dx: (Math.random() - 0.5) * 24,
      dy: (Math.random() - 0.5) * 18,
      phase: Math.random() * Math.PI * 2,
    })),
    flashTimer: 0,
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
      role: preset.role,
      color: ROLE_COLORS[preset.role],
      speed: preset.speed,
      timer: 0,
      resourceOrb: null,
      trail: [],
      targetBuildingId: null,
      tradingPartnerId: null,
    };
  });
}

// ── Drawing helpers ──────────────────────────────────────────────────────────

function drawHumanoidAgent(
  ctx: CanvasRenderingContext2D,
  a: Agent,
  frame: number,
) {
  const bodyY = a.y;
  const headY = bodyY - 8;

  // Trail (last 15 positions)
  for (let ti = 0; ti < a.trail.length; ti++) {
    const alpha = (ti / a.trail.length) * 0.25;
    ctx.beginPath();
    ctx.arc(a.trail[ti].x, a.trail[ti].y, 2, 0, Math.PI * 2);
    ctx.fillStyle =
      a.color + Math.round(alpha * 255).toString(16).padStart(2, "0");
    ctx.fill();
  }

  // Glow
  const glow = ctx.createRadialGradient(a.x, bodyY, 0, a.x, bodyY, 16);
  glow.addColorStop(0, a.color + "30");
  glow.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(a.x, bodyY, 16, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // Body circle (4px radius)
  ctx.beginPath();
  ctx.arc(a.x, bodyY, 4, 0, Math.PI * 2);
  ctx.fillStyle = a.color;
  ctx.fill();

  // Head circle (3px radius)
  ctx.beginPath();
  ctx.arc(a.x, headY, 3, 0, Math.PI * 2);
  ctx.fillStyle = a.color;
  ctx.fill();

  // Neck line
  ctx.beginPath();
  ctx.moveTo(a.x, headY + 3);
  ctx.lineTo(a.x, bodyY - 4);
  ctx.strokeStyle = a.color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Arms — animated swing
  const armSwing = Math.sin(frame * 0.08 + a.id * 2) * 6;
  ctx.beginPath();
  ctx.moveTo(a.x - 6, bodyY + armSwing * 0.3);
  ctx.lineTo(a.x, bodyY - 2);
  ctx.lineTo(a.x + 6, bodyY - armSwing * 0.3);
  ctx.strokeStyle = a.color + "cc";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Carried resource (12px above head)
  if (a.resourceOrb) {
    const orbY = headY - 12;
    drawMiniResource(ctx, a.x, orbY, a.resourceOrb.kind, a.resourceOrb.color, 5, frame);
  }

  // Trading sparkle
  if (a.state === "trading") {
    for (let s = 0; s < 3; s++) {
      const sx = a.x + (Math.random() - 0.5) * 16;
      const sy = bodyY + (Math.random() - 0.5) * 16;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fill();
    }
  }
}

function drawMiniResource(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: ResourceKind,
  color: string,
  size: number,
  frame: number,
) {
  ctx.save();
  switch (kind) {
    case "crystal": {
      // Diamond polygon
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size * 0.6, y);
      ctx.lineTo(x, y + size * 0.5);
      ctx.lineTo(x - size * 0.6, y);
      ctx.closePath();
      ctx.fillStyle = color + "cc";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      break;
    }
    case "timber": {
      // Horizontal log ellipse
      ctx.beginPath();
      ctx.ellipse(x, y, size * 1.2, size * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = color + "cc";
      ctx.fill();
      ctx.strokeStyle = "#6b3a1a";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      break;
    }
    case "ore": {
      // Irregular hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const r = size * (0.7 + ((i * 37) % 7) * 0.05);
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = color + "bb";
      ctx.fill();
      ctx.strokeStyle = "#6b7280";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      break;
    }
    case "energy": {
      // Radial gradient sphere
      const eg = ctx.createRadialGradient(x, y, 0, x, y, size);
      eg.addColorStop(0, "#fef3c7");
      eg.addColorStop(0.5, color + "cc");
      eg.addColorStop(1, color + "00");
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = eg;
      ctx.fill();
      break;
    }
    case "data": {
      // Triangle cluster
      const triSize = size * 0.55;
      for (let t = 0; t < 3; t++) {
        const ox = (t - 1) * triSize * 0.8;
        const oy = t === 1 ? -triSize * 0.4 : triSize * 0.2;
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy - triSize);
        ctx.lineTo(x + ox + triSize * 0.5, y + oy + triSize * 0.3);
        ctx.lineTo(x + ox - triSize * 0.5, y + oy + triSize * 0.3);
        ctx.closePath();
        ctx.fillStyle = color + "aa";
        ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
  // Suppress unused var warning
  void frame;
}

function drawResourceNode(
  ctx: CanvasRenderingContext2D,
  r: ResourceNode,
  frame: number,
) {
  r.pulse += 0.03;
  const pulseSize = 8 + Math.sin(r.pulse) * 2;

  // Glow
  const glow = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, pulseSize * 3);
  glow.addColorStop(0, r.color + "40");
  glow.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(r.x, r.y, pulseSize * 3, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // Core shape
  drawMiniResource(ctx, r.x, r.y, r.kind, r.color, pulseSize, frame);

  // Floating resource pieces
  for (const f of r.floaters) {
    f.phase += 0.015;
    const fx = r.x + f.dx + Math.sin(f.phase) * 3;
    const fy = r.y + f.dy + Math.cos(f.phase * 0.7) * 2;
    drawMiniResource(ctx, fx, fy, r.kind, r.color, 3, frame);
  }

  // Label
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText(r.label, r.x, r.y + pulseSize + 14);

  // Flash effect when clicked
  if (r.flashTimer > 0) {
    r.flashTimer--;
    const flashAlpha = r.flashTimer / 30;
    ctx.beginPath();
    ctx.arc(r.x, r.y, pulseSize * 4, 0, Math.PI * 2);
    ctx.fillStyle = r.color + Math.round(flashAlpha * 80).toString(16).padStart(2, "0");
    ctx.fill();
    // Show label prominently
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
    ctx.fillText(r.label, r.x, r.y - pulseSize - 8);
  }
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  b: Building,
  W: number,
  groundY: number,
  frame: number,
  smoke: SmokeParticle[],
) {
  const bx = b.x * W;

  // Base glow
  const baseGlow = ctx.createRadialGradient(bx, groundY, 0, bx, groundY, b.width * 1.5);
  baseGlow.addColorStop(0, b.glowColor);
  baseGlow.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(bx, groundY, b.width * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = baseGlow;
  ctx.fill();

  switch (b.stage) {
    case 0:
      drawTent(ctx, bx, groundY, b);
      break;
    case 1:
      drawShack(ctx, bx, groundY, b, frame);
      break;
    case 2:
      drawWorkshop(ctx, bx, groundY, b, frame, smoke);
      break;
    case 3:
      drawOffice(ctx, bx, groundY, b, frame);
      break;
    case 4:
      drawTower(ctx, bx, groundY, b, frame);
      break;
  }

  // Name label
  const labelY =
    b.stage === 0
      ? groundY - 35
      : b.stage === 1
        ? groundY - b.height * 0.55
        : b.stage === 4
          ? groundY - b.height - 30
          : groundY - b.height * 0.8 - 18;
  ctx.font = "12px serif";
  ctx.textAlign = "center";
  ctx.fillStyle = b.color;
  ctx.fillText(b.name, bx, labelY);
}

function drawTent(
  ctx: CanvasRenderingContext2D,
  bx: number,
  groundY: number,
  b: Building,
) {
  const halfW = b.width * 0.4;
  const tentH = 30;

  // Triangle outline
  ctx.beginPath();
  ctx.moveTo(bx, groundY - tentH);
  ctx.lineTo(bx + halfW, groundY);
  ctx.lineTo(bx - halfW, groundY);
  ctx.closePath();
  ctx.strokeStyle = b.color + "80";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = b.color + "10";
  ctx.fill();

  // Door arc
  ctx.beginPath();
  ctx.arc(bx, groundY, 6, Math.PI, 0);
  ctx.strokeStyle = b.color + "60";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawShack(
  ctx: CanvasRenderingContext2D,
  bx: number,
  groundY: number,
  b: Building,
  frame: number,
) {
  const halfW = b.width * 0.4;
  const wallH = 28;
  const roofH = 16;
  const top = groundY - wallH;

  // Wall
  ctx.fillStyle = b.color + "25";
  ctx.fillRect(bx - halfW, top, halfW * 2, wallH);
  ctx.strokeStyle = b.color + "70";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(bx - halfW, top, halfW * 2, wallH);

  // Pitched roof
  ctx.beginPath();
  ctx.moveTo(bx - halfW - 4, top);
  ctx.lineTo(bx, top - roofH);
  ctx.lineTo(bx + halfW + 4, top);
  ctx.closePath();
  ctx.fillStyle = b.color + "30";
  ctx.fill();
  ctx.strokeStyle = b.color + "70";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 2 windows
  for (let w = 0; w < 2; w++) {
    const wx = bx - halfW * 0.5 + w * halfW;
    const wy = top + 10;
    const flicker = Math.sin(frame * 0.04 + w * 5) > 0.1;
    ctx.fillStyle = flicker ? "rgba(255,245,200,0.55)" : "rgba(255,245,200,0.15)";
    ctx.fillRect(wx - 4, wy, 8, 10);
  }
}

function drawWorkshop(
  ctx: CanvasRenderingContext2D,
  bx: number,
  groundY: number,
  b: Building,
  frame: number,
  smoke: SmokeParticle[],
) {
  const halfW = b.width * 0.45;
  const wallH = 42;
  const roofH = 14;
  const top = groundY - wallH;

  // Wall
  ctx.fillStyle = b.color + "28";
  ctx.fillRect(bx - halfW, top, halfW * 2, wallH);
  ctx.strokeStyle = b.color + "70";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx - halfW, top, halfW * 2, wallH);

  // Flat roof with slight peak
  ctx.beginPath();
  ctx.moveTo(bx - halfW - 3, top);
  ctx.lineTo(bx, top - roofH);
  ctx.lineTo(bx + halfW + 3, top);
  ctx.closePath();
  ctx.fillStyle = b.color + "35";
  ctx.fill();
  ctx.strokeStyle = b.color + "70";
  ctx.stroke();

  // 4 windows (2x2 grid)
  const winCols = 2;
  const winRows = 2;
  for (let r = 0; r < winRows; r++) {
    for (let c = 0; c < winCols; c++) {
      const wx = bx - halfW * 0.5 + c * halfW;
      const wy = top + 8 + r * 16;
      const flicker = Math.sin(frame * 0.05 + r * 3 + c * 7) > 0.15;
      ctx.fillStyle = flicker ? "rgba(255,245,200,0.55)" : "rgba(255,245,200,0.12)";
      ctx.fillRect(wx - 4, wy, 8, 10);
    }
  }

  // Chimney
  const chimneyX = bx + halfW * 0.6;
  const chimneyTop = top - roofH * 0.5 - 10;
  ctx.fillStyle = b.color + "40";
  ctx.fillRect(chimneyX - 3, chimneyTop, 6, top - roofH * 0.5 - chimneyTop + 2);

  // Emit smoke particles
  if (frame % 8 === 0) {
    smoke.push({
      x: chimneyX,
      y: chimneyTop,
      size: 2 + Math.random() * 2,
      life: 80,
      maxLife: 80,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.4 - Math.random() * 0.3,
    });
  }
}

function drawOffice(
  ctx: CanvasRenderingContext2D,
  bx: number,
  groundY: number,
  b: Building,
  frame: number,
) {
  const halfW = b.width * 0.45;
  const wallH = 58;
  const top = groundY - wallH;

  // Glass curtain wall
  ctx.fillStyle = b.color + "18";
  ctx.fillRect(bx - halfW, top, halfW * 2, wallH);

  // Glass frame
  ctx.strokeStyle = b.color + "50";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx - halfW, top, halfW * 2, wallH);

  // Horizontal floor lines
  const floors = 4;
  for (let f = 1; f < floors; f++) {
    const fy = top + (wallH / floors) * f;
    ctx.beginPath();
    ctx.moveTo(bx - halfW, fy);
    ctx.lineTo(bx + halfW, fy);
    ctx.strokeStyle = b.color + "25";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Window grid (glass curtain style)
  const winCols = Math.floor(halfW * 2 / 12);
  const winRows = floors;
  for (let r = 0; r < winRows; r++) {
    for (let c = 0; c < winCols; c++) {
      const wx = bx - halfW + 4 + c * 12;
      const wy = top + 3 + r * (wallH / floors);
      const flicker = Math.sin(frame * 0.04 + r * 4 + c * 9 + b.x * 100) > 0.2;
      ctx.fillStyle = flicker ? "rgba(200,235,255,0.5)" : "rgba(200,235,255,0.08)";
      ctx.fillRect(wx, wy, 8, (wallH / floors) - 5);
    }
  }

  // Flat roof accent
  ctx.fillStyle = b.color + "40";
  ctx.fillRect(bx - halfW, top - 2, halfW * 2, 3);
}

function drawTower(
  ctx: CanvasRenderingContext2D,
  bx: number,
  groundY: number,
  b: Building,
  frame: number,
) {
  const baseHalfW = b.width * 0.45;
  const wallH = b.height * 0.85;
  const topHalfW = baseHalfW * 0.75;
  const top = groundY - wallH;

  // Tapered body
  ctx.beginPath();
  ctx.moveTo(bx - baseHalfW, groundY);
  ctx.lineTo(bx - topHalfW, top);
  ctx.lineTo(bx + topHalfW, top);
  ctx.lineTo(bx + baseHalfW, groundY);
  ctx.closePath();
  ctx.fillStyle = b.color + "20";
  ctx.fill();
  ctx.strokeStyle = b.color + "60";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Floor lines
  const floors = 6;
  for (let f = 1; f < floors; f++) {
    const t = f / floors;
    const fy = groundY - wallH * t;
    const hw = baseHalfW + (topHalfW - baseHalfW) * t;
    ctx.beginPath();
    ctx.moveTo(bx - hw, fy);
    ctx.lineTo(bx + hw, fy);
    ctx.strokeStyle = b.color + "20";
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Window grid
  for (let f = 0; f < floors; f++) {
    const t = (f + 0.5) / floors;
    const fy = groundY - wallH * t;
    const hw = baseHalfW + (topHalfW - baseHalfW) * t;
    const winCount = Math.floor(hw * 2 / 14);
    for (let c = 0; c < winCount; c++) {
      const wx = bx - hw + 5 + c * 14;
      const flicker = Math.sin(frame * 0.04 + f * 3 + c * 11 + b.x * 50) > 0.15;
      ctx.fillStyle = flicker ? "rgba(255,245,200,0.55)" : "rgba(255,245,200,0.1)";
      ctx.fillRect(wx, fy - 5, 8, 10);
    }
  }

  // Antenna
  const antennaTop = top - 20;
  ctx.beginPath();
  ctx.moveTo(bx, top);
  ctx.lineTo(bx, antennaTop);
  ctx.strokeStyle = b.color + "80";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Antenna tip beacon
  const beaconPulse = 3 + Math.sin(frame * 0.06) * 1.5;
  const beaconGlow = ctx.createRadialGradient(
    bx, antennaTop, 0, bx, antennaTop, beaconPulse * 4,
  );
  beaconGlow.addColorStop(0, b.color + "aa");
  beaconGlow.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(bx, antennaTop, beaconPulse * 4, 0, Math.PI * 2);
  ctx.fillStyle = beaconGlow;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx, antennaTop, beaconPulse, 0, Math.PI * 2);
  ctx.fillStyle = b.color;
  ctx.fill();

  // Orbital ring
  const orbitRadius = topHalfW + 8;
  const orbitAngle = frame * 0.02;
  ctx.beginPath();
  ctx.ellipse(bx, top + 6, orbitRadius, orbitRadius * 0.3, 0, 0, Math.PI * 2);
  ctx.strokeStyle = b.color + "25";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Orbiting dot
  const dotX = bx + Math.cos(orbitAngle) * orbitRadius;
  const dotY = top + 6 + Math.sin(orbitAngle) * orbitRadius * 0.3;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = b.color + "cc";
  ctx.fill();
}

// ── Component ────────────────────────────────────────────────────────────────

export function EdenGarden({ username }: EdenGardenProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const frameRef = useRef(0);
  const starsRef = useRef<Star[]>(createStars(60));
  const resourcesRef = useRef<ResourceNode[]>([]);
  const agentsRef = useRef<Agent[]>([]);
  const buildingsRef = useRef<Building[]>(BUILDINGS.map((b) => ({ ...b })));
  const overflowRef = useRef<OverflowParticle[]>([]);
  const smokeRef = useRef<SmokeParticle[]>([]);
  const initRef = useRef(false);

  const [tasks, setTasks] = useState<TaskEntry[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [buildRunning, setBuildRunning] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [econStats, setEconStats] = useState<{
    adam: { userLeafs: number; totalLeafs: number; percentage: number };
    eve: { userActions: number; totalActions: number; percentage: number };
    leafFlow: { earned: number; spent: number; net: number };
  } | null>(null);
  const [adamExpanded, setAdamExpanded] = useState(false);
  const [eveExpanded, setEveExpanded] = useState(false);

  // ── Fetch history + economy stats on mount ───────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch("/api/agents/history")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok && data.entries?.length > 0) {
          setTasks(
            data.entries.map((e: TaskEntry) => ({
              id: e.id,
              text: e.text,
              status: e.status,
              time: e.time,
              leafCost: e.leafCost,
            })),
          );
        }
        setHistoryLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setHistoryLoaded(true);
      });
    fetch("/api/user/contribution-stats")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.ok) setEconStats(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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
    const target = bs.find((b) => b.id === targetId) ?? bs.find((b) => !b.isTownHall && b.stage < 4);
    if (target && target.stage < 4) target.stage = Math.min(4, target.stage + 1);
  }

  // ── Canvas click handler ────────────────────────────────────────────────
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const W = rect.width;
    const groundY = rect.height * GROUND_Y_RATIO;

    // Check buildings
    for (const b of buildingsRef.current) {
      const bx = b.x * W;
      const bTop = groundY - b.height;
      if (
        mx > bx - b.width / 2 &&
        mx < bx + b.width / 2 &&
        my > bTop &&
        my < groundY
      ) {
        router.push(b.href);
        return;
      }
    }

    // Check resource nodes
    for (const r of resourcesRef.current) {
      const dist = Math.hypot(r.x - mx, r.y - my);
      if (dist < 25) {
        r.flashTimer = 30;
        return;
      }
    }
  }

  // ── Spawn agent handler ─────────────────────────────────────────────────
  async function handleSpawnAgent() {
    try {
      const res = await fetch("/api/agents/spawn", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const groundY = rect.height * GROUND_Y_RATIO;
          const newAgent = createAgents(1, rect.width, groundY);
          newAgent[0].id = agentsRef.current.length;
          agentsRef.current.push(newAgent[0]);
        }
      }
    } catch {
      // silent
    }
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
      const rect = canvas.getBoundingClientRect();
      const groundY = rect.height * GROUND_Y_RATIO;
      const newAgents = createAgents(2, rect.width, groundY);
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
    const smoke = smokeRef.current;

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
    ctx.fillStyle = "#142d15";
    ctx.fillRect(0, groundY, W, 3);
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
      drawResourceNode(ctx, r, frame);
    }

    // ── Eve foundations ───────────────────────────────────────────────────
    for (const b of buildings) {
      const bx2 = b.x * W;
      const fW = b.width * 2;
      const fH = 16;
      const fX = bx2 - fW / 2;
      const fY = groundY - fH / 2;
      ctx.fillStyle = "rgba(59,130,246,0.18)";
      ctx.fillRect(fX, fY, fW, fH);
      ctx.strokeStyle = "rgba(59,130,246,0.25)";
      ctx.lineWidth = 1;
      ctx.strokeRect(fX, fY, fW, fH);
    }

    // ── Buildings ────────────────────────────────────────────────────────
    for (const b of buildings) {
      drawBuilding(ctx, b, W, groundY, frame, smoke);
    }

    // ── Smoke particles ──────────────────────────────────────────────────
    for (let i = smoke.length - 1; i >= 0; i--) {
      const sp = smoke[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.size += 0.02;
      sp.life--;
      if (sp.life <= 0) {
        smoke.splice(i, 1);
        continue;
      }
      const alpha = (sp.life / sp.maxLife) * 0.3;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,180,180,${alpha})`;
      ctx.fill();
    }

    // ── Agent AI & Drawing ───────────────────────────────────────────────
    for (const a of agents) {
      // Trail (15 positions)
      a.trail.push({ x: a.x, y: a.y });
      if (a.trail.length > 15) a.trail.shift();

      switch (a.state) {
        case "walking": {
          const dx = a.targetX - a.x;
          const dy = a.targetY - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 5) {
            if (a.resourceOrb && a.targetBuildingId) {
              a.state = "building";
              a.timer = 0;
            } else if (!a.resourceOrb) {
              a.state = "gathering";
              a.timer = 0;
            } else {
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
            const rDef = RESOURCE_DEFS[Math.floor(Math.random() * RESOURCE_DEFS.length)];
            a.resourceOrb = { color: rDef.color, kind: rDef.kind };
            a.state = "walking";
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
            const b = buildings.find((bld) => bld.id === a.targetBuildingId);
            if (b && b.stage < 4) {
              // Small chance to advance stage
              if (Math.random() < 0.03) {
                const prevStage = b.stage;
                b.stage = Math.min(4, b.stage + 1);
                if (prevStage < 4 && b.stage >= 4) {
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
            }
            a.resourceOrb = null;
            a.targetBuildingId = null;
            a.state = "walking";
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

      // Trading opportunity check
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
              const tmp = a.resourceOrb.color;
              a.resourceOrb.color = other.resourceOrb.color;
              other.resourceOrb.color = tmp;
              const tmpKind = a.resourceOrb.kind;
              a.resourceOrb.kind = other.resourceOrb.kind;
              other.resourceOrb.kind = tmpKind;
              break;
            }
          }
        }
      }

      // Draw humanoid agent
      drawHumanoidAgent(ctx, a, frame);
    }

    // ── Overflow particles ───────────────────────────────────────────────
    for (let i = overflow.length - 1; i >= 0; i--) {
      const p = overflow[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
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

    // ── Ambient particles ────────────────────────────────────────────────
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
          {historyLoaded && tasks.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <p className="text-xs text-white/25 text-center leading-relaxed">
                Garden is ready.<br />Tell Eden what to build.
              </p>
            </div>
          )}
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
                  {t.leafCost ? ` \u00b7 ${t.leafCost} \ud83c\udf43` : ""}
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
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleBuild}
              disabled={!chatInput.trim() || buildRunning}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-30"
              style={{ background: "#2dd4bf", color: "#060e1a" }}
            >
              {buildRunning ? "Building..." : "Build"}
            </button>
            <button
              type="button"
              onClick={handleSpawnAgent}
              className="rounded-xl px-3 py-2.5 text-xs font-medium transition-all border"
              style={{ borderColor: "rgba(45,212,191,0.2)", color: "#2dd4bf", background: "rgba(45,212,191,0.05)" }}
              title="Add Agent"
            >
              + Agent
            </button>
          </div>
        </div>
      </div>

      {/* ── Center: Canvas World ──────────────────────────────────────── */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="h-full w-full cursor-pointer"
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

        {/* Adam Pool — clickable expandable */}
        <button
          type="button"
          onClick={() => setAdamExpanded(!adamExpanded)}
          className="w-full rounded-xl p-3 text-left transition-all"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-amber-400/70">Adam \u2014 Innovation</p>
            <span className="text-[10px] font-mono text-amber-400/80">
              {econStats ? `${econStats.adam.percentage.toFixed(2)}%` : "\u2014"}
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full" style={{ background: "rgba(245,158,11,0.1)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, econStats?.adam.percentage ?? 0)}%`, background: "#f59e0b" }}
            />
          </div>
          <p className="mt-1.5 text-xs text-amber-400/50">Revenue based \u2014 your stake</p>
          {adamExpanded && (
            <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "rgba(245,158,11,0.1)" }}>
              <p className="text-[11px] leading-relaxed text-amber-400/40">
                Adam is Eden&apos;s Innovation Pool. Every Leaf spent on services flows into Adam.
                Your % grows as your services earn revenue relative to total Eden revenue.
              </p>
              <div className="space-y-1 text-[10px] font-mono">
                <div className="flex justify-between text-amber-400/50">
                  <span>Your services earned</span>
                  <span className="text-amber-400/70">{econStats?.adam.userLeafs.toLocaleString() ?? 0} Leaf&apos;s</span>
                </div>
                <div className="flex justify-between text-amber-400/50">
                  <span>Total Eden revenue</span>
                  <span className="text-amber-400/70">{econStats?.adam.totalLeafs.toLocaleString() ?? 0} Leaf&apos;s</span>
                </div>
                <div className="flex justify-between text-amber-400/50">
                  <span>Your Adam stake</span>
                  <span className="text-amber-400/70">{econStats?.adam.percentage.toFixed(2) ?? "0.00"}%</span>
                </div>
              </div>
              <p className="text-[9px] text-amber-400/25 italic">
                Formula: your_revenue / total_revenue x 100
              </p>
              <p className="text-center text-[10px] text-amber-400/30">close \u2191</p>
            </div>
          )}
        </button>

        {/* Eve Pool — clickable expandable */}
        <button
          type="button"
          onClick={() => setEveExpanded(!eveExpanded)}
          className="w-full rounded-xl p-3 text-left transition-all"
          style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-blue-400/70">Eve \u2014 Commitment</p>
            <span className="text-[10px] font-mono text-blue-400/80">
              {econStats ? `${econStats.eve.percentage.toFixed(2)}%` : "\u2014"}
            </span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full" style={{ background: "rgba(59,130,246,0.1)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, econStats?.eve.percentage ?? 0)}%`, background: "#3b82f6" }}
            />
          </div>
          <p className="mt-1.5 text-xs text-blue-400/50">Usage based \u2014 your stake</p>
          {eveExpanded && (
            <div className="mt-3 space-y-2 border-t pt-3" style={{ borderColor: "rgba(59,130,246,0.1)" }}>
              <p className="text-[11px] leading-relaxed text-blue-400/40">
                Eve is Eden&apos;s Commitment Pool. Your % grows with consistent qualified usage over time.
                Early contributors earn more \u2014 the denominator grows slowly, protecting early stakes.
              </p>
              <div className="space-y-1 text-[10px] font-mono">
                <div className="flex justify-between text-blue-400/50">
                  <span>Your qualified actions</span>
                  <span className="text-blue-400/70">{econStats?.eve.userActions.toLocaleString() ?? 0}</span>
                </div>
                <div className="flex justify-between text-blue-400/50">
                  <span>Total Eden actions</span>
                  <span className="text-blue-400/70">{econStats?.eve.totalActions.toLocaleString() ?? 0}</span>
                </div>
                <div className="flex justify-between text-blue-400/50">
                  <span>Your Eve stake</span>
                  <span className="text-blue-400/70">{econStats?.eve.percentage.toFixed(2) ?? "0.00"}%</span>
                </div>
              </div>
              <p className="text-[9px] text-blue-400/25 italic">
                Formula: your_actions / total_actions x 100
              </p>
              <p className="text-center text-[10px] text-blue-400/30">close \u2191</p>
            </div>
          )}
        </button>

        {/* Equilibrium */}
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] uppercase tracking-wider text-white/30">Equilibrium</p>
          <div className="mt-2 relative h-3 w-full rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="absolute top-0 h-full w-px" style={{ left: "0%", background: "rgba(255,255,255,0.1)" }} />
            <div className="absolute top-0 h-full w-px" style={{ left: "100%", background: "rgba(255,255,255,0.1)" }} />
            <div className="absolute top-0 h-full rounded-full" style={{ left: "0%", width: "100%", background: "rgba(45,212,191,0.08)" }} />
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

        {/* Leaf Flow — real data */}
        <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] uppercase tracking-wider text-white/30">Leaf Flow</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-emerald-400/60">Earned</span>
              <span className="font-mono text-emerald-400">
                +{(econStats?.leafFlow.earned ?? 0).toLocaleString()} \ud83c\udf43
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-red-400/60">Spent</span>
              <span className="font-mono text-red-400">
                -{(econStats?.leafFlow.spent ?? 0).toLocaleString()} \ud83c\udf43
              </span>
            </div>
            <div className="border-t pt-1" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Net</span>
                <span className="font-mono text-[#2dd4bf]">
                  {(econStats?.leafFlow.net ?? 0) >= 0 ? "+" : ""}{(econStats?.leafFlow.net ?? 0).toLocaleString()} &#127809;
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] uppercase tracking-wider text-white/30">Agents</p>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span className="h-2 w-2 rounded-full" style={{ background: ROLE_COLORS.worker }} />
            Worker
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span className="h-2 w-2 rounded-full" style={{ background: ROLE_COLORS.carrier }} />
            Carrier
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span className="h-2 w-2 rounded-full" style={{ background: ROLE_COLORS.assembler }} />
            Assembler
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span className="h-2 w-2 rounded-full" style={{ background: ROLE_COLORS.adam }} />
            Adam
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span className="h-2 w-2 rounded-full" style={{ background: ROLE_COLORS.eve }} />
            Eve
          </div>
        </div>

        {/* Resources */}
        <div className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] uppercase tracking-wider text-white/30">Resources</p>
          {RESOURCE_DEFS.map((rd) => (
            <div key={rd.kind} className="flex items-center gap-2 text-[10px] text-white/40">
              <span className="h-2 w-2 rounded-full" style={{ background: rd.color }} />
              {rd.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
