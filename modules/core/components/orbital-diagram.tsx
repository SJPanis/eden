"use client";

import { motion } from "framer-motion";

const ACCENT = "#2dd4bf";
const ACCENT_RGB = "45, 212, 191";

type OrbitalNode = {
  label: string;
  angle: number;
  color?: string;
};

type OrbitalDiagramProps = {
  size?: number;
  centerLabel?: string;
  centerSublabel?: string;
  innerNodes?: OrbitalNode[];
  middleNodes?: OrbitalNode[];
  showOuterRing?: boolean;
  glowIntensity?: number;
  interactive?: boolean;
  onNodeClick?: (label: string) => void;
};

export function OrbitalDiagram({
  size = 380,
  centerLabel = "LEAF",
  centerSublabel,
  innerNodes = [
    { label: "Publish", angle: -90 },
    { label: "Run", angle: 30 },
    { label: "Earn", angle: 150 },
  ],
  middleNodes = [
    { label: "Discover", angle: 60 },
    { label: "Contribute", angle: 220 },
  ],
  showOuterRing = true,
  glowIntensity = 0.6,
  interactive = false,
  onNodeClick,
}: OrbitalDiagramProps) {
  const CX = size / 2;
  const CY = size / 2;

  const scale = size / 380;
  const innerR = Math.round(82 * scale);
  const middleR = Math.round(134 * scale);
  const outerR = Math.round(174 * scale);
  const centerSize = Math.round(44 * scale);
  const glowR1 = Math.round(32 * scale);
  const glowR2 = Math.round(22 * scale);

  const rings = [
    { r: innerR, dur: 20, nodes: innerNodes },
    { r: middleR, dur: 30, nodes: middleNodes },
    { r: outerR, dur: 40, nodes: [] as OrbitalNode[] },
  ];

  const gradientId = `orb-glow-${size}`;
  const glowOpacity = 0.2 + glowIntensity * 0.25;

  function renderNode(node: OrbitalNode, ringDur: number) {
    const nodeColor = node.color ?? ACCENT;
    const nodeRgb = node.color ? undefined : ACCENT_RGB;
    const borderColor = nodeRgb
      ? `rgba(${nodeRgb}, 0.35)`
      : `${nodeColor}59`;
    const textColor = nodeRgb
      ? `rgba(${nodeRgb}, 0.9)`
      : `${nodeColor}e6`;

    const inner = (
      <div
        className="whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-medium"
        style={{
          border: `1px solid ${borderColor}`,
          background: "rgba(11,22,34,0.82)",
          color: textColor,
          backdropFilter: "blur(6px)",
        }}
      >
        {node.label}
      </div>
    );

    if (interactive) {
      return (
        <motion.button
          type="button"
          onClick={() => onNodeClick?.(node.label)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.95 }}
          className="cursor-pointer"
          style={{ outline: "none" }}
        >
          {inner}
        </motion.button>
      );
    }

    return inner;
  }

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Static SVG rings */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ overflow: "visible" }}
        aria-hidden
      >
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`rgba(${ACCENT_RGB}, ${glowOpacity})`} />
            <stop offset="100%" stopColor={`rgba(${ACCENT_RGB}, 0)`} />
          </radialGradient>
        </defs>
        {/* Outer ambient */}
        {showOuterRing ? (
          <circle cx={CX} cy={CY} r={rings[2].r + Math.round(24 * scale)} fill={`rgba(${ACCENT_RGB}, 0.018)`} />
        ) : null}
        {/* Ring 3 dashed */}
        {showOuterRing ? (
          <circle
            cx={CX} cy={CY} r={rings[2].r}
            fill="none"
            stroke={`rgba(${ACCENT_RGB}, 0.1)`}
            strokeWidth={0.75}
            strokeDasharray="5 9"
          />
        ) : null}
        {/* Ring 2 */}
        <circle
          cx={CX} cy={CY} r={rings[1].r}
          fill="none"
          stroke={`rgba(${ACCENT_RGB}, 0.14)`}
          strokeWidth={0.75}
        />
        {/* Ring 1 */}
        <circle
          cx={CX} cy={CY} r={rings[0].r}
          fill="none"
          stroke={`rgba(${ACCENT_RGB}, 0.18)`}
          strokeWidth={0.75}
        />
        {/* Center glow */}
        <circle cx={CX} cy={CY} r={glowR1} fill={`url(#${gradientId})`} />
        <circle cx={CX} cy={CY} r={glowR2} fill={`rgba(${ACCENT_RGB}, 0.14)`} />
      </svg>

      {/* Center label */}
      <div
        className="absolute flex flex-col items-center justify-center rounded-full"
        style={{
          width: centerSize,
          height: centerSize,
          left: CX,
          top: CY,
          transform: "translate(-50%,-50%)",
          border: `1px solid rgba(${ACCENT_RGB}, 0.4)`,
          background: `rgba(${ACCENT_RGB}, 0.1)`,
        }}
      >
        <span
          className="font-mono font-semibold tracking-widest"
          style={{ color: ACCENT, fontSize: Math.max(7, Math.round(9 * scale)) }}
        >
          {centerLabel}
        </span>
        {centerSublabel ? (
          <span
            className="font-mono tracking-wider"
            style={{ color: `rgba(${ACCENT_RGB}, 0.6)`, fontSize: Math.max(5, Math.round(6 * scale)) }}
          >
            {centerSublabel}
          </span>
        ) : null}
      </div>

      {/* Rotating rings with counter-rotating nodes */}
      {rings.slice(0, 2).map((ring, ri) =>
        ring.nodes.length > 0 ? (
          <motion.div
            key={ri}
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: ring.dur, repeat: Infinity, ease: "linear" }}
          >
            {ring.nodes.map((node, ni) => {
              const rad = (node.angle * Math.PI) / 180;
              const nx = CX + ring.r * Math.cos(rad);
              const ny = CY + ring.r * Math.sin(rad);
              return (
                <div
                  key={ni}
                  className="absolute"
                  style={{
                    left: nx,
                    top: ny,
                    transform: "translate(-50%,-50%)",
                  }}
                >
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: ring.dur, repeat: Infinity, ease: "linear" }}
                  >
                    {renderNode(node, ring.dur)}
                  </motion.div>
                </div>
              );
            })}
          </motion.div>
        ) : null,
      )}
    </div>
  );
}
