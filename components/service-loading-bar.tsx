"use client";

import { useEffect, useState } from "react";

export function ServiceLoadingBar({ loading }: { loading: boolean }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) {
      setVisible(true);
      setProgress(0);
      const t1 = setTimeout(() => setProgress(30), 100);
      const t2 = setTimeout(() => setProgress(60), 800);
      const t3 = setTimeout(() => setProgress(85), 2000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    } else {
      setProgress(100);
      const t = setTimeout(() => { setVisible(false); setProgress(0); }, 400);
      return () => clearTimeout(t);
    }
  }, [loading]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        zIndex: 9999,
        background: "rgba(0,0,0,0.1)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, #2dd4bf, #06b6d4)",
          transition: progress === 100 ? "width 0.2s ease" : "width 0.6s ease",
          boxShadow: "0 0 8px rgba(45,212,191,0.6)",
        }}
      />
    </div>
  );
}
