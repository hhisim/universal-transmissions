/**
 * SHIPPING — the confirmed policy, in one place, for the product pages and both providers.
 *
 * CONFIRMED BY THE OWNER (Batch 32):
 *   · Physical Codex .... $30 USD worldwide, except Australia and Asia at $50 USD
 *   · Art cube .......... $20 USD worldwide
 *   · Digital products .. no shipping charge and no delivery-address requirement
 *   · Product prices .... unchanged
 *
 * The rate is a function of the DELIVERY COUNTRY and is always resolved server-side from this
 * table. Neither provider is handed two rates to choose between: the server computes the one rate
 * that applies, and the addresses a buyer may give are restricted to the countries that carry the
 * same rate — so an address change inside a checkout cannot produce a total that disagrees with it.
 */

export const SHIPPING_POLICY_STATE = "confirmed" as const;

export type Zone = "WORLDWIDE" | "AUSTRALIA_AND_ASIA";

/* ─────────────────────────────────────────────────────────────────────────────
 * THE GEOGRAPHIC DEFINITION OF "AUSTRALIA AND ASIA"
 *
 * Defined by a NAMED STANDARD rather than by taste, so the coverage can be checked against
 * something other than this file:
 *
 *   · ASIA — the five Asian subregions of the UN M49 classification:
 *       145 Western Asia, 143 Central Asia, 034 Southern Asia,
 *       035 South-Eastern Asia, 030 Eastern Asia
 *   · AUSTRALIA — the country Australia (ISO 3166-1 alpha-2: AU)
 *
 * M49 counts Cyprus, Georgia, Armenia and Azerbaijan in Western Asia, and the Middle East there
 * too; they are carried here because that is what the named standard says, rather than a judgement
 * about where a country "belongs".
 *
 * NOT INCLUDED, AND WHY — New Zealand. It is the flagged case. An earlier draft carried NZ inside
 * this zone; that was an assumption, not the owner's words. NZ is in the M49 *Oceania* macro-region:
 * it is not Asia and it is not Australia, so it is charged the worldwide rate here. If NZ should
 * price with Australia — a common commercial choice — that is one deliberate line in the list
 * below, not something to slip in unnoticed.
 * ───────────────────────────────────────────────────────────────────────────── */
export const GEOGRAPHIC_DEFINITION = {
  standard: "UN M49 — the five Asian subregions, plus the country code AU",
  asiaSubregions: [
    "145 Western Asia",
    "143 Central Asia",
    "034 Southern Asia",
    "035 South-Eastern Asia",
    "030 Eastern Asia",
  ],
  excludes: {
    NZ: "New Zealand — M49 Oceania: not Asia, not Australia. Charged the worldwide rate unless the owner decides otherwise.",
  },
} as const;

/** Western Asia (M49 145). */
const WESTERN_ASIA = ["AE", "AM", "AZ", "BH", "CY", "GE", "IL", "IQ", "JO", "KW", "LB", "OM", "PS", "QA", "SA", "SY", "TR", "YE"];
/** Central Asia (M49 143). */
const CENTRAL_ASIA = ["KG", "KZ", "TJ", "TM", "UZ"];
/** Southern Asia (M49 034). */
const SOUTHERN_ASIA = ["AF", "BD", "BT", "IN", "IR", "LK", "MV", "NP", "PK"];
/** South-Eastern Asia (M49 035). */
const SOUTH_EASTERN_ASIA = ["BN", "ID", "KH", "LA", "MM", "MY", "PH", "SG", "TH", "TL", "VN"];
/** Eastern Asia (M49 030). */
const EASTERN_ASIA = ["CN", "HK", "JP", "KP", "KR", "MN", "MO", "TW"];

/** Australia plus every country of the five M49 Asian subregions. */
export const AUSTRALIA_AND_ASIA_ISO: readonly string[] = [
  "AU",
  ...WESTERN_ASIA,
  ...CENTRAL_ASIA,
  ...SOUTHERN_ASIA,
  ...SOUTH_EASTERN_ASIA,
  ...EASTERN_ASIA,
].sort();

/**
 * Every ISO 3166-1 alpha-2 code this project ships to — what the worldwide zone covers. Stripe
 * requires an explicit list for `shipping_address_collection`, and holding that list to one zone is
 * exactly what stops an address change from changing the rate.
 */
export const SHIPPABLE_ISO: readonly string[] = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ",
  "CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR",
  "GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP",
  "KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT",
  "MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG",
  "UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW",
].sort();

export interface ProductShipping {
  /** Cents charged when the delivery country is outside Australia and Asia. */
  worldwideCents: number;
  /** Cents charged when the delivery country is Australia or Asia. */
  australiaAndAsiaCents: number;
  /** The base name the charge carries. */
  label: string;
  /** The dispatch promise the product page prints. */
  dispatchDays: number;
  /** The delivery window the Stripe checkout advertises. */
  minBusinessDays: number;
  maxBusinessDays: number;
  /** A handling requirement beyond postage, if the product has one. */
  handlingNote?: string;
}

/**
 * Which products ship, and at what rate. A product ships precisely when it appears here, so
 * "which products ship" cannot drift away from "what they are charged".
 */
