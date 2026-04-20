import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xenolinguistic Cymatic Engine — Universal Transmissions",
  description:
    "An interactive Chladni plate simulator — xenolinguistic glyphs, sacred geometry, and cymatic field generation. Built with Three.js and Web Audio.",
};

export default function XenolinguisticCymaticPage() {
  return (
    <>
<div className="relative w-full" style={{ height: "calc(100vh - 64px)" }}>
        <iframe
          src="/xenolinguistic-cymatic.html"
          title="Xenolinguistic Cymatic Engine"
          className="w-full h-full border-0"
          allow="microphone; autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
</>
  );
}
