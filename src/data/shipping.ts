/**
 * SHIPPING — the one place that records what this project actually charges, and where it
 * currently disagrees with itself.
 *
 * There is no shipping field on a product. The rate exists in three places that do not agree:
 *
 *   1. the product page's own words        "$30 worldwide (AU/Asia $50) · Ships within 10 days"
 *   2. the Stripe session construction      a single flat $30, applied to every country
 *   3. the PayPal order                     no shipping at all — the customer pays the book price
 *
 * This module does NOT resolve that. Choosing between the three is the owner's decision, and it is
 * recorded here as an open decision rather than guessed at. What this module does is make the
 * disagreement live in one file, so that whatever is decided can be applied in one place and both
 * providers can be checked against it.
 *
 * NOTHING HERE CHANGES A CHARGE. Values are transcribed from what the code already does; the
 * AU/Asia figure is the page's stated rule and is applied by nobody.
 */

/** The state of the policy. It is not reconciled, and saying so is the point of this file. */
export const SHIPPING_POLICY_STATE = "unreconciled" as const;

export interface FlatRate {
  /** What the Stripe session charges today, in cents, for this product. */
  cents: number;
  /** The name the charge carries. */
  label: string;
  /** The delivery window the session advertises on the Stripe checkout. */
  minBusinessDays: number;
  maxBusinessDays: number;
  /**
   * The dispatch promise the product page prints. It does not equal the window above — the page
   * says one thing and the checkout advertises another, which is recorded and not resolved here.
   */
  dispatchDays: number;
}

/**
 * The flat rate each physical product is charged, exactly as /api/checkout builds it today.
 * A product is physical precisely when it appears here — that keeps "which products ship"
 * in one place instead of a separate list that can drift from the rates.
 */
export const FLAT_RATES: Record<string, FlatRate> = {
  "codex-physical": {
    cents: 3000,
    label: "Standard Shipping",
    minBusinessDays: 5,
    maxBusinessDays: 21,
    dispatchDays: 10,
  },
  "hexahedron-cube": {
    cents: 2000,
    label: "Worldwide Shipping",
    minBusinessDays: 5,
    maxBusinessDays: 21,
    dispatchDays: 10,
  },
};

export interface StatedZoneRate {
  zone: string;
  /** Countries the zone covers, upper-case ISO codes. "worldwide" is the fallback. */
  countries: string[] | "worldwide";
  cents: number;
  /**
   * Whether any provider actually charges this. It is false for the AU/Asia rate, which is why
   * the product page and the checkout can disagree.
   */
  appliedByProviders: boolean;
  source: string;
}

/**
 * The zones as the product page states them. The worldwide rate is applied by Stripe; the AU/Asia
 * rate is applied by nothing — an Australian or Asian buyer is charged the worldwide rate.
 */
export const STATED_ZONE_RATES: Record<string, StatedZoneRate[]> = {
  "codex-physical": [
    {
      zone: "worldwide",
      countries: "worldwide",
      cents: 3000,
      appliedByProviders: true,
      source: "product page, and the Stripe session's only shipping option",
    },
    {
      zone: "AU/Asia",
      countries: ["AU", "NZ", "JP", "SG", "KR", "CN", "HK", "TW", "MY", "TH", "ID", "PH", "VN", "IN"],
      cents: 5000,
      appliedByProviders: false,
      source: "product page only — no provider applies it",
    },
  ],
  "hexahedron-cube": [
    {
      zone: "worldwide",
      countries: "worldwide",
      cents: 2000,
      appliedByProviders: true,
      source: "product page, and the Stripe session's only shipping option",
    },
  ],
};

/** Whether this product is shipped at all. Digital goods must never acquire a shipping charge. */
export function requiresShipping(productId: string): boolean {
  return Object.prototype.hasOwnProperty.call(FLAT_RATES, productId);
}

/** The flat charge the Stripe session applies today. Throws for a product that does not ship. */
export function flatShippingCents(productId: string): number {
  const rate = FLAT_RATES[productId];
  if (!rate) throw new Error(`${productId} does not ship`);
  return rate.cents;
}

