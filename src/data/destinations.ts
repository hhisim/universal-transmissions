/**
 * PROVIDER DESTINATIONS — where each payment provider will actually deliver.
 *
 * This is deliberately NOT the same thing as the pricing policy. `src/data/shipping.ts` holds the
 * APPROVED GEOGRAPHIC POLICY: the world is priced in two zones, Australia-and-Asia at one rate and
 * everywhere else at another. This file holds each PROVIDER'S OWN CONTRACT — the destinations it
 * will accept a delivery address for — because a geographic list is not a supported-country list.
 *
 * What went wrong without this separation: every physical Stripe session sent the full geographic
 * list (249 codes) as `shipping_address_collection[allowed_countries]`. Stripe's own contract is
 * 238 codes and it does not support 15 of the codes that were being sent — AS, CC, CU, CX, FM, HM,
 * IR, KP, MH, MP, NF, PW, SY, UM and VI. The outgoing list is now built by INTERSECTING the
 * approved pricing zone with the provider's supported destinations, so a code the provider does
 * not support can never be sent.
 *
 * The two providers do not agree with each other either, which is why the destinations offered
 * depend on how the buyer is paying: PayPal does not support 37 codes that Stripe does, among them
 * China, Turkey, Pakistan, Iraq and Lebanon. A buyer in one of those countries can pay by card but
 * not by PayPal, and is told so plainly before any checkout begins.
 */

import { SHIPPING_RATES, deliveryZone } from "./shipping";

export type Provider = "stripe" | "paypal";

/**
 * Stripe's own API enum, taken from the installed SDK's own type definitions rather than retyped:
 * Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry.
 * `scripts/batch32-shipping.js` re-reads that union from node_modules and fails if this list and
 * the installed SDK ever disagree, so an SDK upgrade cannot silently leave this list wrong.
 */
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

/**
 * PayPal's country and region codes, from PayPal's REST reference
 * (developer.paypal.com/api/codes/country-region). A static snapshot: PayPal publishes no
 * consumable contract, so the suite asserts the structure and the documented exclusions rather
 * than claiming a live contract check it cannot perform.
 */
export const PAYPAL_ALLOWED_ISO: readonly string[] = [
  "AD", "AE", "AG", "AI", "AL", "AM", "AO", "AR", "AT", "AU", "AW", "AZ", "BA", "BB", "BE", "BF", "BG", "BH",
  "BI", "BJ", "BM", "BN", "BO", "BR", "BS", "BT", "BW", "BY", "BZ", "CA", "CD", "CG", "CH", "CI", "CK", "CL",
  "CM", "CO", "CR", "CV", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "ER", "ES", "ET",
  "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GI", "GL", "GM", "GN", "GP", "GR", "GT",
  "GW", "GY", "HK", "HN", "HR", "HU", "ID", "IE", "IL", "IN", "IS", "IT", "JM", "JO", "JP", "KE", "KG", "KH",
  "KI", "KM", "KN", "KR", "KW", "KY", "KZ", "LA", "LC", "LI", "LK", "LS", "LT", "LU", "LV", "MA", "MC", "MD",
  "ME", "MG", "MH", "MK", "ML", "MN", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA", "NC",
  "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PL", "PM",
  "PN", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW", "SA", "SB", "SC", "SE", "SG", "SH", "SI", "SJ",
  "SK", "SL", "SM", "SN", "SO", "SR", "ST", "SV", "SZ", "TC", "TD", "TG", "TH", "TJ", "TM", "TN", "TO", "TT",
  "TV", "TW", "TZ", "UA", "UG", "US", "UY", "VA", "VC", "VE", "VG", "VN", "VU", "WF", "WS", "YE", "YT", "ZA",
  "ZM", "ZW",
];

export const DESTINATION_PROVENANCE = {
  stripe: {
    codes: 238,
    source: "Stripe Node SDK v20.4.1 — ShippingAddressCollection.AllowedCountry",
    checked: "compared against the installed SDK's own union on every suite run",
  },
  paypal: {
    codes: 200,
    source: "PayPal REST country and region codes (retrieved for Batch 32)",
    checked: "structure asserted; PayPal publishes no consumable contract to diff against",
  },
} as const;

