'use client'

import Link from "next/link";
import Image from "next/image";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";
import { products } from "@/data/products";

export default function SanctumPage() {
  return (
    <>
      
      <Navigation />
      <main className="pt-24 pb-20" style={{ background: "var(--ut-black)" }}>
        <div className="container-ut">
          {/* Header */}
          <div>
            <div className="text-center mb-16 pt-8">
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-gold)" }}>
                [ Sacred Objects & Physical Transmissions ]
              </p>
              <h1 className="font-display text-4xl md:text-6xl glow-gold mb-4">
                <ZalgoText text="The Sanctum" intensity="moderate" />
              </h1>
              <p className="font-body text-lg max-w-xl mx-auto" style={{ color: "var(--ut-white-dim)" }}>
                Physical manifestations of the Universal Transmissions project. Archival prints, the Codex, and limited edition artifacts — each hand-signed by the artist.
              </p>
            </div>
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product, i) => (
              <div key={product.id} delay={i * 0.1}>
                <div className="ut-card-gold overflow-hidden group">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={product.images[0]}
                      alt={product.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-6">
                    <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                      {product.category}
                    </p>
                    <h2 className="font-heading text-base tracking-wider mb-2" style={{ color: "var(--ut-white)" }}>
                      {product.title}
                    </h2>
                    <p className="font-body text-sm mb-4 leading-relaxed" style={{ color: "var(--ut-white-dim)", opacity: 0.7 }}>
                      {product.description.slice(0, 100)}...
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-display text-2xl" style={{ color: "var(--ut-gold)" }}>
                          ${product.price}
                        </p>
                        {product.originalPrice && (
                          <p className="font-mono text-[10px] line-through" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                            ${product.originalPrice}
                          </p>
                        )}
                      </div>
                      <Link href={`/sanctum/${product.slug}`} className="btn-gold text-xs py-2 px-4">
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Payment badges */}
          <div delay={0.3}>
            <div className="mt-16 text-center">
              <p className="font-mono text-[9px] tracking-[0.3em] uppercase mb-4" style={{ color: "var(--ut-white-dim)", opacity: 0.3 }}>
                Secure payments via Stripe & PayPal
              </p>
              <div className="flex justify-center gap-6">
                <div className="font-mono text-xs px-4 py-2 border" style={{ borderColor: "rgba(0,229,255,0.15)", color: "var(--ut-white-dim)", opacity: 0.4 }}>
                  💳 Stripe
                </div>
                <div className="font-mono text-xs px-4 py-2 border" style={{ borderColor: "rgba(0,229,255,0.15)", color: "var(--ut-white-dim)", opacity: 0.4 }}>
                  ᵖᵃʸ PayPal
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
