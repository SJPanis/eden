type CategoryCardProps = {
  label: string;
  description: string;
};

export function CategoryCard({ label, description }: CategoryCardProps) {
  return (
    <article className="eden-shell eden-card-hover min-h-[136px] min-w-[220px] snap-start p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">Category</p>
      <h3 className="mt-2 text-base font-semibold text-white">{label}</h3>
      <p className="mt-2 text-sm text-white/50">{description}</p>
    </article>
  );
}
