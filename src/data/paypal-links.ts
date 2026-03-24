/**
 * PayPal Payment Links
 *
 * PayPal credentials are NOT configured in the current environment.
 *
 * To enable PayPal payments:
 * 1. Set in environment: PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_ACCESS_TOKEN
 * 2. Use PayPal Checkout SDK or create payment links via PayPal Dashboard
 *
 * For manual invoicing / PayPal.Me:
 * - Set up PayPal.Me at paypal.me/YourHandle
 * - Or use PayPal Business to send invoices
 *
 * When ready, add your PayPal payment links here using the product IDs:
 *   "codex-physical" → https://paypal.me/yourhandle/215
 *   "codex-digital"   → https://paypal.me/yourhandle/99
 *   "chakra-4k"       → https://paypal.me/yourhandle/99
 *   "chakra-8k"       → https://paypal.me/yourhandle/99
 *   "hexahedron-cube" → https://paypal.me/yourhandle/109
 */

export const paypalLinks: Record<string, string> = {
  // Replace with actual PayPal.Me links or invoice URLs when ready
  "codex-physical": "",
  "codex-digital": "",
  "chakra-4k": "",
  "chakra-8k": "",
  "hexahedron-cube": "",
};
