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
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (kind === "usage") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}
