/**
 * PROVIDER DESTINATIONS — the two providers' actual contracts, kept separate from the pricing policy.
 *
 * `src/data/shipping.ts` holds the APPROVED GEOGRAPHIC POLICY (canonical ISO identities, two zones).
 * This file holds what each provider will accept, and nothing more.
 *
 * ── STRIPE ──────────────────────────────────────────────────────────────────────────────────────
 * Stripe documents an explicit enum for `shipping_address_collection.allowed_countries`, and the
 * installed SDK carries it: 238 codes. Sending anything outside it is a rejected request, which is
 * what a previous version did with 15 codes (AS CC CU CX FM HM IR KP MH MP NF PW SY UM VI) taken
 * from a geographic list. The list below is read from that enum and the suite re-reads the SDK's own
 * union on every run, so an SDK upgrade cannot leave it silently wrong.
 *
 * ── PAYPAL ──────────────────────────────────────────────────────────────────────────────────────
 * There is NO documented per-country delivery allowlist. PayPal's own Orders v2 OpenAPI spec defines
 * the shipping address's `country_code` as:
 *
 *     "The 2-character ISO 3166-1 code that identifies the country or region. … Use the `C2` country
 *      code for China worldwide for comparable uncontrolled price (CUP) method, bank card, and
 *      cross-border transactions."
 *     pattern: ^([A-Z]{2}|C2)$        (no enum)
 *
 * Two consequences, both load-bearing:
 *
 *   1. An earlier version inferred a 200-code restriction from PayPal's ACCOUNT-COUNTRY availability
 *      page. That is not a delivery contract, and China — which that page marks C2 — was wrongly
 *      treated as undeliverable. That inference is withdrawn: PayPal validates the address it
 *      collects itself, and the destination offered here is the pricing policy's own canonical set.
 *   2. China's PAYPAL PROVIDER CODE IS `C2`, not `CN`. The mapping below is required, and it matters
 *      to money: `CN` sits in the Australia-and-Asia zone at $50, so an unmapped `C2` arriving at
 *      capture would fall to the worldwide $30 rate and under-charge by $20.
 */

import { SHIPPING_RATES, SHIPPABLE_ISO, deliveryZone } from "./shipping";

export type Provider = "stripe" | "paypal";

/** Stripe's own API enum — Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry. */
export const STRIPE_ALLOWED_ISO: readonly string[] = [
  "AC", "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AT", "AU", "AW", "AX", "AZ", "BA", "BB",
  "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY",
  "BZ", "CA", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CV", "CW", "CY", "CZ", "DE",
  "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FO", "FR", "GA",
  "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY",
  "HK", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IS", "IT", "JE", "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT",
  "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MK", "ML", "MM", "MN", "MO", "MQ", "MR", "MS", "MT",
  "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM",
  "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PY", "QA", "RE", "RO", "RS", "RU",
  "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST",
  "SV", "SX", "SZ", "TA", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV",
  "TW", "TZ", "UA", "UG", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VN", "VU", "WF", "WS", "XK", "YE", "YT",
  "ZA", "ZM", "ZW", "ZZ",
];

/** PayPal's documented pattern for a shipping country code. */
export const PAYPAL_COUNTRY_CODE_PATTERN = /^([A-Z]{2}|C2)$/;

/**
 * Canonical ISO -> PayPal provider code, for the codes where they differ.
 * From the Orders v2 spec: "Use the `C2` country code for China worldwide…".
 */
export const PAYPAL_PROVIDER_CODE_OVERRIDES: Record<string, string> = {
  CN: "C2",
};

export const DESTINATION_PROVENANCE = {
  stripe: {
    codes: 238,
    source: "Stripe Node SDK — ShippingAddressCollection.AllowedCountry",
    checked: "compared against the installed SDK's own union on every suite run",
  },
  paypal: {
    codes: null,
    source: "PayPal Orders v2 OpenAPI — country_code pattern ^([A-Z]{2}|C2)$, no enum",
    checked: "pattern asserted; account-country availability is explicitly NOT treated as a delivery contract",
    special_case: "CN is sent as C2 (Orders v2 shipping address country_code note)",
  },
} as const;

