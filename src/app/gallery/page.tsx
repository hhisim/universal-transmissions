import type { Metadata } from "next";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import GalleryClient from "./GalleryClient";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Browse the complete collection of Universal Transmissions artwork — sacred geometry, symbolic prints, and visual transmissions.",
};

export default function GalleryPage() {
  return (
    <>
      <Navigation />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
        <div className="container-ut">
          <GalleryClient />
        </div>
      </main>
      <Footer />
    </>
  );
}
