"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ServiceLoadingBar } from "@/components/service-loading-bar";

type SpotSplorePanelProps = {
  username: string;
  displayName: string;
  balanceCredits: number;
};

const SS_PURPLE = "#a855f7";
const SS_PINK = "#ec4899";
const SS_PURPLE_DIM = "rgba(168,85,247,0.15)";
const SS_CARD_BG = "rgba(15,5,25,0.85)";
const SS_CARD_BORDER = "rgba(168,85,247,0.15)";

type Genre = "Hip-Hop" | "R&B" | "Electronic" | "Alternative";

type ArtistNode = {
  id: number;
  name: string;
  genre: Genre;
  playCount: number;
  size: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number[];
  topTracks: string[];
};

const genreColors: Record<Genre, string> = {
  "Hip-Hop": "#a855f7",
  "R&B": "#ec4899",
  Electronic: "#3b82f6",
  Alternative: "#22c55e",
};

const genreLegend: { genre: Genre; color: string }[] = [
  { genre: "Hip-Hop", color: genreColors["Hip-Hop"] },
  { genre: "R&B", color: genreColors["R&B"] },
  { genre: "Electronic", color: genreColors.Electronic },
  { genre: "Alternative", color: genreColors.Alternative },
];

function buildArtists(): ArtistNode[] {
  const raw: { name: string; genre: Genre; playCount: number; topTracks: string[] }[] = [
    { name: "Drake", genre: "Hip-Hop", playCount: 2840, topTracks: ["God's Plan", "One Dance", "Hotline Bling"] },
    { name: "Kendrick Lamar", genre: "Hip-Hop", playCount: 2510, topTracks: ["HUMBLE.", "DNA.", "Money Trees"] },
    { name: "Travis Scott", genre: "Hip-Hop", playCount: 1920, topTracks: ["SICKO MODE", "goosebumps", "Antidote"] },
    { name: "Future", genre: "Hip-Hop", playCount: 1680, topTracks: ["Mask Off", "March Madness", "Codeine Crazy"] },
    { name: "Metro Boomin", genre: "Hip-Hop", playCount: 1450, topTracks: ["Superhero", "Creepin'", "Too Many Nights"] },
    { name: "Lil Baby", genre: "Hip-Hop", playCount: 1320, topTracks: ["Drip Too Hard", "Emotionally Scarred", "Woah"] },
    { name: "The Weeknd", genre: "R&B", playCount: 2680, topTracks: ["Blinding Lights", "Starboy", "Save Your Tears"] },
    { name: "SZA", genre: "R&B", playCount: 2150, topTracks: ["Kill Bill", "Good Days", "Kiss Me More"] },
    { name: "Frank Ocean", genre: "R&B", playCount: 1890, topTracks: ["Nights", "Pink + White", "Ivy"] },
    { name: "Daft Punk", genre: "Electronic", playCount: 1560, topTracks: ["Get Lucky", "Around the World", "One More Time"] },
    { name: "Tame Impala", genre: "Electronic", playCount: 1380, topTracks: ["The Less I Know", "Feels Like We Only Go Backwards", "Let It Happen"] },
    { name: "Arctic Monkeys", genre: "Alternative", playCount: 1720, topTracks: ["Do I Wanna Know?", "R U Mine?", "505"] },
    { name: "Radiohead", genre: "Alternative", playCount: 1480, topTracks: ["Creep", "Karma Police", "No Surprises"] },
    { name: "Gunna", genre: "Alternative", playCount: 1250, topTracks: ["pushin P", "drip or drown", "Skybox"] },
    { name: "Tyler, the Creator", genre: "Alternative", playCount: 1850, topTracks: ["EARFQUAKE", "See You Again", "NEW MAGIC WAND"] },
    { name: "Kanye West", genre: "Alternative", playCount: 2320, topTracks: ["Stronger", "Runaway", "Power"] },
  ];

  const maxPlay = Math.max(...raw.map((a) => a.playCount));
  return raw.map((a, i) => ({
    id: i,
    name: a.name,
    genre: a.genre,
    playCount: a.playCount,
    size: 8 + (a.playCount / maxPlay) * 22,
    x: 100 + Math.random() * 500,
    y: 80 + Math.random() * 320,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    connections: [],
    topTracks: a.topTracks,
  }));
}

function buildConnections(artists: ArtistNode[]) {
  for (const a of artists) {
    const sameGenre = artists.filter((b) => b.id !== a.id && b.genre === a.genre);
    a.connections = sameGenre.slice(0, 3).map((b) => b.id);
  }
}

