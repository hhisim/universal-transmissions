/**
 * Thin shared-client wrapper for the direct /oracle/mobile URL.
 *
 * /oracle/mobile used to render a 583-line divergent client that posted only
 * {message, mode, lang, speed}: no artwork or research anchor, no history, no
 * reset, no evidence, no unknown-context disclosure. Mobile visitors reached it
 * through the chooser's UA branch, so they silently lost every one of those.
 *
 * The responsive client already implements all of it and renders correctly at
 * 390px, so this route now renders THAT client. The URL keeps working (existing
 * bookmarks and links do not 404), and because it renders the client directly
 * rather than redirecting, there is no hop and no redirect-loop risk.
 */
import { Suspense } from "react";
import OraclePage from "../page-client";

/* Same shell as /oracle/desktop: the client reads ?q / ?artworkId / ?from /
   researchTopicId via useSearchParams(), which opts the route into a client-side
   bailout. Suspense keeps the route prerenderable and gives an immediate static
   shell instead of a blank frame. */
export default function OracleMobilePage() {
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