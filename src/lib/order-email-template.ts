/**
 * The shared shell for Universal Transmissions transactional email.
 *
 * Built as tables with inline styles on purpose: this is the one surface where the Living Grimoire
 * cannot rely on its own stylesheet — Gmail, Outlook and Apple Mail strip <style> blocks and ignore
 * most modern layout. Dark ground, violet ink and the gold accent are carried literally so the brand
 * survives everywhere, and the whole thing degrades to a readable single column at 320px.
 */

const INK = "#EDE8FF";
const MUTED = "#b8b1cf";
const DIM = "#7d769b";
const GOLD = "#E7C56B";
const GROUND = "#030308";
const PANEL = "#0c0a16";
const RULE = "#262238";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Money as the customer paid it. Falls back to the bare amount rather than inventing a currency. */
export function formatMoney(cents: number | null | undefined, currency: string | null | undefined): string {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return "—";
  const code = (currency ?? "usd").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`;
  }
}

export function layout(opts: { preheader: string; body: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Universal Transmissions</title>
</head>
<body style="margin:0;padding:0;background:${GROUND};">
<div style="display:none;font-size:1px;color:${GROUND};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${GROUND};padding:32px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${PANEL};border:1px solid ${RULE};border-radius:14px;overflow:hidden;">
        <tr>
          <td style="padding:34px 34px 22px;border-bottom:1px solid ${RULE};">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:.34em;text-transform:uppercase;color:${GOLD};">
              Universal Transmissions
            </div>
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:${DIM};margin-top:8px;">
              Visual Alchemy · Hakan Hisim
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 34px 34px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
            ${opts.body}
          </td>
        </tr>
        <tr>
          <td style="padding:22px 34px 30px;border-top:1px solid ${RULE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            <div style="color:${DIM};font-size:11px;line-height:1.8;">
              Universal Transmissions · <a href="https://universal-transmissions.com" style="color:${MUTED};text-decoration:none;">universal-transmissions.com</a><br>
              This message concerns your order. If you did not place one, reply and we will look into it.
            </div>
          </td>
        </tr>
      </table>
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#4b4560;font-size:10px;letter-spacing:.14em;text-transform:uppercase;padding:18px 0 4px;">
        Living Grimoire
      </div>
    </td>
  </tr>
</table>
</body>
</html>`;
}
