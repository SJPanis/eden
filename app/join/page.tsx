"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function JoinRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      try { sessionStorage.setItem("eden_pending_referral", ref); } catch {}
      router.replace(`/auth?ref=${encodeURIComponent(ref)}`);
    } else {
      router.replace("/auth");
    }
  }, [searchParams, router]);

  return null;
}

export default function JoinPage() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#0b1622" }}>
      <p className="text-sm text-white/40">Redirecting to Eden...</p>
      <Suspense>
        <JoinRedirect />
      </Suspense>
    </div>
  );
}
