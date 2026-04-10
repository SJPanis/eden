"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Listing = {
  seller: string;
  species: string;
  morph: string;
  price: string;
  location: string;
  photoUrl: string;
  sourceUrl: string;
  trustedSeller: boolean;
};

export function AskSimonSearch({ initialCategory }: { initialCategory?: string }) {
  const [query, setQuery] = useState(initialCategory ?? "");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e?: React.FormEvent, overrideQuery?: string) {
    if (e) e.preventDefault();
    const searchQuery = overrideQuery ?? query;
    if (!searchQuery.trim() && !initialCategory) return;
    setLoading(true);
    setSearched(true);
    setListings([]);
    try {
      const res = await fetch("/api/services/simonos/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          initialCategory && !overrideQuery
            ? { category: initialCategory }
            : { query: searchQuery }
        ),
      });
      const data = (await res.json()) as { ok?: boolean; listings?: Listing[] };
      if (data.ok && data.listings) setListings(data.listings);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <form onSubmit={(e) => { void handleSearch(e); }} className="relative max-w-2xl mx-auto">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Ask Simon... e.g., "ball python under $200 in Kansas"'
          className="w-full rounded-2xl px-6 py-4 pl-14 text-base text-white outline-none transition placeholder:text-white/30 focus:ring-2 focus:ring-amber-500/40"
          style={{ background: "rgba(30,20,10,0.7)", border: "1px solid rgba(180,140,80,0.2)" }}
        />
        <svg className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <button
          type="submit"
          disabled={loading}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: "rgba(217,119,6,0.8)", color: "#fff" }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-sm text-amber-400/60 animate-pulse">Simon is searching trusted sellers...</p>
        </div>
      )}

      {/* Results grid */}
      {listings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <AnimatePresence>
            {listings.map((listing, i) => (
              <motion.a
                key={`${listing.seller}-${listing.species}-${i}`}
                href={listing.sourceUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="group block rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: "rgba(30,20,10,0.6)",
                  border: "1px solid rgba(180,140,80,0.15)",
                  boxShadow: "0 4px 20px -4px rgba(0,0,0,0.4)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(217,119,6,0.4)";
                  e.currentTarget.style.boxShadow = "0 8px 30px -8px rgba(217,119,6,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(180,140,80,0.15)";
                  e.currentTarget.style.boxShadow = "0 4px 20px -4px rgba(0,0,0,0.4)";
                }}
              >
                {/* Photo placeholder */}
                <div className="h-40 relative overflow-hidden" style={{ background: "rgba(40,30,15,0.5)" }}>
                  {listing.photoUrl ? (
                    <img
                      src={listing.photoUrl}
                      alt={listing.species}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : null}
                  <div className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                    style={{ background: "rgba(22,163,74,0.8)", color: "#fff" }}>
                    Trusted
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-12" style={{ background: "linear-gradient(to top, rgba(30,20,10,0.9), transparent)" }} />
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-white text-sm">{listing.species}</h3>
                  {listing.morph && (
                    <p className="text-xs text-amber-400/60 mt-0.5">{listing.morph}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-bold" style={{ color: "#d97706" }}>{listing.price}</span>
                    <span className="text-[10px] text-white/30">{listing.location}</span>
                  </div>
                  <p className="text-[10px] text-white/20 mt-2 truncate">{listing.seller}</p>
                </div>
              </motion.a>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* No results */}
      {searched && !loading && listings.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-white/30">No listings found. Try a different search.</p>
        </div>
      )}
    </div>
  );
}
