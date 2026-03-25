import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@/lib/auth";

// ============================================================
// File: src/app/api/oracle/route.ts
//
// This route connects to the VoA Codex Oracle backend.
// If the backend isn't configured, it returns demo responses
// so the page looks functional while the backend is being set up.
//
// REQUIRED ENV VARS (set in Vercel → Settings → Environment Variables):
//   CODEX_ORACLE_API_URL = the VoA API endpoint (e.g. https://your-voa-server.com/api/v1)
//   CODEX_ORACLE_API_KEY = the API key for authentication
//
// ============================================================

const API_URL = process.env.CODEX_ORACLE_API_URL;
const API_KEY = process.env.CODEX_ORACLE_API_KEY;

// ─── Rate limits by plan ────────────────────────────────────────────────────
const RATE_LIMITS = {
  guest: 10,   // per day, by IP
  free:  25,  // per day, by email
  initiate: Infinity,
};

const FREE_LANGUAGES = new Set(["en", "tr", "ru"]);

// Demo responses for when backend isn't connected
const DEMO_RESPONSES: Record<string, string> = {
  oracle: `🜂 PAGE VISION

Page 6 opens with the foundational cipher — a grid of morphemic elements arranged in descending frequency order. The central glyph constellation maps to the Solar Plexus gateway, suggesting a transmission concerned with personal power, will, and the alchemical fire of transformation.

The border glyphs encode a protective frequency pattern, creating a sonic architecture around the core message. The viewer is not simply looking at the page — they are inside a resonance chamber.

⚛ CORRESPONDENCE WEB
Element: Fire · Chakra: Manipura (Solar Plexus)
Planet: Mars · Geometry: Hexahedron / Cube
Tarot: The Tower (XVI) · Hebrew Letter: Peh (פ)
Crystal: Carnelian · Frequency: 320 Hz

📜 LINGUISTIC LAYER
The page title decodes letter by letter as a descending energy pathway — from the crown frequency through the solar gate into the earthbound manifestation plane. Each morpheme carries a dual charge: the visible aesthetic form and the encoded energetic signature beneath it.

[NOTE: This is a demo response. Connect the Codex Oracle backend to receive live analysis from the 577-entry correspondence system, alphabet ontology, and full archive.]`,

  decipher: `🜂 STRUCTURAL ANALYSIS

The page presents a tripartite composition: header glyphs (cosmological reference frame), central mandala (the transmission core), and footer syntax (the grounding code).

HEADER: Seven symbols arranged in a descending arc — mapping to the seven classical planets in Chaldean order (Saturn → Moon). This establishes the celestial context.

CENTER: A radial composition built on dodecahedral symmetry (12-fold). The inner ring contains 12 morphemes that cycle through the zodiacal archetypes. The outer ring maps these to the 12 houses of experience.

FOOTER: Linear syntax running left-to-right — this is the "readable" layer, though the language is xenolinguistic. The rhythm suggests a mantra or invocation structure.

⚛ GEOMETRIC SIGNATURE
Primary: Dodecahedron (12 faces, Platonic solid of the cosmos)
Secondary: Star of David / Hexagram (interpenetrating triangles)
Tertiary: Vesica Piscis (generative overlap)

[NOTE: Demo response — connect backend for live Codex Oracle analysis.]`,

  correspond: `🔗 CORRESPONDENCE MAP

Tracing the symbolic web from the central motif across traditions:

ELEMENT: Fire (Mars influence, solar plexus activation)
CHAKRA: Manipura — the city of jewels, seat of will and transformation
PLANET: Mars (Ares) — drive, assertion, the cutting edge of consciousness
ZODIAC: Aries (cardinal fire) — initiation, the spark that begins
TAROT: The Tower (XVI) — sudden illumination, structures falling away
KABBALAH: Peh (פ) — mouth, the power of speech to create and destroy
RUNE: Thurisaz (ᚦ) — thorn, gateway, the giant's power harnessed
I CHING: Hexagram 51 (震 Zhèn) — The Arousing, Thunder, shock that awakens
CRYSTAL: Carnelian — courage, vitality, creative fire
PLANT: Cinnamon — solar herb, warming, activating the will
DEITY: Sekhmet (Egyptian) — lioness, solar fire, healing through destruction

CROSS-PAGE ECHOES:
Pages 12, 24, and 39 share the hexahedral geometry motif.
Pages 6 and 45 share the Mars/fire correspondence.

[NOTE: Demo response — connect backend for live 577-entry correspondence lookup.]`,

  linguistic: `📜 ALPHABET DECODING: N-O-M-M-U

N — The serpent path. Zigzag awakening. Death and rebirth through the narrow gate.
    Element: Fire | Chakra: Solar Plexus | Tarot: Death (XIII) | Rune: Nauthiz

O — The eye, the circle, the cosmic egg. Completion and void simultaneously.
    Element: Spirit/Aether | Chakra: Third Eye | Tarot: The World (XXI) | Rune: Othala

M — Mother, matrix, water. The primordial ocean from which all form emerges.
    Element: Water | Chakra: Heart | Tarot: The Hanged Man (XII) | Rune: Mannaz

M — (doubled) — Amplified maternal frequency. The womb redoubled.
    The doubling creates a resonance chamber — the word itself becomes a mantra.

U — Cup, receptacle, the vessel that receives. Inverted mountain, the hollow.
    Element: Water | Chakra: Sacral | Tarot: The Moon (XVIII) | Rune: Uruz

AGGREGATE SIGNATURE:
Elemental: Water × 3, Fire × 1, Spirit × 1 — overwhelmingly receptive/feminine
Dominant Chakra Path: Solar Plexus → Third Eye → Heart → Heart → Sacral
Energetic Arc: Descending from will through vision into the double heart, settling in creative waters
Tarot Narrative: Death → World → Hanged Man → Hanged Man → Moon — a journey of surrender

The name NOMMU vibrates as a water-being, a primordial intelligence emerging from the deep.
In Dogon cosmology, the Nommo are the ancestral spirits from Sirius — amphibious teachers.
The letter-by-letter decoding confirms: this is a word of water, reception, and cosmic mothering.

[NOTE: Demo response — connect backend for live alphabet ontology + Gina'abul lexicon analysis.]`,

  meditate: `🧘 GUIDED CONTEMPLATION — Page 33

Find a quiet space. Sit comfortably. Place the Codex open to Page 33 before you, or hold its image in your mind.

PHASE 1 — GAZE (3 minutes)
Allow your eyes to rest on the center of the page. Do not try to read or decipher. Let the symbols wash over your visual field like rain on glass. Notice what draws your attention — a shape, a color, a cluster of marks. This is your entry point. Stay there.

PHASE 2 — BREATHE (3 minutes)
Close your eyes. Inhale through the nose for 4 counts. Hold for 4. Exhale through the mouth for 8. On each exhale, imagine the page's geometry expanding around you — you are not looking at it, you are inside it. The border glyphs form a protective circle around your awareness.

PHASE 3 — LISTEN (3 minutes)
In the silence, ask the page: "What are you transmitting?" Do not force an answer. Let whatever arises — image, word, sensation, memory — arrive without judgment. The Codex speaks in the language before language.

PHASE 4 — RETURN (1 minute)
Open your eyes. Look at the page again. Notice if anything has shifted — a symbol that seems brighter, a pattern that now appears connected to something else. Write down what you received. This is your personal decryption key.

The page knows who is reading it.

[NOTE: Demo response — connect backend for live page-specific guided meditation.]`,
};

