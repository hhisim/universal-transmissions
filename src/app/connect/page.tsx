"use client";

import { useState } from "react";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";

export default function ConnectPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("success");
        setForm({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <Navigation />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
        <div className="container-ut">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <SectionReveal>
              <div className="text-center mb-16 pt-8">
                <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-cyan)" }}>
                  [ Open Channel ]
                </p>
                <h1 className="font-display text-4xl md:text-6xl glow-cyan mb-4">
                  <ZalgoText text="Connect" intensity="moderate" />
                </h1>
                <p className="font-body text-lg" style={{ color: "var(--ut-white-dim)" }}>
                  Open a channel. All transmissions are received.
                </p>
              </div>
            </SectionReveal>

            {/* Form */}
            <SectionReveal delay={0.2}>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-mono text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                      Name
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full bg-transparent border px-4 py-3 font-body text-base transition-colors focus:border-[var(--ut-cyan)]"
                      style={{ borderColor: "rgba(0,229,255,0.2)", color: "var(--ut-white)" }}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full bg-transparent border px-4 py-3 font-body text-base transition-colors focus:border-[var(--ut-cyan)]"
                      style={{ borderColor: "rgba(0,229,255,0.2)", color: "var(--ut-white)" }}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    className="w-full bg-transparent border px-4 py-3 font-body text-base transition-colors focus:border-[var(--ut-cyan)]"
                    style={{ borderColor: "rgba(0,229,255,0.2)", color: "var(--ut-white)" }}
                    placeholder="Subject"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] tracking-[0.2em] uppercase mb-2" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                    Message
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                    className="w-full bg-transparent border px-4 py-3 font-body text-base transition-colors focus:border-[var(--ut-cyan)] resize-none"
                    style={{ borderColor: "rgba(0,229,255,0.2)", color: "var(--ut-white)" }}
                    placeholder="Your transmission..."
                  />
                </div>

                <div className="flex flex-col items-center gap-4">
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="btn-primary disabled:opacity-50"
                  >
                    {status === "sending" ? "Transmitting..." : "Send Transmission"}
                  </button>
                  {status === "success" && (
                    <p className="font-mono text-xs" style={{ color: "var(--ut-cyan)" }}>
                      ✓ Transmission received. We will respond.
                    </p>
                  )}
                  {status === "error" && (
                    <p className="font-mono text-xs" style={{ color: "#f87171" }}>
                      ✗ Something went wrong. Try again.
                    </p>
                  )}
                </div>
              </form>
            </SectionReveal>

            {/* Social links */}
            <SectionReveal delay={0.4}>
              <div className="mt-16 text-center">
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-6" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                  Or find us on
                </p>
                <div className="flex justify-center gap-6">
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs tracking-widest uppercase hover:text-[var(--ut-magenta)] transition-colors"
                    style={{ color: "var(--ut-white-dim)" }}
                  >
                    Instagram
                  </a>
                  <a
                    href="https://twitter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs tracking-widest uppercase hover:text-[var(--ut-magenta)] transition-colors"
                    style={{ color: "var(--ut-white-dim)" }}
                  >
                    X / Twitter
                  </a>
                  <a
                    href="https://discord.gg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs tracking-widest uppercase hover:text-[var(--ut-magenta)] transition-colors"
                    style={{ color: "var(--ut-white-dim)" }}
                  >
                    Discord
                  </a>
                </div>
              </div>
            </SectionReveal>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
