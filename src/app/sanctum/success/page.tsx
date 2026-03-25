import Link from "next/link";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import PageBackground from "@/components/scenes/PageBackground";

export default function SuccessPage() {
  return (
    <>
      <Navigation />
     
      <PageBackground variant="sanctum" /> <main className="pt-32 pb-20 px-6 text-center min-h-screen" style={{ background: "var(--ut-black)" }}>
        <div className="max-w-lg mx-auto">
          <div className="text-6xl mb-6">✦</div>
          <h1 className="font-display text-3xl tracking-[0.15em] mb-6" style={{ color: "var(--ut-white)" }}>
            Transmission Received
          </h1>
          <p className="font-body text-lg mb-4" style={{ color: "var(--ut-white-dim)" }}>
            Your order has been confirmed. A receipt has been sent to your email.
          </p>
          <p className="font-body mb-8" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
            Physical items will be shipped within 3 business days.
            Digital items will be delivered to your email within 24 hours.
          </p>
          <div className="h-px w-full mb-8" style={{ background: "linear-gradient(90deg, transparent, var(--ut-magenta), var(--ut-cyan), transparent)" }} />
          <Link href="/sanctum" className="btn-secondary">
            RETURN TO THE SANCTUM
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