type DiscoveryResult = {
  vibe: string;
  moodScore: number;
  tracks: { title: string; artist: string; year: number; why: string }[];
  artists: string[];
  places: { name: string; type: string; vibe: string; address?: string }[];
  playlist_name: string;
  spotify_search: string;
};

export function SpotSplorePanel({ displayName, balanceCredits }: SpotSplorePanelProps) {
  const [connected, setConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredArtist, setHoveredArtist] = useState<ArtistNode | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<ArtistNode | null>(null);

  // Vibe discovery state
  const [vibeInput, setVibeInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [balance, setBalance] = useState(balanceCredits);

  async function handleDiscover() {
    if (!vibeInput.trim()) return;
    setDiscoverLoading(true);
    setDiscoverError(null);
    try {
      const res = await fetch("/api/services/spot-splore/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibe: vibeInput, location: locationInput }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Discovery failed");

      // Deduct Leafs
      const spendRes = await fetch("/api/wallet/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 5, description: `Spot Splore \u2014 ${vibeInput.slice(0, 30)}`, serviceId: "spot-splore" }),
      });
      const spendData = await spendRes.json();
      if (spendData.ok) {
        setBalance(spendData.newBalance);
        window.dispatchEvent(new CustomEvent("eden:balance-updated", { detail: { newBalance: spendData.newBalance } }));
      }

      setDiscovery(data.discovery);
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setDiscoverLoading(false);
    }
  }
  const [artists] = useState<ArtistNode[]>(() => {
    const nodes = buildArtists();
    buildConnections(nodes);
    return nodes;
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 });

  const filteredIds = searchQuery.trim()
    ? new Set(
        artists
          .filter(
            (a) =>
              a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.genre.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .map((a) => a.id),
      )
    : null;

  const drawConstellation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    // Update positions
    for (const a of artists) {
      a.x += a.vx;
      a.y += a.vy;
      if (a.x < a.size || a.x > W - a.size) a.vx *= -1;
      if (a.y < a.size || a.y > H - a.size) a.vy *= -1;
      a.x = Math.max(a.size, Math.min(W - a.size, a.x));
      a.y = Math.max(a.size, Math.min(H - a.size, a.y));
    }

    ctx.clearRect(0, 0, W, H);

    // Draw connections
    for (const a of artists) {
      for (const connId of a.connections) {
        const b = artists[connId];
        const dimmed = filteredIds && !filteredIds.has(a.id) && !filteredIds.has(b.id);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = dimmed ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Draw artist nodes
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    let newHovered: ArtistNode | null = null;

    for (const a of artists) {
      const dimmed = filteredIds && !filteredIds.has(a.id);
      const color = genreColors[a.genre];
      const dist = Math.sqrt((mx - a.x) ** 2 + (my - a.y) ** 2);
      const isHover = dist < a.size + 4;
      const isSelected = selectedArtist?.id === a.id;

      if (isHover) newHovered = a;

      // Glow
      if (!dimmed) {
        const glow = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, a.size * 2.5);
        glow.addColorStop(0, `${color}20`);
        glow.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      // Node
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.size, 0, Math.PI * 2);
      ctx.fillStyle = dimmed ? `${color}15` : isSelected ? color : `${color}aa`;
      ctx.fill();

      if (isHover || isSelected) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Label on hover
      if (isHover || isSelected) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(a.name, a.x, a.y - a.size - 8);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "10px sans-serif";
        ctx.fillText(`${a.playCount.toLocaleString()} plays`, a.x, a.y - a.size + 4);
      }
    }

    // Draw satellite tracks for selected artist
    if (selectedArtist) {
      const sa = artists[selectedArtist.id];
      const trackRadius = sa.size + 35;
      for (let i = 0; i < sa.topTracks.length; i++) {
        const angle = (Math.PI * 2 * i) / sa.topTracks.length - Math.PI / 2;
        const tx = sa.x + Math.cos(angle) * trackRadius;
        const ty = sa.y + Math.sin(angle) * trackRadius;

        ctx.beginPath();
        ctx.setLineDash([2, 2]);
        ctx.moveTo(sa.x, sa.y);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(tx, ty, 4, 0, Math.PI * 2);
        ctx.fillStyle = genreColors[sa.genre];
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(sa.topTracks[i], tx, ty + 14);
      }
    }

    setHoveredArtist(newHovered);
    animationRef.current = requestAnimationFrame(drawConstellation);
  }, [artists, filteredIds, selectedArtist]);

  useEffect(() => {
    if (!connected) return;
    animationRef.current = requestAnimationFrame(drawConstellation);
    return () => cancelAnimationFrame(animationRef.current);
  }, [connected, drawConstellation]);

  function handleCanvasMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleCanvasClick() {
    if (hoveredArtist) {
      setSelectedArtist(selectedArtist?.id === hoveredArtist.id ? null : hoveredArtist);
    } else {
      setSelectedArtist(null);
    }
  }

  const totalArtists = artists.length;
  const totalTracks = artists.reduce((sum, a) => sum + a.topTracks.length, 0);
  const totalGenres = new Set(artists.map((a) => a.genre)).size;

  const inputCls =
    "w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition bg-[rgba(168,85,247,0.04)] border border-[rgba(168,85,247,0.15)] focus:border-[rgba(168,85,247,0.45)] focus:shadow-[0_0_0_3px_rgba(168,85,247,0.1)]";

  return (
    <div className="relative min-h-screen" style={{ backgroundColor: "#0a0514" }}>
      <ServiceLoadingBar loading={discoverLoading} />
      {/* Top nav */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link
          href="/consumer"
          className="text-xs uppercase tracking-[0.14em] transition-colors hover:text-white"
          style={{ color: SS_PURPLE }}
        >
          &#8592; Eden
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">{displayName}</span>
          <span
            className="rounded-full px-3 py-1 font-mono text-xs font-semibold text-white"
            style={{ border: `1px solid ${SS_CARD_BORDER}`, background: SS_PURPLE_DIM }}
          >
            🍃 {balanceCredits.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-5"
        >
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-bold"
            style={{
              background: "radial-gradient(circle at 35% 25%, rgba(168,85,247,0.2), rgba(10,5,20,0.97))",
              border: `2px solid ${SS_PURPLE}`,
              color: SS_PURPLE,
              boxShadow: "0 0 24px -4px rgba(168,85,247,0.35)",
            }}
          >
            SS
          </div>
          <div>
            <h1 className="text-3xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
              <span style={{ color: SS_PURPLE }}>Spot</span> Splore
            </h1>
            <p className="mt-1 text-sm text-white/50">Explore your sound universe.</p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {!connected ? (
            <motion.div
              key="pre-connect"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="mt-10"
            >
              {/* Blurred preview background */}
              <div
                className="relative overflow-hidden rounded-[20px]"
                style={{ background: SS_CARD_BG, border: `1px solid ${SS_CARD_BORDER}` }}
              >
                {/* Mock blurred constellation */}
                <div className="relative h-[320px] overflow-hidden">
                  <div className="absolute inset-0" style={{ filter: "blur(8px)", opacity: 0.4 }}>
                    {artists.slice(0, 10).map((a) => (
                      <div
                        key={a.id}
                        className="absolute rounded-full"
                        style={{
                          width: a.size * 2,
                          height: a.size * 2,
                          left: `${(a.x / 700) * 100}%`,
                          top: `${(a.y / 400) * 100}%`,
                          background: `radial-gradient(circle, ${genreColors[a.genre]}80, transparent)`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-lg font-semibold text-white/80">
                      Visualize your listening history as a living universe
                    </p>
                    <button
                      type="button"
                      onClick={() => setConnected(true)}
                      className="mt-6 rounded-xl px-8 py-3.5 text-sm font-semibold text-white transition-all hover:scale-105"
                      style={{
                        background: `linear-gradient(135deg, ${SS_PURPLE}, ${SS_PINK})`,
                        boxShadow: `0 4px 24px -4px rgba(168,85,247,0.5)`,
                      }}
                    >
                      Connect Spotify
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="post-connect"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6"
            >
              {/* Search */}
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artists or genres..."
                className={inputCls}
              />

              {/* Stats bar */}
              <div className="mt-4 flex items-center gap-4 text-xs text-white/40">
                <span>{totalArtists} Artists</span>
                <span className="text-white/15">·</span>
                <span>{totalTracks} Tracks</span>
                <span className="text-white/15">·</span>
                <span>{totalGenres} Genres</span>
                <div className="ml-auto flex items-center gap-3">
                  {genreLegend.map((g) => (
                    <span key={g.genre} className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: g.color }}
                      />
                      <span>{g.genre}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Constellation canvas */}
              <div
                className="mt-4 overflow-hidden rounded-[20px]"
                style={{ background: SS_CARD_BG, border: `1px solid ${SS_CARD_BORDER}` }}
              >
                <canvas
                  ref={canvasRef}
                  className="h-[460px] w-full cursor-pointer"
                  style={{ display: "block" }}
                  onMouseMove={handleCanvasMouseMove}
                  onClick={handleCanvasClick}
                />
              </div>

              {/* Action button */}
              <button
                type="button"
                className="mt-4 w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all"
                style={{
                  background: `linear-gradient(135deg, ${SS_PURPLE}, ${SS_PINK})`,
                }}
              >
                Explore My Universe — 50 🍃
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vibe Discovery — works without Spotify */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 space-y-4"
        >
          <div className="rounded-[20px] p-5" style={{ background: SS_CARD_BG, border: `1px solid ${SS_CARD_BORDER}` }}>
            <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: SS_PURPLE }}>Vibe Discovery</p>
            <p className="mt-1 text-xs text-white/40">Describe a vibe — get real music and places that match</p>

            <textarea
              value={vibeInput}
              onChange={(e) => setVibeInput(e.target.value)}
              placeholder="late night drive through the city..."
              rows={2}
              className="mt-3 w-full resize-none rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition"
              style={{ background: "rgba(168,85,247,0.05)", border: `1px solid ${SS_CARD_BORDER}` }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleDiscover(); } }}
            />
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Your city (optional)"
              className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none transition"
              style={{ background: "rgba(168,85,247,0.03)", border: `1px solid rgba(168,85,247,0.08)` }}
            />
            <button
              type="button"
              onClick={handleDiscover}
              disabled={!vibeInput.trim() || discoverLoading}
              className="mt-3 w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all disabled:opacity-30"
              style={{ background: `linear-gradient(135deg, ${SS_PURPLE}, ${SS_PINK})` }}
            >
              {discoverLoading ? "Discovering..." : "Discover — 5 🍃"}
            </button>
            {discoverError && <p className="mt-2 text-center text-xs text-red-400/70">{discoverError}</p>}
          </div>

          {discovery && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Playlist header */}
              <div className="rounded-[20px] p-5" style={{ background: SS_CARD_BG, border: `1px solid ${SS_CARD_BORDER}` }}>
                <p className="text-lg font-bold text-white">{discovery.playlist_name}</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full" style={{ background: "rgba(168,85,247,0.1)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${discovery.moodScore}%`, background: `linear-gradient(90deg, ${SS_PURPLE}, ${SS_PINK})` }}
                    />
                  </div>
                  <span className="text-xs text-white/40">Mood: {discovery.moodScore}/100</span>
                </div>
                {discovery.spotify_search && (
                  <a
                    href={`https://open.spotify.com/search/${encodeURIComponent(discovery.spotify_search)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                    style={{ background: "#1DB954", color: "white" }}
                  >
                    Open in Spotify
                  </a>
                )}
              </div>

              {/* Tracks */}
              <div className="space-y-2">
                {discovery.tracks?.map((track, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: SS_CARD_BG, border: `1px solid ${SS_CARD_BORDER}` }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{track.title}</p>
                        <p className="text-xs text-white/50">{track.artist} {track.year ? `(${track.year})` : ""}</p>
                      </div>
                      <span className="text-[10px] text-white/20">#{i + 1}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-white/30 italic">{track.why}</p>
                  </div>
                ))}
              </div>

              {/* Places */}
              {discovery.places?.length > 0 && (
                <div className="rounded-[20px] p-5" style={{ background: SS_CARD_BG, border: `1px solid ${SS_CARD_BORDER}` }}>
                  <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: SS_PINK }}>Places that match</p>
                  <div className="mt-3 space-y-3">
                    {discovery.places.map((place, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span
                          className="mt-1 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase"
                          style={{ background: "rgba(236,72,153,0.1)", color: SS_PINK, border: "1px solid rgba(236,72,153,0.2)" }}
                        >
                          {place.type}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-white">{place.name}</p>
                          <p className="text-xs text-white/40">{place.vibe}</p>
                          {place.address && <p className="text-[10px] text-white/20">{place.address}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Artists */}
              {discovery.artists?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {discovery.artists.map((artist, i) => (
                    <span key={i} className="rounded-full px-3 py-1 text-xs text-white/50"
                      style={{ background: "rgba(168,85,247,0.08)", border: `1px solid ${SS_CARD_BORDER}` }}
                    >
                      {artist}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-center text-[10px] text-white/15">
                Powered by Claude + Live Web Data
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
