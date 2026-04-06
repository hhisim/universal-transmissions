"use client";

import { useState } from "react";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";

export default function ConnectPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      console.log("[connect] API response:", res.status, data);
      if (res.ok) {
        setStatus("success");
        setForm({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus("error");
        setErrorMsg(data.error || `Error ${res.status}: Something went wrong.`);
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg("Connection failed. Please try again.");
    }
  }

  return (
    <>
      {/* Full-page animation — fixed behind everything */}
      <PageBackground variant="connect" opacity={0.65} />

      <Navigation />

      <main
        className="min-h-screen flex flex-col items-center justify-center px-4 py-24 relative"
        style={{ background: "transparent", zIndex: 1 }}
      >
        {/* Header */}
        <div className="w-full max-w-2xl mb-8">
          <SectionReveal>
            <div className="text-center">
              <p
                className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3"
                style={{ color: "var(--ut-cyan)" }}
              >
                [ Open Channel ]
              </p>
              <h1
                className="font-display text-4xl md:text-6xl glow-cyan mb-4"
                style={{ color: "var(--ut-white)" }}
              >
                <ZalgoText text="Connect" intensity="moderate" />
              </h1>
              <p
                className="font-body text-base"
                style={{ color: "var(--ut-white-dim)" }}
              >
                Open a channel. All transmissions are received.
              </p>
            </div>
          </SectionReveal>
        </div>

        {/* Form — no background card, transparent */}
        <div className="w-full max-w-2xl">
          <SectionReveal delay={0.15}>
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label
                    className="block font-mono text-[10px] tracking-[0.2em] uppercase mb-2"
                    style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}
                  >
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full bg-transparent border px-4 py-3 font-body text-base transition-colors focus:border-[var(--ut-cyan)] outline-none"
                    style={{ borderColor: "rgba(0,229,255,0.2)", color: "var(--ut-white)" }}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label
                    className="block font-mono text-[10px] tracking-[0.2em] uppercase mb-2"
                    style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full bg-transparent border px-4 py-3 font-body text-base transition-colors focus:border-[var(--ut-cyan)] outline-none"
                    style={{ borderColor: "rgba(0,229,255,0.2)", color: "var(--ut-white)" }}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block font-mono text-[10px] tracking-[0.2em] uppercase mb-2"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}
                >
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full bg-transparent border px-4 py-3 font-body text-base transition-colors focus:border-[var(--ut-cyan)] outline-none"
                  style={{ borderColor: "rgba(0,229,255,0.2)", color: "var(--ut-white)" }}
                  placeholder="Subject"
                />
              </div>

              <div>
                <label
                  className="block font-mono text-[10px] tracking-[0.2em] uppercase mb-2"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}
                >
                  Message
                </label>
                <textarea
                  required
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className="w-full bg-transparent border px-4 py-3 font-body text-base resize-none transition-colors focus:border-[var(--ut-cyan)] outline-none"
                  style={{ borderColor: "rgba(0,229,255,0.2)", color: "var(--ut-white)" }}
                  placeholder="Your transmission..."
                />
              </div>

              {status === "success" && (
                <p
                  className="font-body text-sm text-center p-4"
                  style={{
                    color: "var(--ut-cyan)",
                    background: "rgba(0,229,255,0.05)",
                    border: "1px solid rgba(0,229,255,0.15)",
                  }}
                >
                  Transmission received. We will respond within 48 hours.
                </p>
              )}

              {status === "error" && (
                <p
                  className="font-body text-sm text-center p-4"
                  style={{
                    color: "#ff4444",
                    background: "rgba(255,68,68,0.05)",
                    border: "1px solid rgba(255,68,68,0.15)",
                  }}
                >
                  {errorMsg || "Signal lost. Please try again or email directly."}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full btn-primary justify-center text-base py-4"
              >
                {status === "sending" ? "Transmitting..." : "Send Transmission"}
              </button>
            </form>
          </SectionReveal>

          {/* Social Media */}
          <SectionReveal delay={0.3}>
            <div
              className="mt-12 pt-10 border-t text-center"
              style={{ borderColor: "rgba(0,229,255,0.06)" }}
            >
              <p
                className="font-mono text-[10px] tracking-[0.3em] uppercase mb-6"
                style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}
              >
                Other Channels
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                <a
                  href="https://www.youtube.com/@HakanHisim"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-heading text-xs tracking-widest uppercase"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#ff0000" }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  YouTube
                </a>
                <a
                  href="https://www.instagram.com/hakanhisim/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-heading text-xs tracking-widest uppercase"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#e1306c" }}>
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                  </svg>
                  Instagram
                </a>
                <a
                  href="https://vaultofarcana.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-heading text-xs tracking-widest uppercase"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--ut-magenta)" }}>
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  Vault of Arcana
                </a>
                <a
                  href="https://www.hakanhisim.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 font-heading text-xs tracking-widest uppercase"
                  style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--ut-cyan)" }}>
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"/>
                  </svg>
                  hakanhisim.net
                </a>
              </div>
            </div>
          </SectionReveal>
        </div>
      </main>

      <Footer />
    </>
  );
}
