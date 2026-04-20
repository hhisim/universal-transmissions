"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SectionReveal from "@/components/ui/SectionReveal";
import ZalgoText from "@/components/ui/ZalgoText";
import { supabase } from "@/lib/supabase-client";
import { Package, Download, Truck, CheckCircle, Clock, XCircle, Eye } from "lucide-react";
import PageBackground from "@/components/scenes/PageBackground";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "var(--ut-white-faint)", icon: Clock },
  paid: { label: "Paid — Processing", color: "var(--ut-gold)", icon: CheckCircle },
  shipped: { label: "Shipped", color: "var(--ut-cyan)", icon: Truck },
  delivered: { label: "Delivered", color: "var(--ut-cyan)", icon: Package },
  fulfilled: { label: "Fulfilled", color: "var(--ut-magenta)", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "#ef4444", icon: XCircle },
  refunded: { label: "Refunded", color: "#ef4444", icon: XCircle },
};

export default function OrdersPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push("/sanctum/member/login");
      } else {
        setSession(data.session);
        fetchOrders(data.session.user.email || '');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push("/sanctum/member/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function fetchOrders(email: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders?email=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      setError("Could not load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatAmount(cents: number) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  return (
    <>
<PageBackground variant="sanctum" />      <main className="pt-24 pb-20 min-h-screen" style={{ background: "var(--ut-black)" }}>
        <div className="container-ut max-w-4xl mx-auto">
          {/* Header */}
          <SectionReveal>
            <div className="text-center mb-12 pt-8">
              <p className="font-mono text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "var(--ut-gold)", opacity: 0.6 }}>
                [ Transmissions Log ]
              </p>
              <h1 className="font-display text-4xl md:text-5xl mb-4">
                <ZalgoText text="Order History" intensity="moderate" />
              </h1>
              <p className="font-body text-base" style={{ color: "var(--ut-white-dim)" }}>
                All your transmissions, in one place.
              </p>
            </div>
          </SectionReveal>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--ut-gold)", borderTopColor: "transparent" }} />
            </div>
          ) : error ? (
            <SectionReveal>
              <div className="p-8 border text-center" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}>
                <p className="font-body text-base" style={{ color: "#ef4444" }}>{error}</p>
                <button onClick={() => session && fetchOrders(session.user.email)} className="mt-4 btn-secondary text-xs py-2 px-4">
                  Retry
                </button>
              </div>
            </SectionReveal>
          ) : orders.length === 0 ? (
            <SectionReveal>
              <div className="p-12 border text-center" style={{ borderColor: "rgba(212,168,71,0.15)" }}>
                <Package size={48} className="mx-auto mb-4" style={{ color: "var(--ut-white-faint)" }} />
                <h2 className="font-heading text-xl mb-3" style={{ color: "var(--ut-white-dim)" }}>
                  No Transmissions Yet
                </h2>
                <p className="font-body text-base mb-6" style={{ color: "var(--ut-white-dim)", opacity: 0.6 }}>
                  Your order history will appear here after your first purchase.
                </p>
                <Link href="/sanctum" className="btn-gold text-xs py-3 px-6 inline-flex items-center gap-2">
                  Browse Sanctum
                </Link>
              </div>
            </SectionReveal>
          ) : (
            <div className="space-y-6">
              {orders.map((order, i) => {
                const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const StatusIcon = status.icon;
                return (
                  <SectionReveal key={order.id} delay={i * 0.05}>
                    <div
                      className="border p-6 md:p-8"
                      style={{ borderColor: "rgba(212,168,71,0.15)", background: "var(--ut-surface)" }}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                        {/* Order info */}
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-heading text-base tracking-wider" style={{ color: "var(--ut-white)" }}>
                              {order.product_title}
                            </h3>
                            <span
                              className="flex items-center gap-1 font-mono text-[9px] tracking-widest uppercase px-2 py-0.5 border"
                              style={{ borderColor: `${status.color}40`, color: status.color }}
                            >
                              <StatusIcon size={10} />
                              {status.label}
                            </span>
                          </div>
                          <p className="font-mono text-[10px] tracking-widest" style={{ color: "var(--ut-white-faint)" }}>
                            Order #{order.id.slice(0, 8).toUpperCase()} · {formatDate(order.created_at)}
                          </p>
                          {order.customer_email && (
                            <p className="font-mono text-[10px] mt-1" style={{ color: "var(--ut-white-faint)" }}>
                              {order.customer_email}
                            </p>
                          )}
                        </div>
                        {/* Amount */}
                        <div className="text-left md:text-right">
                          <p className="font-display text-2xl" style={{ color: "var(--ut-gold)" }}>
                            {formatAmount(order.amount_cents)}
                          </p>
                          <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "var(--ut-white-faint)" }}>
                            {order.currency?.toUpperCase()}
                          </p>
                        </div>
                      </div>

                      {/* Shipping info */}
                      {!order.is_digital && order.shipping_city && (
                        <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(212,168,71,0.08)" }}>
                          <p className="font-mono text-[9px] tracking-widest uppercase mb-1" style={{ color: "var(--ut-gold)", opacity: 0.5 }}>
                            Shipping To
                          </p>
                          <p className="font-body text-sm" style={{ color: "var(--ut-white-dim)" }}>
                            {order.shipping_city}{order.shipping_state ? `, ${order.shipping_state}` : ""} {order.shipping_country ? `· ${order.shipping_country}` : ""}
                          </p>
                          {order.fulfillment_tracking && (
                            <p className="font-mono text-[10px] mt-1" style={{ color: "var(--ut-white-faint)" }}>
                              Tracking: {order.fulfillment_tracking}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Digital download */}
                      {order.is_digital && (order.status === "fulfilled" || order.status === "paid") && (
                        <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(217,70,239,0.08)" }}>
                          <button className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2">
                            <Download size={12} />
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                  </SectionReveal>
                );
              })}
            </div>
          )}

          <SectionReveal delay={0.3}>
            <div className="mt-12 text-center">
              <Link href="/sanctum/member" className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "var(--ut-white-dim)", opacity: 0.4 }}>
                ← Member Dashboard
              </Link>
            </div>
          </SectionReveal>
        </div>
      </main>
</>
  );
}