// ─── Get client IP ─────────────────────────────────────────────────────────
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// ─── Get today's date string for rate limit key ───────────────────────────
function todayStr(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ─── Check and increment usage counter ────────────────────────────────────
async function checkRateLimit(opts: {
  email?: string | null;
  ip: string;
  plan: string;
}): Promise<{ allowed: boolean; used: number; limit: number; resetAt: string }> {
  const { email, ip, plan } = opts;
  const limit = RATE_LIMITS[plan as keyof typeof RATE_LIMITS] ?? 0;
  const today = todayStr();

  if (limit === Infinity) {
    return { allowed: true, used: 0, limit: Infinity, resetAt: today };
  }

  // Build a usage key: use email if available, else IP
  const usageKey = email ? `email:${email}` : `ip:${ip}`;
  const counterKey = `${usageKey}:${today}`;

  try {
    // Try to read current count
    const { data } = await supabaseAdmin
      .from("ut_usage")
      .select("count")
      .eq("usage_key", counterKey)
      .maybeSingle();

    const used = data?.count ?? 0;

    if (used >= limit) {
      return { allowed: false, used, limit, resetAt: today };
    }

    // Increment counter (upsert)
    await supabaseAdmin
      .from("ut_usage")
      .upsert(
        { usage_key: counterKey, count: used + 1, email: email ?? null, ip: ip ?? null, plan, created_at: new Date().toISOString() },
        { onConflict: "usage_key" }
      );

    return { allowed: true, used: used + 1, limit, resetAt: today };
  } catch (err) {
    // If ut_usage table doesn't exist, allow request (graceful degradation)
    console.error("Rate limit check error:", err);
    return { allowed: true, used: 0, limit, resetAt: today };
  }
}

// ─── Main POST handler ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, mode = "oracle", language = "en", history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // ── Auth: get email from session ───────────────────────────────────────
    let email: string | null = null;
    let plan = "guest";
    let ip = getClientIP(req);

    try {
      const session = await auth();
      if (session?.user?.email) {
        email = session.user.email;

        // Look up member record to get plan
        const { data: member } = await supabaseAdmin
          .from("ut_members")
          .select("plan, subscription_status")
          .eq("email", email)
          .maybeSingle();

        plan = member?.plan ?? "guest";

        // Free plan language restriction
        if (plan === "free" && !FREE_LANGUAGES.has(language)) {
          return NextResponse.json({
            error: "Free accounts are limited to EN, TR, and RU languages. Upgrade to Initiate for all languages.",
            code: "LANGUAGE_RESTRICTED",
          }, { status: 403 });
        }
      }
    } catch (authErr) {
      // No auth session — treat as guest (IP-based)
    }

    // ── Rate limiting ───────────────────────────────────────────────────────
    const { allowed, used, limit } = await checkRateLimit({ email, ip, plan });

    if (!allowed) {
      return NextResponse.json({
        error: `Daily limit reached (${used}/${limit}). Create a free account for 25 questions/day, or upgrade to Initiate for unlimited.`,
        code: "RATE_LIMITED",
        used,
        limit,
      }, { status: 429 });
    }

    // ── Try live backend ───────────────────────────────────────────────────
    if (API_URL && API_KEY) {
      try {
        const backendRes = await fetch(`${API_URL}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            pack: "codex",
            mode,
            lang: language,
            message,
            history,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (backendRes.ok) {
          const data = await backendRes.json();
          const responseText = data.response || data.text || data.message || data.reply;
          if (responseText) {
            return NextResponse.json({
              response: responseText,
              plan,
              usage: { used, limit },
            });
          }
        }
        console.error("Oracle backend returned non-OK:", backendRes.status);
      } catch (backendError) {
        console.error("Oracle backend error:", backendError);
      }
    }

    // ── Demo mode ─────────────────────────────────────────────────────────
    const demoText = DEMO_RESPONSES[mode] || DEMO_RESPONSES.oracle;
    return NextResponse.json({
      response: demoText,
      plan,
      usage: { used, limit },
      demo: true,
    });

  } catch (error) {
    console.error("Oracle API route error:", error);
    return NextResponse.json(
      { response: "The Oracle encountered an error. Please try again." },
      { status: 200 }
    );
  }
}
