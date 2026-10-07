import { Suspense } from "react";
import OraclePage from "../page-client";

/* The client reads ?q / ?artworkId / ?from via useSearchParams(), which opts the
   route into a client-side bailout. Suspense keeps /oracle/desktop prerenderable
   and gives the console an immediate, static shell instead of a blank frame. */
export default function OracleDesktopPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: "100vh",
            background: "#020103",
            color: "rgba(237,233,246,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
          }}
        >
          <span role="status" aria-live="polite">Establishing the Oracle link…</span>
        </main>
      }
    >
      <OraclePage />
    </Suspense>
  );
}
