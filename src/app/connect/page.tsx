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
                    placeholder="Subject of your transmission"
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
                    className="w-full bg-transparent border px-4 py-3 font-body text-base resize-none transition-colors focus:border-[var(--ut-cyan)]"
                    style={{ borderColor: "rgba(0,229,255,0.2)", color: "var(--ut-white)" }}
                    placeholder="Your message..."
                  />
                </div>

                {status === "success" && (
                  <p className="font-body text-sm text-center p-4" style={{ color: "var(--ut-cyan)", background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.15)" }}>
                    Transmission received. We will respond within 48 hours.
                  </p>
                )}

                {status === "error" && (
                  <p className="font-body text-sm text-center p-4" style={{ color: "#ff4444", background: "rgba(255,68,68,0.05)", border: "1px solid rgba(255,68,68,0.15)" }}>
                    Signal lost. Please try again or email directly.
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

            {/* Other channels */}
            <SectionReveal delay={0.3}>
              <div className="mt-16 pt-12 border-t text-center" style={{ borderColor: "rgba(0,229,255,0.06)" }}>
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-6" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                  Other Channels
                </p>
                <div className="flex flex-wrap justify-center gap-6">
                  {[
                    {
                      label: "YouTube",
                      href: "https://www.youtube.com/@UniversalTransmissions",
                      icon: (
                        <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      ),
                    },
                    { label: "Instagram", href: "https://instagram.com" },
                    { label: "Twitter / X", href: "https://twitter.com" },
                    { label: "Vault of Arcana", href: "https://vaultofarcana.com" },
                  ].map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-heading text-xs tracking-widest uppercase hover:text-[var(--ut-cyan)] transition-colors"
                      style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}
                    >
                      {link.icon && <span className="flex items-center">{link.icon}</span>}
                      {link.label}
                    </a>
                  ))}
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
