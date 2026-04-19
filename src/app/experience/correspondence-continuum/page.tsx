"use client";

import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";

export default function CorrespondenceContinuumPage() {
  return (
    <>
      <Navigation />
      <div style={{ paddingTop: "64px", minHeight: "100vh", background: "#02020a" }}>
        <iframe
          src="https://codex-deploy-phi.vercel.app"
          title="Correspondence Continuum"
          style={{
            width: "100%",
            height: "calc(100vh - 64px)",
            border: "none",
            display: "block",
          }}
          allow="microphone; autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
        />
      </div>
      <Footer />
    </>
  );
}
