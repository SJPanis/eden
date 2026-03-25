type BusinessCardProps = {
  name: string;
  tagline: string;
  category: string;
  saved?: boolean;
};

export function BusinessCard({
  name,
  tagline,
  category,
  saved = false,
}: BusinessCardProps) {
  return (
    <article className="eden-shell eden-card-hover min-h-[164px] min-w-[248px] snap-start p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-eden-accent">Business</p>
      <h3 className="mt-2 text-base font-semibold text-white">{name}</h3>
      <p className="mt-1 text-sm text-white/50">{tagline}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="rounded-full bg-[#2dd4bf]/15 px-2.5 py-1 text-xs text-white">
          {category}
        </span>
        <span className="text-xs text-white/50">{saved ? "Saved" : "Trending"}</span>
      </div>
    </article>
  );
}
