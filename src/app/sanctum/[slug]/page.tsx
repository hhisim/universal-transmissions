"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound, useSearchParams } from "next/navigation";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import TranscriptionVideo from "@/components/ui/TranscriptionVideo";
import SafeTranscriptionVideo from "@/components/ui/SafeTranscriptionVideo";
import { getProduct } from "@/data/products";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import PageBackground from "@/components/scenes/PageBackground";

interface Props {
  params: { slug: string };
}

export default function ProductDetailPage({ params }: Props) {
  const product = getProduct(params.slug);
  if (!product) notFound();
  // TypeScript narrowing: ensure product is defined after notFound()
  const p = product!;

  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal">("stripe");
  const [loading, setLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCanceled, setShowCanceled] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setShowSuccess(urlParams.get("success") === "true");
    setShowCanceled(urlParams.get("canceled") === "true");
  }, []);

  const hasMultipleImages = p.images.length > 1;

  function prevImage() {
    setCurrentImageIndex((prev) => (prev === 0 ? p.images.length - 1 : prev - 1));
  }

  function nextImage() {
    setCurrentImageIndex((prev) => (prev === p.images.length - 1 ? 0 : prev + 1));
  }

  async function handleCheckout() {
    setLoading(true);
    try {
      if (paymentMethod === "stripe") {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: p.id }),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } else {
        const res = await fetch("/api/paypal/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: p.id }),
        });
        const data = await res.json();
        if (data.orderId) {
          window.location.href = `https://www.paypal.com/checkoutnow?token=${data.orderId}`;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navigation />
     
      <PageBackground variant="sanctum" /> <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
        <div className="container-ut">
          {/* Success Banner */}
          {showSuccess && (
            <SectionReveal>
              <div className="mb-8 p-6 border glow-border-cyan mt-8" style={{ borderColor: "rgba(34,211,238,0.3)", background: "rgba(34,211,238,0.05)" }}>
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle size={24} style={{ color: "var(--ut-cyan)" }} />
                  <h2 className="font-heading text-xl" style={{ color: "var(--ut-cyan)" }}>
                    <ZalgoText text="Transmission Received" intensity="subtle" />
                  </h2>
                </div>
                <p className="font-body text-base" style={{ color: "var(--ut-white-dim)" }}>
                  Your order has been confirmed. {p.id === "codex-physical" || p.id === "hexahedron-cube"
                    ? "Your order will be shipped within 10 business days. A confirmation email has been sent."
                    : "Check your email for the download link. If you don't see it, check your spam folder."}
                </p>
                <div className="mt-4">
                  <Link href="/sanctum/orders" className="btn-secondary text-xs py-2 px-4 inline-flex items-center gap-2">
                    View Order History
                  </Link>
                </div>
              </div>
            </SectionReveal>
          )}

          {/* Canceled Banner */}
          {showCanceled && (
            <SectionReveal>
              <div className="mb-8 p-6 border glow-border-gold mt-8" style={{ borderColor: "rgba(212,168,71,0.3)", background: "rgba(212,168,71,0.05)" }}>
                <div className="flex items-center gap-3">
                  <XCircle size={24} style={{ color: "var(--ut-gold)" }} />
                  <h2 className="font-heading text-xl" style={{ color: "var(--ut-gold)" }}>
                    <ZalgoText text="Transmission Interrupted" intensity="subtle" />
                  </h2>
                </div>
                <p className="font-body text-base mt-2" style={{ color: "var(--ut-white-dim)" }}>
                  Checkout was canceled. Your cart has been preserved. Return when ready.
                </p>
              </div>
            </SectionReveal>
          )}

          {/* Breadcrumb */}
          <SectionReveal>
            <div className="flex items-center gap-2 mb-8 font-mono text-[10px] pt-8" style={{ color: "var(--ut-white-dim)", opacity: 0.5 }}>
              <Link href="/sanctum" className="hover:text-[var(--ut-cyan)] transition-colors">Sanctum</Link>
              <span>/</span>
              <span>{p.title}</span>
            </div>
          </SectionReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Image Slider */}
            <SectionReveal direction="left">
              <div className="relative glow-border-gold" style={{ borderColor: "rgba(212,168,71,0.2)" }}>
                {/* Main image */}
                <div className="relative aspect-square overflow-hidden">
                  <Image
                    src={p.images[currentImageIndex]}
                    alt={`${p.title} — image ${currentImageIndex + 1}`}
                    fill
                    unoptimized={true}
                    className="object-cover"
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />

                  {/* Navigation arrows */}
                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center border glow-border-gold transition-all hover:bg-white/5"
                        style={{ borderColor: "rgba(212,168,71,0.3)", background: "rgba(10,9,14,0.7)" }}
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={20} style={{ color: "var(--ut-gold)" }} />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center border glow-border-gold transition-all hover:bg-white/5"
                        style={{ borderColor: "rgba(212,168,71,0.3)", background: "rgba(10,9,14,0.7)" }}
                        aria-label="Next image"
                      >
                        <ChevronRight size={20} style={{ color: "var(--ut-gold)" }} />
                      </button>
                    </>
                  )}
                </div>

                {/* Dot indicators */}
                {hasMultipleImages && (
                  <div className="flex justify-center gap-2 py-4">
                    {p.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className="w-2 h-2 rounded-full transition-all"
                        style={{
                          background: idx === currentImageIndex ? "var(--ut-gold)" : "rgba(212,168,71,0.2)",
                          boxShadow: idx === currentImageIndex ? "0 0 8px rgba(212,168,71,0.5)" : "none",
                        }}
                        aria-label={`Go to image ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}

                {/* Thumbnail strip */}
                {hasMultipleImages && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {p.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className="relative w-20 h-20 flex-shrink-0 overflow-hidden border-2 transition-all"
                        style={{
                          borderColor: idx === currentImageIndex ? "var(--ut-gold)" : "rgba(212,168,71,0.15)",
                        }}
                      >
                        <Image src={img} alt="" fill unoptimized={true} className="object-cover" sizes="80px" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </SectionReveal>

            {/* Info + Checkout */}
            <SectionReveal direction="right" delay={0.15}>
              <div>
                <p className="font-mono text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                  {p.category}
                </p>
                <h1 className="font-display text-3xl md:text-4xl mb-4" style={{ color: "var(--ut-gold)" }}>
                  <ZalgoText text={p.title} intensity="subtle" />
                </h1>

                <div className="sacred-divider mb-8" />

                <p className="font-body text-lg leading-relaxed mb-8" style={{ color: "var(--ut-white-dim)" }}>
                  {p.description}
                </p>

                {/* Price */}
                <div className="mb-8">
                  <p className="font-display text-4xl" style={{ color: "var(--ut-gold)" }}>
                    ${p.price}
                  </p>
                  {p.originalPrice && (
                    <p className="font-mono text-sm line-through mt-1" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                      ${p.originalPrice}
                    </p>
                  )}
                </div>

                {/* Shipping info for physical items */}
                {p.id === "codex-physical" && (
                  <div className="mb-6 p-4 border" style={{ borderColor: "rgba(212,168,71,0.15)", background: "rgba(212,168,71,0.03)" }}>
                    <p className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: "var(--ut-gold)", opacity: 0.7 }}>
                      Shipping
                    </p>
                    <p className="font-body text-sm" style={{ color: "var(--ut-white-dim)" }}>
                      $30 worldwide (AU/Asia $50) · Ships within 10 days
                    </p>
                  </div>
                )}
                {p.id === "hexahedron-cube" && (
                  <div className="mb-6 p-4 border" style={{ borderColor: "rgba(212,168,71,0.15)", background: "rgba(212,168,71,0.03)" }}>
                    <p className="font-mono text-[10px] tracking-widest uppercase mb-1" style={{ color: "var(--ut-gold)", opacity: 0.7 }}>
                      Shipping
                    </p>
                    <p className="font-body text-sm" style={{ color: "var(--ut-white-dim)" }}>
                      $20 worldwide · Requires personal inspection & signing of Certificate of Authenticity
                    </p>
                  </div>
                )}

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

                {/* Checkout button */}
                <button
                  onClick={handleCheckout}
                  disabled={loading || !p.available}
                  className="w-full btn-gold justify-center text-base py-4 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {!p.available ? "Out of Stock" : loading ? "Processing..." : `Purchase for $${p.price}`}
                </button>

                <p className="font-mono text-[9px] text-center mt-3" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                  Secure checkout · Instant download or mail delivery
                </p>

                {/* Cross-links between related products */}
                {p.slug === "chakra-4k-loop-pack" && (
                  <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(212,168,71,0.1)" }}>
                    <Link href="/sanctum/chakra-8k-loop-pack" className="font-mono text-xs tracking-widest uppercase hover:text-[var(--ut-cyan)] transition-colors" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                      Want 8K? &rarr;
                    </Link>
                  </div>
                )}
                {p.slug === "chakra-8k-loop-pack" && (
                  <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(212,168,71,0.1)" }}>
                    <Link href="/sanctum/chakra-4k-loop-pack" className="font-mono text-xs tracking-widest uppercase hover:text-[var(--ut-cyan)] transition-colors" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                      Want 4K? &rarr;
                    </Link>
                  </div>
                )}
                {p.slug === "universal-transmissions-codex-vol1-physical" && (
                  <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(212,168,71,0.1)" }}>
                    <Link href="/sanctum/universal-transmissions-codex-vol1-digital" className="font-mono text-xs tracking-widest uppercase hover:text-[var(--ut-cyan)] transition-colors" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                      Digital Edition Available &rarr;
                    </Link>
                  </div>
                )}
                {p.slug === "universal-transmissions-codex-vol1-digital" && (
                  <div className="mt-6 pt-6 border-t" style={{ borderColor: "rgba(212,168,71,0.1)" }}>
                    <Link href="/sanctum/universal-transmissions-codex-vol1-physical" className="font-mono text-xs tracking-widest uppercase hover:text-[var(--ut-cyan)] transition-colors" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                      Physical Edition Available &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </SectionReveal>
          </div>

          {/* ── TRANSCRIPTION VIDEO ─────────────────── */}
          {p.transcriptionVideoId && (
            <SafeTranscriptionVideo>
              <div className="container-ut mt-12">
                <SectionReveal>
                  <TranscriptionVideo
                    videoId={p.transcriptionVideoId}
                    title={p.title}
                  />
                </SectionReveal>
              </div>
            </SafeTranscriptionVideo>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
