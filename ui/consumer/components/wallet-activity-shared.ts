export function formatWalletEventLabel(kind: string) {
  if (kind === "wallet") {
    return "Top-up";
  }

  if (kind === "usage") {
    return "Service charge";
  }

  return kind
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getWalletEventBadgeClasses(kind: string) {
  if (kind === "wallet") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  }

  if (kind === "usage") {
    return "border-rose-500/25 bg-rose-500/10 text-rose-300";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}
