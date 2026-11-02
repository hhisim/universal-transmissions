/**
 * The shared shell for Universal Transmissions correspondence.
 *
 * This is the one surface where the Living Grimoire cannot rely on its own stylesheet: Gmail, Outlook
 * and Apple Mail strip <style> blocks and ignore modern layout. Everything here is therefore a table
 * with inline styles, and the ornament is drawn in HTML rather than as an image so it survives image
 * blocking — a broken-image placeholder inside a receipt looks broken, not restrained.
 *
 * The visual language: a deep ground, violet ink, a single gold accent, wide-tracked small caps for
 * labels, a serif voice for the human sentences, and two quiet ornaments that bracket the message like
 * the ruled openings in the printed Codex. Restraint is the point — the artwork belongs on the site,
 * not competing with the receipt.
 */

const INK = "#EDE8FF";
const MUTED = "#b8b1cf";
const DIM = "#6f688b";
const GOLD = "#E7C56B";
const GOLD_SOFT = "#C9A85A";
const GROUND = "#030308";
const PANEL = "#0b0913";
const PANEL_HI = "#100d1c";
const RULE = "#241f35";
const VIOLET = "#6b4f9e";

const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

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

/**
 * Ornament drawn in HTML. `begin` opens the letter, `end` closes it with the monogram seal. Both are
 * deliberately low-contrast — an ornament that shouts is a logo.
 */
export function glyph(kind: "begin" | "end"): string {
  if (kind === "begin") {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 30px;">
      <tr>
        <td width="38%" style="border-top:1px solid ${RULE};font-size:0;line-height:0;">&nbsp;</td>
        <td width="24%" align="center" style="color:${GOLD_SOFT};font-size:9px;letter-spacing:.5em;padding:0 10px;font-family:${SANS};">&#9670;&nbsp;&#9670;&nbsp;&#9670;</td>
        <td width="38%" style="border-top:1px solid ${RULE};font-size:0;line-height:0;">&nbsp;</td>
      </tr>
    </table>`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:34px 0 0;">
    <tr>
      <td width="42%" style="border-top:1px solid ${RULE};font-size:0;line-height:0;">&nbsp;</td>
      <td width="16%" align="center" style="padding:0 12px;">
        <div style="display:inline-block;border:1px solid ${GOLD_SOFT};border-radius:50%;width:34px;height:34px;line-height:34px;text-align:center;color:${GOLD};font-family:${SERIF};font-size:12px;letter-spacing:.06em;">UT</div>
      </td>
      <td width="42%" style="border-top:1px solid ${RULE};font-size:0;line-height:0;">&nbsp;</td>
    </tr>
  </table>`;
}

export function layout(opts: { preheader: string; body: string; artLine?: string }): string {
  const artLine = opts.artLine ? escapeHtml(opts.artLine) : "CORRESPONDENCE";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Universal Transmissions</title>
</head>
<body style="margin:0;padding:0;background:${GROUND};-webkit-font-smoothing:antialiased;">
<div style="display:none;font-size:1px;color:${GROUND};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(opts.preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${GROUND};padding:40px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${PANEL};border:1px solid ${RULE};border-radius:3px;overflow:hidden;">

        <tr><td style="height:3px;background:${VIOLET};font-size:0;line-height:0;">&nbsp;</td></tr>

        <tr>
          <td style="padding:38px 40px 26px;border-bottom:1px solid ${RULE};">
            <div style="font-family:${SERIF};font-size:12.5px;letter-spacing:.46em;text-transform:uppercase;color:${GOLD};">
              Universal Transmissions
            </div>
            <div style="font-family:${SANS};font-size:9.5px;letter-spacing:.3em;text-transform:uppercase;color:${DIM};margin-top:11px;">
              Visual Alchemy &nbsp;&middot;&nbsp; Hakan Hisim
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:38px 40px 40px;font-family:${SANS};color:${INK};">
            ${opts.body}
          </td>
        </tr>

        <tr>
          <td style="padding:24px 40px 30px;border-top:1px solid ${RULE};background:${PANEL_HI};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:${SANS};font-size:10px;line-height:1.9;color:${DIM};">
                  Universal Transmissions &middot; <a href="https://universal-transmissions.com" style="color:${MUTED};text-decoration:none;">universal-transmissions.com</a><br>
                  This message concerns your order. Reply to it and a person answers.
                </td>
                <td align="right" style="font-family:${SERIF};font-size:8.5px;letter-spacing:.3em;text-transform:uppercase;color:#4b4560;white-space:nowrap;">
                  ${artLine}
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>

      <div style="font-family:${SERIF};color:#3a3448;font-size:9px;letter-spacing:.42em;text-transform:uppercase;padding:22px 0 6px;">
        Living Grimoire
      </div>
    </td>
  </tr>
</table>
</body>
</html>`;
}
