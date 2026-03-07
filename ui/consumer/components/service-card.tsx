type ServiceCardProps = {
  title: string;
  provider: string;
  category: string;
  saved?: boolean;
};

export function ServiceCard({ title, provider, category, saved = false }: ServiceCardProps) {
  return (
    <article className="eden-shell min-h-[164px] min-w-[248px] snap-start p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">Service</p>
      <h3 className="mt-2 text-base font-semibold text-eden-ink">{title}</h3>
      <p className="mt-1 text-sm text-eden-muted">{provider}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-full bg-eden-accent-soft px-2.5 py-1 text-xs text-eden-ink">
          {category}
        </span>
        <span className="text-xs text-eden-muted">{saved ? "Saved" : "Discover"}</span>
      </div>
    </article>
  );
}
