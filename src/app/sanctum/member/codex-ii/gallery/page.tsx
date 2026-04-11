import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Navigation from "@/components/ui/Navigation";
import Footer from "@/components/ui/Footer";
import PageBackground from "@/components/scenes/PageBackground";
import CodexIIGalleryClient from "./CodexIIGalleryClient";

const PLAN_CHECK = ["initiate", "adept", "master"];

export default async function CodexIIGalleryPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component — cookies set in middleware
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sanctum/member/login?redirect=/sanctum/member/codex-ii/gallery");
  }

  const { data: member } = await supabase
    .from("ut_members")
    .select("plan")
    .eq("email", user.email)
    .maybeSingle();

  const isPaid = member?.plan && PLAN_CHECK.includes(member.plan);

  return (
    <>
      <PageBackground variant="cymatics" />
      <Navigation />
      {isPaid ? (
        <CodexIIGalleryClient />
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
              Codex II Gallery
            </h2>
            <p className="font-body text-base mb-6" style={{ color: "var(--ut-white-dim)" }}>
              This collection is reserved for Initiate, Adept, and Master
              members. Upgrade your membership to access.
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
