"use client";
export const dynamic = 'force-dynamic';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";

export default function MemberLoginPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/signup'); }, [router]);
  return (
    <>
      <Navigation />
      <main className="pt-24 pb-20 min-h-screen" style={{ background: "var(--ut-black)" }}>
        <div className="container-ut max-w-lg mx-auto text-center">
          <SectionReveal>
            <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>[ Redirecting ]</p>
            <h1 className="font-display text-3xl md:text-4xl mb-4">
              <ZalgoText text="Member Login" intensity="moderate" />
            </h1>
            <p className="font-body text-base" style={{ color: "var(--ut-white-dim)" }}>
              Please wait... redirecting to the member portal.
            </p>
          </SectionReveal>
        </div>
      </main>
      <Footer />
    </>
  );
}
