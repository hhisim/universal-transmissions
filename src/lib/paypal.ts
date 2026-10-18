/**
 * PAYPAL — one environment choice and one place to authenticate.
 *
 * The live/sandbox host was previously written into each route by hand, and the two disagreed:
 * orders were created on the live host while capture posted to the sandbox. Both now read
 * `PAYPAL_MODE`, and both authenticate the same way — client id and secret exchanged for an access
 * token server-side. There is no long-lived token in the environment to go stale.
 *
 * When PAYPAL_MODE is unset the default is the SANDBOX: a missing configuration must never be the
 * reason a real card is charged.
 */

export type PayPalMode = "sandbox" | "production";

export function paypalMode(): PayPalMode {
  return String(process.env.PAYPAL_MODE || "").toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

export function paypalBaseUrl(): string {
  return paypalMode() === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

/** The public site address PayPal returns the buyer to. */
export function siteBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://www.universal-transmissions.com";
}

/** Client id and secret, exchanged server-side for a token. */
export async function getPayPalAccessToken(): Promise<string | null> {
  if (!paypalConfigured()) return null;
  try {
    const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

/** A PayPal API call with the token attached. Returns null when PayPal is not configured. */
export async function paypalFetch(
  path: string,
  init: RequestInit & { token?: string } = {}
): Promise<Response | null> {
  const token = init.token || (await getPayPalAccessToken());
  if (!token) return null;
  return fetch(`${paypalBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
}
