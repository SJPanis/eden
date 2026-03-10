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
    image: 18,
    label: "text-base",
    subtitle: "text-xs",
  },
  md: {
    gap: "gap-3.5",
    mark: "h-12 w-12 rounded-[18px]",
    image: 20,
    label: "text-lg",
    subtitle: "text-sm",
  },
  lg: {
    gap: "gap-4",
    mark: "h-14 w-14 rounded-[20px]",
    image: 24,
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
        className={`flex shrink-0 items-center justify-center border border-slate-900/10 bg-slate-950 shadow-[0_18px_32px_-24px_rgba(15,23,42,0.85)] ${classes.mark}`}
      >
        <Image
          src="/favicon.ico"
          alt="Eden logo"
          width={classes.image}
          height={classes.image}
          unoptimized
          className="h-auto w-auto"
        />
      </div>
      <div className="min-w-0">
        <p className={`font-semibold tracking-tight text-eden-ink ${classes.label}`}>{label}</p>
        <p className={`text-eden-muted ${classes.subtitle}`}>{subtitle}</p>
      </div>
    </div>
  );
}
