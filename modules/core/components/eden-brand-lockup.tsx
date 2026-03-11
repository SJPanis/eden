import Image from "next/image";

type EdenBrandLockupProps = {
  label?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: {
    gap: "gap-3",
    mark: "h-11 w-11 rounded-2xl",
    image: "h-8 w-8",
    label: "text-base",
    subtitle: "text-xs",
  },
  md: {
    gap: "gap-3.5",
    mark: "h-12 w-12 rounded-[18px]",
    image: "h-9 w-9",
    label: "text-lg",
    subtitle: "text-sm",
  },
  lg: {
    gap: "gap-4",
    mark: "h-14 w-14 rounded-[20px]",
    image: "h-11 w-11",
    label: "text-xl",
    subtitle: "text-sm",
  },
} as const;

export function EdenBrandLockup({
  label = "Eden",
  subtitle = "AI service platform",
  size = "md",
  className = "",
}: EdenBrandLockupProps) {
  const classes = sizeClasses[size];

  return (
    <div className={`flex items-center ${classes.gap} ${className}`.trim()}>
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden border border-emerald-950/20 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),rgba(20,83,45,0.96))] shadow-[0_18px_32px_-24px_rgba(15,23,42,0.85)] ${classes.mark}`}
      >
        <div className={`relative ${classes.image}`}>
          <Image
            src="/eden-logo.png"
            alt="Eden logo"
            fill
            sizes="56px"
            unoptimized
            className="object-contain"
          />
        </div>
      </div>
      <div className="min-w-0">
        <p className={`font-semibold tracking-tight text-eden-ink ${classes.label}`}>{label}</p>
        <p className={`text-eden-muted ${classes.subtitle}`}>{subtitle}</p>
      </div>
    </div>
  );
}