export function shippingLabel(productId: string): string {
  const rate = FLAT_RATES[productId];
  if (!rate) throw new Error(`${productId} does not ship`);
  return rate.label;
}

export function deliveryWindow(productId: string): { min: number; max: number } {
  const rate = FLAT_RATES[productId];
  if (!rate) throw new Error(`${productId} does not ship`);
  return { min: rate.minBusinessDays, max: rate.maxBusinessDays };
}

/**
 * The rate the product page's own rule gives for a country. NOT applied by any provider — it is
 * here so the reconciliation can be checked against the published rule the moment the owner
 * settles it. `null` means no zone claimed this country.
 */
export function statedZoneRateCents(productId: string, countryCode: string): number | null {
  const zones = STATED_ZONE_RATES[productId];
  if (!zones) return null;
  const cc = countryCode.trim().toUpperCase();
  const named = zones.find(
    (z) => Array.isArray(z.countries) && z.countries.includes(cc)
  );
  if (named) return named.cents;
  const worldwide = zones.find((z) => z.countries === "worldwide");
  return worldwide ? worldwide.cents : null;
}

/** Money in the form the page prints it. */
export function dollars(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}

/**
 * The rate phrase the product page prints — derived from the zone table, so the page cannot state
 * one thing while the table says another. "worldwide" first, then any other zone in brackets:
 * "$30 worldwide (AU/Asia $50)".
 */
export function rateLine(productId: string): string | null {
  const zones = STATED_ZONE_RATES[productId];
  if (!zones) return null;
  const worldwide = zones.find((z) => z.countries === "worldwide");
  const other = zones.find((z) => z.countries !== "worldwide");
  const parts: string[] = [];
  if (worldwide) parts.push(`${dollars(worldwide.cents)} worldwide`);
  if (other) parts.push(`(${other.zone} ${dollars(other.cents)})`);
  return parts.join(" ");
}

/** The dispatch promise the page prints, from the same table. */
export function dispatchLine(productId: string): string | null {
  const rate = FLAT_RATES[productId];
  if (!rate) return null;
  return `Ships within ${rate.dispatchDays} days`;
}

/**
 * The handling requirement a product carries beyond postage. It is not a rate, and it is not
 * shared: the cube must be inspected and its certificate signed before it goes out.
 */
const HANDLING_NOTES: Record<string, string> = {
  "hexahedron-cube":
    "Requires personal inspection & signing of Certificate of Authenticity",
};

/**
 * The whole shipping sentence the product page prints, for any product that ships. One function,
 * one place: the page states exactly what this table says.
 */
export function shippingNote(productId: string): string | null {
  if (!requiresShipping(productId)) return null;
  const tail = HANDLING_NOTES[productId] ?? dispatchLine(productId);
  return `${rateLine(productId)} · ${tail}`;
}

/** What each provider does with shipping today. Transcribed, not aspirational. */
export const PROVIDER_APPLICATION = {
  stripe: {
    appliesShippingForShippingProducts: true,
    appliesZoneRates: false,
    collectsDeliveryAddress: false,
    note:
      "one fixed shipping option at the worldwide rate, for every country; the session sets no " +
      "shipping_address_collection, so a paid physical order can arrive without a delivery address",
  },
  paypal: {
    appliesShippingForShippingProducts: false,
    appliesZoneRates: false,
    collectsDeliveryAddress: false,
    note:
      "the order is built from the product price alone; there is no shipping line and no " +
      "shipping_preference, and the capture route is not reachable from the site",
  },
} as const;

/**
 * The decisions only the owner can make. Each names the conflicting definitions and what changes
 * once it is answered — none of them is answered here.
 */
export const OPEN_SHIPPING_DECISIONS = [
  "Is the AU/Asia $50 rate real? The page states it; no provider applies it, so those buyers are charged $30.",
  "Does PayPal charge shipping for physical goods? Today it charges the book price alone — a physical order pays no postage and asks for no delivery address.",
  "Should Stripe collect a delivery address for physical goods? It charges postage but never asks where to send it.",
] as const;