/** The code to SEND to a provider for a canonical ISO destination. */
export function toProviderCountry(provider: Provider, isoCountry: string | null | undefined): string | null {
  if (!isoCountry) return null;
  const iso = String(isoCountry).trim().toUpperCase();
  if (provider === "paypal") return PAYPAL_PROVIDER_CODE_OVERRIDES[iso] ?? iso;
  return iso;
}

/**
 * The canonical ISO destination for a code RECEIVED from a provider — the inverse mapping, so a
 * `C2` order is priced as China and not as an unknown country.
 */
export function fromProviderCountry(provider: Provider, providerCode: string | null | undefined): string | null {
  if (!providerCode) return null;
  const code = String(providerCode).trim().toUpperCase();
  if (provider === "paypal") {
    const inverse = Object.entries(PAYPAL_PROVIDER_CODE_OVERRIDES).find(([, provider2]) => provider2 === code);
    if (inverse) return inverse[0];
  }
  return code;
}

/** Whether this provider will accept this destination at all. */
export function providerSupports(provider: Provider, isoCountry: string | null | undefined): boolean {
  if (!isoCountry) return false;
  const iso = String(isoCountry).trim().toUpperCase();
  if (provider === "stripe") return STRIPE_ALLOWED_ISO.includes(iso);
  // PayPal: the documented contract is the code pattern, not a country list.
  return PAYPAL_COUNTRY_CODE_PATTERN.test(toProviderCountry(provider, iso) ?? "");
}

/**
 * The destinations this provider may be OFFERED for this product — what the product page lists.
 * A product that does not ship has no destinations.
 */
export function offeredDestinations(productId: string, provider: Provider): string[] {
  if (!SHIPPING_RATES[productId]) return [];
  if (provider === "stripe") return [...STRIPE_ALLOWED_ISO];
  // PayPal imposes no documented country list, so the policy's own canonical set is offered.
  return [...SHIPPABLE_ISO];
}

/** The offered destinations, split the way the product page shows them. */
export function destinationsByZone(
  productId: string,
  provider: Provider
): { worldwide: string[]; australiaAndAsia: string[] } {
  const offered = offeredDestinations(productId, provider);
  return {
    worldwide: offered.filter((cc) => deliveryZone(cc) === "WORLDWIDE").sort(),
    australiaAndAsia: offered.filter((cc) => deliveryZone(cc) === "AUSTRALIA_AND_ASIA").sort(),
  };
}

/**
 * The destinations an order PRICED FOR THIS COUNTRY may be delivered to — the allowlist sent to the
 * provider. The policy's rate-correct zone, narrowed to what the provider accepts.
 */
export function allowedDeliveryFor(
  productId: string,
  provider: Provider,
  countryCode: string | null | undefined
): string[] {
  const rate = SHIPPING_RATES[productId];
  if (!rate) return [];
  const offered = offeredDestinations(productId, provider);
  if (rate.worldwideCents === rate.australiaAndAsiaCents) return offered;
  const zone = deliveryZone(countryCode);
  return offered.filter((cc) => deliveryZone(cc) === zone);
}

/** Whether this provider may start a checkout that delivers to this country for this product. */
export function isDestinationSupported(
  productId: string,
  provider: Provider,
  countryCode: string | null | undefined
): boolean {
  if (!countryCode) return false;
  const iso = String(countryCode).trim().toUpperCase();
  return offeredDestinations(productId, provider).includes(iso) && providerSupports(provider, iso);
}

/** The provider, named the way a buyer reads it. */
export function providerName(provider: Provider): string {
  return provider === "stripe" ? "Card payment" : "PayPal";
}

/**
 * Why this destination cannot be used, in one sentence a buyer can act on — or null when it can.
 */
export function unsupportedDestinationMessage(
  productId: string,
  provider: Provider,
  countryCode: string | null | undefined
): string | null {
  if (!countryCode) return null;
  const cc = String(countryCode).trim().toUpperCase();
  const other: Provider = provider === "stripe" ? "paypal" : "stripe";
  if (!isDestinationSupported(productId, provider, cc)) {
    return isDestinationSupported(productId, other, cc)
      ? `${providerName(provider)} cannot deliver to ${cc}. Pay by ${providerName(other).toLowerCase()} instead.`
      : `Neither card payment nor PayPal can deliver to ${cc} for this product.`;
  }
  return null;
}
