import { EdenLogoMark } from "@/modules/core/components/eden-logo-mark";

type EdenBrandLockupProps = {
  label?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Use on dark backgrounds — switches text to white */
  dark?: boolean;
};

const sizeClasses = {
  sm: {
    gap: "gap-3",
    mark: "h-9 w-9 rounded-[14px]",
    logoSize: 28,
    label: "text-base",
    subtitle: "text-xs",
  },
  md: {
    gap: "gap-3.5",
    mark: "h-11 w-11 rounded-[16px]",
    logoSize: 32,
    label: "text-lg",
    subtitle: "text-sm",
  },
  lg: {
    gap: "gap-4",
    mark: "h-13 w-13 rounded-[20px]",
    logoSize: 38,
    label: "text-xl",
    subtitle: "text-sm",
  },
} as const;

export function EdenBrandLockup({
  label = "Eden",
  subtitle = "AI service economy",
  size = "md",
  className = "",
  dark = false,
}: EdenBrandLockupProps) {
  const c = sizeClasses[size];

  return (
    <div className={`flex items-center ${c.gap} ${className}`.trim()}>
      {/* Logo mark container */}
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden border border-[rgba(45,212,191,0.35)] bg-[radial-gradient(circle_at_35%_25%,rgba(45,212,191,0.18),rgba(13,31,48,0.97))] shadow-[0_4px_20px_-6px_rgba(45,212,191,0.45)] ${c.mark}`}
      >
        <EdenLogoMark size={c.logoSize} />
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className={`font-semibold tracking-tight ${dark ? "text-white" : "text-white"} ${c.label}`}>
          {label}
        </p>
        <p className={`${dark ? "text-white/45" : "text-white/50"} ${c.subtitle}`}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}
