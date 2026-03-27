"use client";

import { useState } from "react";
import { PayWithEden } from "@/components/pay-with-eden";

type EmbedServiceClientProps = {
  serviceId: string;
  meta: { name: string; leafCost: number; description: string };
};

export function EmbedServiceClient({ serviceId, meta }: EmbedServiceClientProps) {
  const [lastResult, setLastResult] = useState<string | null>(null);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#0b1622", color: "white", fontFamily: "system-ui, sans-serif" }}
    >
      {/* Service header */}
      <div className="p-6">
        <h1 className="text-xl font-semibold text-white">{meta.name}</h1>
        <p className="mt-1 text-sm text-white/50">{meta.description}</p>
      </div>

      {/* Service content area */}
      <div className="flex-1 px-6">
        <div
          className="rounded-xl p-6"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <p className="text-sm text-white/40">
            Use the buttons below to run {meta.name}. Payment is handled securely through Eden.
          </p>

          {lastResult && (
            <div
              className="mt-4 rounded-lg p-4"
              style={{ background: "rgba(45,212,191,0.06)", border: "1px solid rgba(45,212,191,0.12)" }}
            >
              <p className="text-xs text-[#2dd4bf]/70">Service completed successfully</p>
            </div>
          )}
        </div>

        {/* Payment buttons */}
        <div className="mt-4">
          <PayWithEden
            serviceId={serviceId}
            serviceName={meta.name}
            leafCost={meta.leafCost}
            onSuccess={() => setLastResult("success")}
          />
        </div>
      </div>

      {/* Watermark */}
      <div className="p-4 text-center">
        <span className="text-[10px] text-white/15">
          Powered by Eden
        </span>
      </div>
    </div>
  );
}
