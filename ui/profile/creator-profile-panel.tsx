"use client";

import { motion } from "framer-motion";

type CreatorProfilePanelProps = {
  username: string;
  displayName: string;
  role: "consumer" | "business" | "owner";
  joinedAt: string;
  publishedServices: number;
  totalLeafsEarned: number;
  membersReferred: number;
};

const roleColors: Record<string, { color: string; border: string; bg: string }> = {
  consumer: { color: "rgba(45,212,191,0.85)", border: "rgba(45,212,191,0.3)", bg: "rgba(45,212,191,0.08)" },
  business: { color: "rgba(168,85,247,0.85)", border: "rgba(168,85,247,0.3)", bg: "rgba(168,85,247,0.08)" },
  owner: { color: "rgba(245,158,11,0.85)", border: "rgba(245,158,11,0.3)", bg: "rgba(245,158,11,0.08)" },
};

const roleLabels: Record<string, string> = {
  consumer: "Consumer",
  business: "Innovator",
  owner: "Owner",
};

const mockActivity = [
  { icon: "&#9889;", label: "Joined Eden", date: "Mar 2026", type: "join" },
  { icon: "&#128230;", label: "Published first service", date: "Mar 2026", type: "service" },
  { icon: "&#128101;", label: "Referred a new member", date: "Mar 2026", type: "referral" },
];

export function CreatorProfilePanel({
  username,
  displayName,
  role,
  joinedAt,
  publishedServices,
  totalLeafsEarned,
  membersReferred,
}: CreatorProfilePanelProps) {
  const rc = roleColors[role] ?? roleColors.consumer;
  const joinDate = new Date(joinedAt);
  const joinLabel = joinDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const initial = displayName.charAt(0).toUpperCase();

  const stats = [
    { label: "Services Published", value: publishedServices },
    { label: "Total Leafs Earned", value: totalLeafsEarned.toLocaleString() },
    { label: "Members Referred", value: membersReferred },
  ];

  return (
    <div className="relative z-10 mx-auto max-w-2xl px-4 pb-16">
      {/* Cover gradient */}
      <div
        className="h-32 rounded-t-[24px]"
        style={{
          background: "linear-gradient(135deg, rgba(45,212,191,0.2) 0%, rgba(11,22,34,0.95) 60%, rgba(45,212,191,0.08) 100%)",
          border: "1px solid rgba(45,212,191,0.1)",
          borderBottom: "none",
        }}
      />

      {/* Profile card */}
      <div
        className="relative -mt-12 rounded-b-[24px] rounded-t-none px-6 pb-6 pt-16 backdrop-blur-xl"
        style={{
          background: "rgba(13,30,46,0.85)",
          border: "1px solid rgba(45,212,191,0.1)",
          borderTop: "none",
          boxShadow: "0 4px 32px -8px rgba(0,0,0,0.5)",
        }}
      >
        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute -top-10 left-6 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
          style={{
            background: "rgba(13,30,46,0.95)",
            border: "3px solid #2dd4bf",
            boxShadow: "0 0 20px rgba(45,212,191,0.25)",
          }}
        >
          {initial}
        </motion.div>

        {/* Name + role */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <h1 className="text-xl font-semibold text-white">{displayName}</h1>
          <p className="mt-0.5 text-sm text-white/40">@{username}</p>
          <div className="mt-2 flex items-center gap-3">
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: rc.color, border: `1px solid ${rc.border}`, background: rc.bg }}
            >
              {roleLabels[role] ?? role}
            </span>
            <span className="font-mono text-[11px] text-white/30">Joined {joinLabel}</span>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="mt-6 flex gap-3"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex-1 rounded-2xl px-3 py-3 text-center backdrop-blur-sm"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p className="text-lg font-semibold text-white">{stat.value}</p>
              <p className="mt-0.5 text-[10px] text-white/35">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Published Services */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="mt-6 rounded-[20px] p-5"
        style={{
          background: "rgba(13,30,46,0.78)",
          border: "1px solid rgba(45,212,191,0.1)",
        }}
      >
        <p className="text-xs uppercase tracking-[0.14em] text-white/40">Published Services</p>
        {publishedServices > 0 ? (
          <p className="mt-3 text-sm text-white/50">
            {publishedServices} service{publishedServices !== 1 ? "s" : ""} published on Eden.
          </p>
        ) : (
          <p className="mt-4 text-center text-sm text-white/30 italic">
            No services published yet.
          </p>
        )}
      </motion.section>

      {/* Contribution History */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="mt-4 rounded-[20px] p-5"
        style={{
          background: "rgba(13,30,46,0.78)",
          border: "1px solid rgba(45,212,191,0.1)",
        }}
      >
        <p className="text-xs uppercase tracking-[0.14em] text-white/40 mb-4">Contribution History</p>
        <div className="space-y-3">
          {mockActivity.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
                style={{ background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.12)" }}
                dangerouslySetInnerHTML={{ __html: item.icon }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/70">{item.label}</p>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-white/25">{item.date}</span>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
