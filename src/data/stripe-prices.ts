/**
 * Stripe Price IDs
 *
 * To create products and prices via Stripe CLI:
 *
 *   # Login first (if needed)
 *   stripe login
 *
 *   # List existing products
 *   stripe products list
 *
 *   # Create products and prices for each product below
 *   stripe products create --name="Universal Transmissions Codex Vol.1 — Physical Edition" \
 *     --description="150-page art book, PUR-bound, museum-grade paper"
 *   stripe prices create --product="prod_xxx" --unit-amount=21500 --currency=usd
 *
 *   stripe products create --name="Universal Transmissions Codex Vol.1 — Digital Edition" \
 *     --description="PDF Edition, 150 pages"
 *   stripe prices create --product="prod_xxx" --unit-amount=9900 --currency=usd
 *
 *   stripe products create --name="Chakra 4K Loop Pack" \
 *     --description="13 videos, 30 second loops, 4K and 2K, Alpha Channel Loops"
 *   stripe prices create --product="prod_xxx" --unit-amount=9900 --currency=usd
 *
 *   stripe products create --name="Chakra 8K Loop Pack" \
 *     --description="Same as 4K pack but rendered at 8K resolution"
 *   stripe prices create --product="prod_xxx" --unit-amount=9900 --currency=usd
 *
 *   stripe products create --name="Xeno Frequency Hexahedron Art Cube" \
 *     --description="Collector's Edition Prototype Run — only 10 exist"
 *   stripe prices create --product="prod_xxx" --unit-amount=10900 --currency=usd
 *
 * Run `stripe prices list` to find the price_xxx IDs and fill them in below.
 */

export const stripePriceIds: Record<string, string> = {
  // Physical Codex — $215.00 USD
  "codex-physical": "price_REPLACE_WITH_STRIPE_CLI_OUTPUT",

  // Digital Codex — $99.00 USD
  "codex-digital": "price_REPLACE_WITH_STRIPE_CLI_OUTPUT",

  // Chakra 4K Loop Pack — $99.00 USD
  "chakra-4k": "price_REPLACE_WITH_STRIPE_CLI_OUTPUT",

  // Chakra 8K Loop Pack — $99.00 USD
  "chakra-8k": "price_REPLACE_WITH_STRIPE_CLI_OUTPUT",

  // Xeno Frequency Hexahedron Art Cube — $109.00 USD
  "hexahedron-cube": "price_REPLACE_WITH_STRIPE_CLI_OUTPUT",
};