const PROVIDER_LISTS: Record<Provider, readonly string[]> = {
  stripe: STRIPE_ALLOWED_ISO,
  paypal: PAYPAL_ALLOWED_ISO,
};

/** Whether this provider will accept a delivery address in this country at all. */
export function providerSupports(provider: Provider, countryCode: string | null | undefined): boolean {
  if (!countryCode) return false;
  return PROVIDER_LISTS[provider].includes(String(countryCode).trim().toUpperCase());
}

/**
 * The destinations this provider may be OFFERED for this product — what the product page lists.
 *
 * Both zones appear, because both are real destinations; they simply carry different rates, and the
 * page shows each group with its own rate. A product that does not ship has no destinations.
 */
export function offeredDestinations(productId: string, provider: Provider): string[] {
  if (!SHIPPING_RATES[productId]) return [];
  return [...PROVIDER_LISTS[provider]];
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
 * The destinations an order ACTUALLY PRICED FOR THIS COUNTRY may be delivered to — the set that
 * goes to the provider as an allowlist.
 *
 * This is the intersection the brief asks for: the approved pricing policy's rate-correct set
 * (`allowedCountriesForProduct`) narrowed to what the provider supports. Restricting the addresses
 * a buyer may give to the countries carrying the same rate is what keeps the total and the address
 * from disagreeing; intersecting with the provider's contract is what keeps the request legal.
 */
export function allowedDeliveryFor(
  productId: string,
  provider: Provider,
  countryCode: string | null | undefined
): string[] {
  const rate = SHIPPING_RATES[productId];
  if (!rate) return [];
  const supported = [...PROVIDER_LISTS[provider]];
  // A product charged the same in both zones has nothing to protect, so no address can disagree.
  if (rate.worldwideCents === rate.australiaAndAsiaCents) return supported;
  // Otherwise: the provider's own destinations, kept to the one rate the declared country carries.
  // Filtering the PROVIDER'S list (rather than re-filtering the geographic list) is what keeps the
  // allowlist identical to the destinations the page offers — a country the provider supports and
  // the policy prices in this zone is deliverable, with no code silently dropped.
  const zone = deliveryZone(countryCode);
  return supported.filter((cc) => deliveryZone(cc) === zone);
}

/** Whether this provider may start a checkout that delivers to this country for this product. */
export function isDestinationSupported(
  productId: string,
  provider: Provider,
  countryCode: string | null | undefined
): boolean {
  if (!countryCode) return false;
  return offeredDestinations(productId, provider).includes(String(countryCode).trim().toUpperCase());
}

/** The provider, named the way a buyer reads it. */
export function providerName(provider: Provider): string {
  return provider === "stripe" ? "Card payment" : "PayPal";
}

/** Whether this provider may start a checkout that delivers to this country for this product. */
/**
 * Why this destination cannot be used, in one sentence a buyer can act on — or null when it can.
 * The wording distinguishes the two cases, because they need different actions: a country PayPal
 * does not serve can still be paid for by card.
 */
export function unsupportedDestinationMessage(
  productId: string,
  provider: Provider,
  countryCode: string | null | undefined
): string | null {
  if (!countryCode) return null;
  const cc = String(countryCode).trim().toUpperCase();
  const other: Provider = provider === "stripe" ? "paypal" : "stripe";
  if (!providerSupports(provider, cc)) {
    return providerSupports(other, cc)
      ? `${providerName(provider)} cannot deliver to ${cc}. Pay by ${providerName(other).toLowerCase()} instead.`
      : `Neither card payment nor PayPal can deliver to ${cc} for this product.`;
  }
  if (!isDestinationSupported(productId, provider, cc)) {
    return isDestinationSupported(productId, other, cc)
      ? `${providerName(provider)} cannot deliver this item to ${cc}. Pay by ${providerName(other).toLowerCase()} instead.`
      : `This item cannot be delivered to ${cc}.`;
  }
  return null;
}
