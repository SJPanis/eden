import "server-only";

// Avatar config shape and validation. See docs/PHASE_01_API_CONTRACT.md §6.
// Sprite allowlist is hardcoded for Phase 01. When the visual pipeline lands
// in Phase 06, the allowlist becomes data-driven via the VisualAsset model.

export type AvatarConfig = {
  sprite: string;
  color: string;
  nameColor: string;
};

export const DEFAULT_AVATAR: AvatarConfig = {
  sprite: "seed-01",
  color: "#69f0ae",
  nameColor: "#ffffff",
};

export const AVATAR_SPRITE_ALLOWLIST = new Set([
  "seed-01",
  "seed-02",
  "seed-03",
  "seed-04",
  "seed-05",
]);

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export type AvatarValidationError = {
  field: "sprite" | "color" | "nameColor";
  code: "INVALID_SPRITE" | "INVALID_COLOR";
  message: string;
};

export function validateAvatarConfig(
  input: unknown,
): { ok: true; value: AvatarConfig } | { ok: false; error: AvatarValidationError } {
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      error: {
        field: "sprite",
        code: "INVALID_SPRITE",
        message: "Request body must be an object with sprite, color, nameColor.",
      },
    };
  }
  const raw = input as Record<string, unknown>;

  if (typeof raw.sprite !== "string" || !AVATAR_SPRITE_ALLOWLIST.has(raw.sprite)) {
    return {
      ok: false,
      error: {
        field: "sprite",
        code: "INVALID_SPRITE",
        message: `sprite must be one of: ${Array.from(AVATAR_SPRITE_ALLOWLIST).join(", ")}.`,
      },
    };
  }
  if (typeof raw.color !== "string" || !HEX_COLOR_PATTERN.test(raw.color)) {
    return {
      ok: false,
      error: {
        field: "color",
        code: "INVALID_COLOR",
        message: "color must be a 7-character hex string, e.g. '#69f0ae'.",
      },
    };
  }
  if (
    typeof raw.nameColor !== "string" ||
    !HEX_COLOR_PATTERN.test(raw.nameColor)
  ) {
    return {
      ok: false,
      error: {
        field: "nameColor",
        code: "INVALID_COLOR",
        message: "nameColor must be a 7-character hex string, e.g. '#ffffff'.",
      },
    };
  }

  return {
    ok: true,
    value: { sprite: raw.sprite, color: raw.color, nameColor: raw.nameColor },
  };
}

export function extractStoredAvatar(raw: unknown): AvatarConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.sprite === "string" &&
    typeof obj.color === "string" &&
    typeof obj.nameColor === "string" &&
    AVATAR_SPRITE_ALLOWLIST.has(obj.sprite) &&
    HEX_COLOR_PATTERN.test(obj.color) &&
    HEX_COLOR_PATTERN.test(obj.nameColor)
  ) {
    return { sprite: obj.sprite, color: obj.color, nameColor: obj.nameColor };
  }
  return null;
}
