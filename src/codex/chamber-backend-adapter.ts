import type { UsageSnapshot } from "./types";
import { normalizeForSpeech } from "./speech-normalize";

const ANON_KEY = "ut_oracle_anonymous_id";

export function getAnonymousId() {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(ANON_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(ANON_KEY, next);
  return next;
}

export async function getUsage(): Promise<UsageSnapshot> {
  const anonymousId = getAnonymousId();
  const res = await fetch(`/api/oracle/usage?anonymous_id=${encodeURIComponent(anonymousId)}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    return { used: 0, limit: 25, remaining: 25, tier: "guest" };
  }
  return res.json();
}

export async function incrementUsage() {
  const anonymousId = getAnonymousId();
  await fetch("/api/oracle/usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ anonymous_id: anonymousId }),
  }).catch(() => undefined);
}

export async function askOracle(
  message: string,
  options: { mode?: string; lang?: string; speed?: string } = {},
) {
  const res = await fetch("/api/oracle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      mode: options.mode ?? "correspondence",
      lang: options.lang ?? "en",
      speed: options.speed ?? "deep",
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "The Oracle route did not return a transmission.");
  }
  await incrementUsage();
  return String(data.response || data.answer || "");
}

export async function requestNarrationAudio(text: string, options: { lang?: string; voice?: string } = {}) {
  const clean = normalizeForSpeech(text);
  const res = await fetch("/api/oracle/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: clean,
      lang: options.lang ?? "en",
      voice: options.voice ?? "hd",
    }),
  });
  if (!res.ok) {
    throw new Error("Narration route unavailable.");
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
