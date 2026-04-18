"use client";

import OracleCorrespondenceDock from "@/components/oracle/OracleCorrespondenceDock";
import { codexRowCount } from "@/codex/oracle-context";

export default function CorrespondenceLattice() {
  const openOracle = (_prompt?: string) => {
    window.location.href = "/oracle";
  };

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 border border-white/10 bg-black/50 p-4">
          <div className="font-mono text-[8px] uppercase tracking-[0.28em] text-fuchsia-300/70">
            Compatibility Surface
          </div>
          <h1 className="mt-2 font-heading text-xl uppercase tracking-[0.14em] text-white/90">
            Correspondences open inside the Oracle cockpit
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
            This module is no longer a standalone destination. Matrix, symbols,
            letters, decode, clusters, and synthesis now orbit the live Oracle.
          </p>
          <button
            className="mt-4 border border-fuchsia-400/30 bg-fuchsia-400/10 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.18em] text-fuchsia-100"
            onClick={() => openOracle()}
          >
            Enter Oracle
          </button>
        </div>
        <OracleCorrespondenceDock
          color="#d946ef"
          mode="correspondence"
          rows={codexRowCount()}
          status="ready"
          lastOracleText=""
          onSeedOracle={openOracle}
          onAskOracle={openOracle}
          onSetMode={openOracle}
        />
      </div>
    </main>
  );
}
