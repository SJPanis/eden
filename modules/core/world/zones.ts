import "server-only";

// Canonical Eden World zones. See docs/EDEN_WORLD_SPEC.md §3.1 and
// docs/PHASE_01_API_CONTRACT.md §4.1.

export type ZoneId =
  | "tree"
  | "observatory"
  | "workshop"
  | "grove"
  | "wellspring"
  | "council"
  | "sealed";

export type ZoneDefinition = {
  id: ZoneId;
  label: string;
  service: string | null;
  // isActive: false = visible but not entered in Phase 01 (e.g. governance
  // council deferred to Phase 04, sealed gardens locked until services ship).
  isActive: boolean;
};

export const ZONES: readonly ZoneDefinition[] = [
  { id: "tree", label: "Eden Tree", service: null, isActive: true },
  { id: "observatory", label: "Observatory", service: "market-lens", isActive: true },
  { id: "workshop", label: "Workshop", service: "imagine-auto", isActive: true },
  { id: "grove", label: "The Grove", service: "spot-splore", isActive: true },
  { id: "wellspring", label: "Wellspring", service: "leaf-bank", isActive: true },
  { id: "council", label: "Council Ring", service: "governance", isActive: false },
  { id: "sealed", label: "Sealed Gardens", service: null, isActive: false },
] as const;

export const ZONE_IDS = new Set<ZoneId>(ZONES.map((z) => z.id));

export function resolveZoneForTaskKeywords(
  taskSummary: string,
  agentType: "artist" | "architect",
): ZoneId {
  const text = taskSummary.toLowerCase();
  if (/market\s*lens|stock|ticker|equity|finance/.test(text)) return "observatory";
  if (/imagine\s*auto|car|vehicle|truck|parts?/.test(text)) return "workshop";
  if (/spot\s*splore|vibe|playlist|song|artist|discovery/.test(text)) return "grove";
  if (/leaf|wallet|balance|payout|stripe/.test(text)) return "wellspring";
  // Architects default to the Eden Tree (central), Artists default to the
  // workshop (build-oriented).
  return agentType === "architect" ? "tree" : "workshop";
}
