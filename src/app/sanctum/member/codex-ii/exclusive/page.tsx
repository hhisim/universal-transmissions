import { redirect } from "next/navigation";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import PageBackground from "@/components/scenes/PageBackground";
import CodexIIExclusiveClient from "./CodexIIExclusiveClient";
import { supabaseAdmin } from "@/lib/supabase";

const PLAN_CHECK = ["initiate", "adept", "master", "full"];

export default async function CodexIIExclusivePage() {
  // Use NextAuth session — UT uses NextAuth (magic link), NOT Supabase Auth directly
  const { auth } = await import("@/lib/auth");
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/sanctum/member/login?redirect=/sanctum/member/codex-ii/exclusive");
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan, subscription_status")
    .eq("email", session.user.email)
    .maybeSingle();

  const { data: member } = await supabaseAdmin
    .from("ut_members")
    .select("plan")
    .eq("email", session.user.email)
    .maybeSingle();

  const plan = profile?.plan || member?.plan;
  const isPaid = plan && PLAN_CHECK.includes(plan);

  return (
    <>
      <PageBackground variant="cymatics" />
      <Navigation />
      {isPaid ? (
        <CodexIIExclusiveClient />
      ) : (
        <main
          className="pt-24 min-h-screen flex items-center justify-center"
          style={{ background: "var(--ut-black)" }}
        >
          <div className="text-center max-w-lg px-4">
            <div
              className="w-16 h-16 border mx-auto mb-6 flex items-center justify-center"
              style={{ borderColor: "rgba(217,70,239,0.3)" }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ut-magenta)"
                strokeWidth="1.5"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="font-display text-2xl mb-4 text-white">
              The Inner Transmission
            </h2>
            <p className="font-body text-base mb-6" style={{ color: "var(--ut-white-dim)" }}>
              These long-form materials are reserved for Initiate, Adept, and
              Master members. Upgrade your membership to unlock.
            </p>
            <a
              href="/sanctum/member/experience"
              className="btn-primary px-8 py-3 inline-flex items-center gap-2 font-mono text-xs"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              Upgrade Membership
            </a>
          </div>
        </main>
      )}
      <Footer />
    </>
  );
}
