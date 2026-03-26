"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { getProduct } from "@/data/products";
import PageBackground from "@/components/scenes/PageBackground";

interface Props {
  params: { slug: string };
}

export default function ProductDetailPage({ params }: Props) {
  const product = getProduct(params.slug);
  if (!product) notFound();

  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal">("stripe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout() {
    setLoading(true);
    setError("");
    try {
      if (paymentMethod === "stripe") {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product!.id }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setError(data.error || "Failed to start checkout. Please try again.");
      } else {
        const res = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product!.id }),
        });
        const data = await res.json();
        if (data.orderId) {
          window.location.href = `https://www.paypal.com/checkoutnow?token=${data.orderId}`;
          return;
        }
        setError(data.error || "Failed to start PayPal. Please try again.");
      }
    } catch {
      setError("Connection error. Please check your internet and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navigation />
     
      <PageBackground variant="homepage" /> <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
        <div className="container-ut">
          {/* Breadcrumb */}
          <SectionReveal>
            <div className="flex items-center gap-2 mb-8 font-mono text-[10px] pt-8" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
              <Link href="/store" className="hover:text-[var(--ut-cyan)] transition-colors">Store</Link>
              <span>/</span>
              <span>{product.title}</span>
            </div>
          </SectionReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Image */}
            <SectionReveal direction="left">
              <div className="relative aspect-square glow-border-gold" style={{ borderColor: "rgba(212,168,71,0.2)" }}>
                <Image src={product.images[0]} alt={product.title} fill className="object-cover" priority sizes="(max-width: 1024px) 100vw, 50vw" />
              </div>
            </SectionReveal>

            {/* Info + Checkout */}
            <SectionReveal direction="right" delay={0.15}>
              <div>
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                  {product.category}
                </p>
                <h1 className="font-display text-3xl md:text-4xl mb-4" style={{ color: "var(--ut-gold)" }}>
                  <ZalgoText text={product.title} intensity="subtle" />
                </h1>

                <div className="sacred-divider mb-8" />

                <p className="font-body text-lg leading-relaxed mb-8" style={{ color: "var(--ut-white-dim)" }}>
                  {product.description}
                </p>

                {/* Price */}
                <div className="mb-8">
                  <p className="font-display text-4xl" style={{ color: "var(--ut-gold)" }}>
                    ${product.price}
                  </p>
                  {product.originalPrice && (
                    <p className="font-mono text-sm line-through mt-1" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                      ${product.originalPrice}
                    </p>
                  )}
                </div>

                {/* Payment method selector */}
                <div className="mb-6">
                  <p className="font-mono text-[10px] tracking-[0.2em] uppercase mb-3" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                    Payment Method
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setPaymentMethod("stripe")}
                      className={`font-mono text-xs tracking-widest uppercase px-4 py-2 border transition-all ${paymentMethod === "stripe" ? "border-[var(--ut-cyan)] text-[var(--ut-cyan)]" : "border-white/20 text-white/40"}`}
                    >
                      💳 Stripe
                    </button>
                    <button
                      onClick={() => setPaymentMethod("paypal")}
                      className={`font-mono text-xs tracking-widest uppercase px-4 py-2 border transition-all ${paymentMethod === "paypal" ? "border-[var(--ut-gold)] text-[var(--ut-gold)]" : "border-white/20 text-white/40"}`}
                    >
                      ᵖᵃʸ PayPal
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <p
                    className="font-body text-sm text-center p-3 mb-4"
                    style={{
                      color: "#ff4444",
                      background: "rgba(255,68,68,0.06)",
                      border: "1px solid rgba(255,68,68,0.2)",
                    }}
                  >
                    {error}
                  </p>
                )}

                {/* Checkout button */}
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full btn-gold justify-center text-base py-4"
                >
                  {loading ? "Processing..." : `Purchase for $${product.price}`}
                </button>

                <p className="font-mono text-[9px] text-center mt-3" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                  Secure checkout · Instant download or mail delivery
                </p>
              </div>
            </SectionReveal>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
