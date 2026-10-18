"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import PageBackground from "@/components/scenes/PageBackground";

/**
 * Where PayPal returns the buyer after they approve.
 *
 * This page does not decide that anything was paid. It asks the server to capture the order, and
 * the server verifies the product, currency, shipping and total against PayPal's own copy of the
 * order before it captures, and reports COMPLETED only when PayPal says so. Until that answer
 * arrives the page says nothing about payment.
 *
 * Refreshing, or arriving twice, is safe: the capture route returns the existing result for an
 * order that is already captured rather than capturing it again, and the capture carries a stable
 * idempotency key so a retry after a lost response cannot take a second payment.
 *
 * The page claims only what actually ran. There is no buyer receipt email anywhere in this project
 * — the Stripe path records the order and alerts the studio by Telegram, and PayPal's own
 * confirmation email is PayPal's to send, not ours — so no receipt is promised here.
 */

type Result = {
  captured?: boolean;
  alreadyCaptured?: boolean;
  orderId?: string;
  captureId?: string | null;
  productTitle?: string;
  totalCents?: number;
  shippingCents?: number;
  currency?: string;
  country?: string | null;
  payerEmail?: string | null;
  orderRecorded?: boolean;
  orderAlreadyRecorded?: boolean;
  recordingDetail?: string | null;
  studioNotified?: boolean;
  notifyDetail?: string | null;
  error?: string;
  code?: string;
};

export default function PayPalReturnPage() {
  const [state, setState] = useState<"working" | "paid" | "failed" | "no-order">("working");
  const [result, setResult] = useState<Result | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    setOrderId(token);
    if (!token) {
      setState("no-order");
      return;
    }
    if (asked.current) return; // one capture attempt per mount; the route is idempotent anyway
    asked.current = true;

    (async () => {
      try {
        const res = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: token }),
        });
        const data: Result = await res.json();
        setResult(data);
        setState(res.ok && data.captured ? "paid" : "failed");
      } catch {
        setResult({ error: "The confirmation could not be completed. No payment has been taken twice; contact the studio with your PayPal order id." });
        setState("failed");
      }
    })();
  }, []);

  const money = (cents?: number) => (typeof cents === "number" ? `$${(cents / 100).toFixed(2)}` : "—");

  return (
    <>
      <PageBackground variant="sanctum" />
      <main className="pt-32 pb-24 min-h-[70vh]" style={{ background: "var(--ut-black)" }}>
        <div className="container-ut max-w-2xl">
          <SectionReveal>
            <div className="text-center">
              {state === "working" && (
                <>
                  <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-gold)" }}>
                    [ Confirming ]
                  </p>
                  <h1 className="font-display text-3xl md:text-5xl mb-4">
                    <ZalgoText text="Confirming Your Order" intensity="subtle" />
                  </h1>
                  <p className="font-body text-base" style={{ color: "var(--ut-white-dim)" }}>
                    Checking the payment with PayPal. Nothing is claimed until PayPal confirms it.
                  </p>
                </>
              )}

              {state === "paid" && (
                <>
                  <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "#4ade80" }}>
                    [ Payment Confirmed ]
                  </p>
                  <h1 className="font-display text-3xl md:text-5xl mb-4 glow-gold">
                    <ZalgoText text="Thank You" intensity="subtle" />
                  </h1>
                  <p className="font-body text-base mb-8" style={{ color: "var(--ut-white-dim)" }}>
                    {result?.orderRecorded
                      ? "PayPal confirmed the payment and your order is recorded."
                      : "PayPal confirmed the payment, but the order could not be written to the studio's records."}{" "}
                    {result?.orderRecorded && result?.studioNotified
                      ? "The studio has been notified."
                      : ""}
                  </p>
                  {!result?.orderRecorded && (
                    <p className="font-mono text-[11px] mb-6" style={{ color: "#f87171" }}>
                      Please contact the studio with your PayPal order id
                      {result?.recordingDetail ? ` — reference: ${result.recordingDetail}` : ""}.
                    </p>
                  )}
                  {result?.orderRecorded && result?.studioNotified === false && (
                    <p className="font-mono text-[11px] mb-6" style={{ color: "#fbbf24" }}>
                      The studio alert could not be sent{result?.notifyDetail ? ` (${result.notifyDetail})` : ""} — the
                      order is recorded, so nothing is lost.
                    </p>
                  )}
                  <div className="ut-card-gold p-5 text-left font-mono text-[11px] space-y-2" style={{ color: "var(--ut-white-dim)" }}>
                    {result?.productTitle && <p>Item · {result.productTitle}</p>}
                    {typeof result?.shippingCents === "number" && result.shippingCents > 0 && (
                      <p>Shipping · {money(result.shippingCents)}{result.country ? ` to ${result.country}` : ""}</p>
                    )}
                    <p>Total · {money(result?.totalCents)} {result?.currency ?? "USD"}</p>
                    {result?.captureId && <p>PayPal capture · {result.captureId}</p>}
                    {result?.orderId && <p>PayPal order · {result.orderId}</p>}
                    {result?.alreadyCaptured && <p>This order was already confirmed — you have not been charged twice.</p>}
                    <p>Order recorded · {result?.orderRecorded ? "yes" : "not written"}</p>
                  </div>
                </>
              )}

              {state === "failed" && (
                <>
                  <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "#f87171" }}>
                    [ Not Confirmed ]
                  </p>
                  <h1 className="font-display text-3xl md:text-5xl mb-4">
                    <ZalgoText text="Payment Not Completed" intensity="subtle" />
                  </h1>
                  <p className="font-body text-base mb-6" style={{ color: "var(--ut-white-dim)" }}>
                    {result?.error || "The payment could not be confirmed."}
                  </p>
                  <p className="font-mono text-[11px] mb-8" style={{ color: "var(--ut-white-faint)" }}>
                    {result?.code ? `Reference · ${result.code}` : ""} {orderId ? `· PayPal order ${orderId}` : ""}
                  </p>
                </>
              )}

              {state === "no-order" && (
                <>
                  <h1 className="font-display text-3xl md:text-5xl mb-4">
                    <ZalgoText text="Nothing To Confirm" intensity="subtle" />
                  </h1>
                  <p className="font-body text-base" style={{ color: "var(--ut-white-dim)" }}>
                    This page is reached after approving a payment at PayPal. There is no order here to
                    confirm.
                  </p>
                </>
              )}

              <div className="mt-10 flex flex-wrap gap-4 justify-center">
                <Link href="/sanctum" className="btn-secondary">
                  Back to the Sanctum
                </Link>
                <Link href="/codex" className="btn-secondary">
                  The Codex
                </Link>
              </div>
            </div>
          </SectionReveal>
        </div>
      </main>
    </>
  );
}