export const SHIPPING_RATES: Record<string, ProductShipping> = {
  "codex-physical": {
    worldwideCents: 3000,
    australiaAndAsiaCents: 5000,
    label: "Shipping",
    dispatchDays: 10,
    minBusinessDays: 5,
    maxBusinessDays: 21,
  },
  "hexahedron-cube": {
    worldwideCents: 2000,
    australiaAndAsiaCents: 2000,
    label: "Worldwide Shipping",
    dispatchDays: 10,
    minBusinessDays: 5,
    maxBusinessDays: 21,
    handlingNote: "Requires personal inspection & signing of Certificate of Authenticity",
  },
};

/** Whether this product is shipped at all. Digital goods must never acquire a shipping charge. */
export function requiresShipping(productId: string): boolean {
  return Object.prototype.hasOwnProperty.call(SHIPPING_RATES, productId);
}

/** Whether an order for this product needs a delivery address at all. */
export function requiresDeliveryAddress(productId: string): boolean {
  return requiresShipping(productId);
}

/** Where a delivery country falls. A missing or unknown country is charged the worldwide rate. */
export function deliveryZone(countryCode: string | null | undefined): Zone {
  if (!countryCode) return "WORLDWIDE";
  return AUSTRALIA_AND_ASIA_ISO.includes(String(countryCode).trim().toUpperCase())
    ? "AUSTRALIA_AND_ASIA"
    : "WORLDWIDE";
}

/**
 * The rate for this product delivered to this country. THE authority — every provider is priced
 * from this call, never from a figure supplied by the browser.
 */
export function shippingCentsFor(productId: string, countryCode: string | null | undefined): number {
  const rate = SHIPPING_RATES[productId];
  if (!rate) return 0; // a product that does not ship is charged nothing, ever
  return deliveryZone(countryCode) === "AUSTRALIA_AND_ASIA"
    ? rate.australiaAndAsiaCents
    : rate.worldwideCents;
}

/**
 * Every country an order priced for this zone may be delivered to.
 *
 * The list is the zone ITSELF, not "everywhere that ships": a session priced at the worldwide rate
 * must not accept an Australia-or-Asia address, or the buyer could take the $30 rate and ship to a
 * $50 country. Restricting the list is what makes the address and the charge agree by construction.
 */
export function allowedCountriesFor(zone: Zone): string[] {
  return zone === "AUSTRALIA_AND_ASIA"
    ? [...AUSTRALIA_AND_ASIA_ISO]
    : SHIPPABLE_ISO.filter((c) => !AUSTRALIA_AND_ASIA_ISO.includes(c));
}

/** The countries allowed for a given declared delivery country — one zone's worth, so the rate holds. */
export function allowedCountriesForCountry(countryCode: string | null | undefined): string[] {
  return allowedCountriesFor(deliveryZone(countryCode));
}

export function shippingLabel(productId: string): string {
  const rate = SHIPPING_RATES[productId];
  if (!rate) throw new Error(`${productId} does not ship`);
  return rate.label;
}

/**
 * The name the charge carries, disclosing the zone when the two zones differ — so a $50 charge
 * explains itself on the checkout instead of looking like an unexplained surcharge.
 */
export function shippingLabelFor(productId: string, countryCode: string | null | undefined): string {
  const rate = SHIPPING_RATES[productId];
  if (!rate) throw new Error(`${productId} does not ship`);
  if (rate.worldwideCents === rate.australiaAndAsiaCents) return rate.label;
  return `${rate.label} — ${deliveryZone(countryCode) === "AUSTRALIA_AND_ASIA" ? "Australia & Asia" : "Rest of world"}`;
}

export function deliveryWindow(productId: string): { min: number; max: number } {
  const rate = SHIPPING_RATES[productId];
  if (!rate) throw new Error(`${productId} does not ship`);
  return { min: rate.minBusinessDays, max: rate.maxBusinessDays };
}

/** Money in the form the pages print it. */
export function dollars(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}

/** The rate phrase the product page prints: "$30 worldwide (AU/Asia $50)". */
export function rateLine(productId: string): string | null {
  const rate = SHIPPING_RATES[productId];
  if (!rate) return null;
  const base = `${dollars(rate.worldwideCents)} worldwide`;
  return rate.australiaAndAsiaCents === rate.worldwideCents
    ? base
    : `${base} (AU/Asia ${dollars(rate.australiaAndAsiaCents)})`;
}

/** The whole shipping sentence the product page prints. */
export function shippingNote(productId: string): string | null {
  const rate = SHIPPING_RATES[productId];
  if (!rate) return null;
  const tail = rate.handlingNote ?? `Ships within ${rate.dispatchDays} days`;
  return `${rateLine(productId)} · ${tail}`;
}

/** What a buyer in this country pays in total. */
export function orderTotalCents(
  productId: string,
  priceUsd: number,
  countryCode: string | null | undefined
): number {
  return Math.round(priceUsd * 100) + shippingCentsFor(productId, countryCode);
}

/** The countries a buyer may pick from on a product page, grouped by the rate they carry. */
export function countryOptionsFor(productId: string): Array<{ code: string; zone: Zone; cents: number }> {
  const rate = SHIPPING_RATES[productId];
  if (!rate) return [];
  return SHIPPABLE_ISO.map((code) => ({
    code,
    zone: deliveryZone(code),
    cents: shippingCentsFor(productId, code),
  }));
}

/**
 * The one question this policy deliberately leaves to the owner rather than answering in code.
 */
export const OPEN_SHIPPING_QUESTIONS = [
  'New Zealand is charged the worldwide rate: under the M49 definition it is neither Asia nor Australia. If NZ should price with Australia, add "NZ" to AUSTRALIA_AND_ASIA_ISO — one deliberate line.',
] as const;
