import type { Metadata } from "next";
import Link from "next/link";
import {
  ARCHIVE_FIELDS, BASIS_LABEL, BASIS_NOTE, FIELD_LABELS, MEASURED_LOOKING,
  SYSTEMS, archiveHref, recordFromId, recordsInSystem, relationshipSystems,
  representativeSet, researchRouteForSystem, sharedWith, toArchiveRecord,
  SYSTEMS_WITH_RESEARCH_ROUTE,
} from "@/lib/codex-archive";

export const metadata: Metadata = {
  alternates: { canonical: "/codex/archive" },
  title: "The Correspondence Archive",
  description:
    "Explore the UT Codex as an archive: select a record, follow the relationships its own fields support, and ask the Oracle about it. Symbolic correspondences, not measurements.",
};

const MAX_NAMES_SHOWN = 10;
const MAX_SHARED_GROUPS = 5;

function first(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : Array.isArray(v) && typeof v[0] === "string" ? v[0] : "";
}

function safeReturn(v: string): string {
  return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "";
}

export default function ArchivePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp = searchParams || {};
  const rawEntry = first(sp.entry).trim().slice(0, 200);
  const from = safeReturn(first(sp.from).slice(0, 200));

  /* ── no selection: the way in ─────────────────────────────────────────── */
  if (!rawEntry) {
    const seeds = representativeSet(8);
    return (
      <main className="cx-wrap">
        <style>{CSS}</style>
        <header className="cx-head">
          <p className="cx-kicker">Universal Transmissions — Codex</p>
          <h1 className="cx-title">The Correspondence Archive</h1>
          <p className="cx-lede">
            The Codex as a place you can walk through. Select a record and see what its own
            fields connect it to, why those connections exist, and where they lead. Every
            link here comes from the corpus — nothing is inferred to fill a gap.
          </p>
          <p className="cx-honest">
            These are <strong>symbolic correspondences</strong> recorded in the UT Codex.
            Fields like Frequency or Physiology are assignments, not measurements, and
            nothing here is an empirical claim about the world.
          </p>
        </header>

        <section className="cx-section" aria-labelledby="cx-seeds-h">
          <h2 className="cx-h2" id="cx-seeds-h">A way in</h2>
          <p className="cx-sub">
            One record from each system, chosen for the breadth of the archive its own
            values reach into — not for how many links it has, which measures almost nothing
            in a corpus this densely cross-linked.
          </p>
          <ul className="cx-grid">
            {seeds.map((s) => (
              <li key={s.id}>
                <Link className="cx-card" href={archiveHref(s.id, "/codex/archive")}>
                  <span className="cx-chip" style={{ color: "#e040fb" }}>
                    {s.sys}
                  </span>
                  <span className="cx-card-name">{s.e}</span>
                  <span className="cx-card-meta">reaches {s.reaches} systems</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="cx-section" aria-labelledby="cx-sys-h">
          <h2 className="cx-h2" id="cx-sys-h">Or choose a system</h2>
          <p className="cx-sub">
            {SYSTEMS.length} systems, {SYSTEMS.reduce((n, s) => n + s.count, 0)} records.
          </p>
          <ul className="cx-sys">
            {SYSTEMS.map((s) => (
              <li key={s.sys}>
                <Link className="cx-syslink" href={`/codex/archive?system=${encodeURIComponent(s.sys)}`}>
                  <span className="cx-sysname">{s.sys}</span>
                  <span className="cx-syscount">{s.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    );
  }

  /* ── an identifier that is not in the corpus ──────────────────────────── */
  const pair = recordFromId(rawEntry);
  if (!pair) {
    return (
      <main className="cx-wrap">
        <style>{CSS}</style>
        <header className="cx-head">
          <p className="cx-kicker">Universal Transmissions — Codex</p>
          <h1 className="cx-title">That record is not in the corpus</h1>
          <p className="cx-lede">
            The identifier supplied does not resolve to a record in the Codex. Nothing is
            substituted for it — a different record shown here would read as the one you
            asked for.
          </p>
          <Link className="cx-back" href="/codex/archive">← BACK TO THE ARCHIVE</Link>
        </header>
      </main>
    );
  }

  /* ── the selected record ──────────────────────────────────────────────── */
  const entry = toArchiveRecord(
    // recordFromId already verified the pair exists
    { sys: pair.sys, e: pair.e } as never
  );
  const groups = relationshipSystems(pair.sys, pair.e);
  const shared = sharedWith(pair.sys, pair.e).slice(0, MAX_SHARED_GROUPS);
  const research = researchRouteForSystem(pair.sys);
  const selfHref = archiveHref(entry.id, "/codex/archive");
  const oracleHref =
    `/oracle?entryId=${encodeURIComponent(entry.id)}` +
    `&q=${encodeURIComponent(
      `Explain the recorded correspondences of “${entry.e}” (the ${entry.sys} entry) and say which of them are symbolic assignments rather than measured.`
    )}` +
    `&from=${encodeURIComponent(selfHref)}`;

  const grouped = (["recorded", "traditional", "interpretation"] as const).map((b) => ({
    basis: b,
    fields: entry.fields.filter((f) => f.basis === b),
  })).filter((g) => g.fields.length);

  return (
    <main className="cx-wrap">
      <style>{CSS}</style>

      <nav className="cx-crumb" aria-label="Breadcrumb">
        {from ? (
          <Link className="cx-back" href={from}>← RETURN TO WHERE YOU WERE</Link>
        ) : (
          <Link className="cx-back" href="/codex/archive">← THE CORRESPONDENCE ARCHIVE</Link>
        )}
      </nav>

      <header className="cx-head">
        <p className="cx-kicker">Codex record — {entry.sys}</p>
        <h1 className="cx-title">{entry.e}</h1>
        <p className="cx-lede">
          {entry.fields.length} recorded correspondences across the corpus. Each is shown
          with what kind of claim it is.
        </p>
      </header>

      {/* ── the record's own content, grouped by kind of claim ── */}
      <section className="cx-section" aria-labelledby="cx-fields-h">
        <h2 className="cx-h2" id="cx-fields-h">What this record holds</h2>
        {grouped.map((g) => (
          <div className="cx-basisgroup" key={g.basis}>
            <h3 className="cx-h3">
              <span className={`cx-basis cx-basis-${g.basis}`}>{BASIS_LABEL[g.basis]}</span>
            </h3>
            <p className="cx-basisnote">{BASIS_NOTE[g.basis]}</p>
            <dl className="cx-fields">
              {g.fields.map((f) => (
                <div className="cx-field" key={`${g.basis}-${f.key}`}>
                  <dt>{f.label}</dt>
                  <dd>
                    {f.value}
                    {MEASURED_LOOKING.has(f.key) && (
                      <span className="cx-flag">
                        recorded as a symbolic correspondence in this corpus — not a measurement
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </section>

      {/* ── relationships ── */}
      <section className="cx-section" aria-labelledby="cx-rel-h">
        <h2 className="cx-h2" id="cx-rel-h">Where this record leads</h2>
        {groups.length === 0 ? (
          <p className="cx-sub">
            None of this record&rsquo;s fields names another Codex record, so no links are
            shown. That absence is the corpus&rsquo;s, not an omission here.
          </p>
        ) : (
          <>
            <p className="cx-sub">
              This record&rsquo;s own values name records in <strong>{groups.length}</strong>{" "}
              other systems. Each group shows a few; the number is the true total.
            </p>
            <ul className="cx-rel">
              {groups.map((g) => (
                <li className="cx-relitem" key={g.sys}>
                  <p className="cx-relwhy">
                    <strong>{g.count}</strong> {g.count === 1 ? "record" : "records"} in the{" "}
                    {g.sys} system, reached through this record&rsquo;s own fields.
                  </p>
                  <p className="cx-relbasis">
                    <span className={`cx-basis cx-basis-${g.basis}`}>{g.basisLabel}</span>
                  </p>
                  <ul className="cx-sharedlist">
                    {g.examples.map((r, i) => (
                      <li key={`${r.target.id}-${i}`}>
                        <Link className="cx-rellink" href={archiveHref(r.target.id, selfHref)}>
                          {r.target.e}
                        </Link>
                        <span className="cx-relvia">
                          via {r.fieldLabel}: &ldquo;{r.value}&rdquo;
                        </span>
                      </li>
                    ))}
                  </ul>
                  {g.count > g.examples.length && (
                    <p className="cx-more">
                      &hellip;and {g.count - g.examples.length} more in {g.sys}.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {shared.length > 0 && (
          <>
            <h3 className="cx-h3 cx-h3-space">Shares a recorded correspondence</h3>
            <ul className="cx-shared">
              {shared.map((s) => (
                <li className="cx-sharedgroup" key={`${s.field}-${s.value}`}>
                  <p className="cx-sharedwhy">{s.rationale}</p>
                  <p className="cx-rellabel">
                    {s.fieldLabel}: <strong>{s.value}</strong>
                    <span className={`cx-basis cx-basis-${s.basis}`}>{BASIS_LABEL[s.basis]}</span>
                  </p>
                  <ul className="cx-sharedlist">
                    {s.others.map((o) => (
                      <li key={o.id}>
                        <Link className="cx-rellink" href={archiveHref(o.id, selfHref)}>
                          {o.e} <span className="cx-relsys">{o.sys}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {s.total > s.others.length && (
                    <p className="cx-more">
                      …and {s.total - s.others.length} further records share this value.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ── onward ── */}
      <section className="cx-section" aria-labelledby="cx-onward-h">
        <h2 className="cx-h2" id="cx-onward-h">Onward</h2>
        <div className="cx-onward">
          <div className="cx-onwarditem">
            <h3 className="cx-h3">Continue in the Codex</h3>
            <p className="cx-basisnote">
              The standalone Codex experience, where the full matrix and its modes live.
            </p>
            <Link className="cx-out" href="/experience/correspondence-codex">
              Open the Correspondence Codex →
            </Link>
          </div>

          <div className="cx-onwarditem">
            <h3 className="cx-h3">Research</h3>
            {research ? (
              <>
                <p className="cx-basisnote">
                  The archive&rsquo;s own <strong>{pair.sys}</strong> lattice is documented in
                  the {research.room} room, which is what makes this route real rather than
                  decorative.
                </p>
                <p className="cx-quote">“{research.why}”</p>
                <Link className="cx-out" href={research.href}>
                  Read the {research.room} room →
                </Link>
              </>
            ) : (
              <p className="cx-basisnote">
                No research room documents the {pair.sys} lattice, so no route is offered
                from this record. Only{" "}
                {SYSTEMS_WITH_RESEARCH_ROUTE.join(" and ")} currently have one.
              </p>
            )}
          </div>
        </div>
        <p className="cx-basisnote cx-narrow">
          There is no artwork or Journal route from a Codex record: no record in either
          registry names a Codex entry, so none is offered. The Codex anchors that do exist
          run the other way — from the research rooms into the Codex.
        </p>
      </section>

      {/* ── contextual Oracle, carrying the stable identifier only ── */}
      <section className="cx-section cx-oracle" aria-labelledby="cx-oracle-h">
        <h2 className="cx-h2" id="cx-oracle-h">Ask the Oracle about this record</h2>
        <p className="cx-basisnote">
          The question goes to the Oracle carrying this record&rsquo;s stable identifier and
          nothing descriptive. The server resolves the record itself, so a rewritten URL
          cannot present a different record as this one.
        </p>
        <Link className="cx-ask" href={oracleHref}>
          Ask about “{entry.e}” →
        </Link>
        <p className="cx-ident">
          identifier <code>{entry.id}</code>
        </p>
      </section>
    </main>
  );
}

const CSS = `
.cx-wrap{max-width:1100px;margin:0 auto;padding:104px 24px 120px;color:var(--ut-white,#f0ecff)}
.cx-crumb{margin-bottom:20px}
.cx-back,.cx-out,.cx-ask{display:inline-block;font-family:var(--font-mono,monospace);font-size:11px;
  letter-spacing:.18em;text-transform:uppercase;color:#22d3ee;text-decoration:none;
  border-bottom:1px solid rgba(34,211,238,.35);padding-bottom:2px}
.cx-back:hover,.cx-out:hover,.cx-ask:hover{color:#e040fb;border-color:rgba(224,64,251,.5)}
.cx-head{margin-bottom:44px;border-bottom:1px solid rgba(255,255,255,.08);padding-bottom:26px}
.cx-kicker{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:.3em;
  text-transform:uppercase;color:#e040fb;opacity:.85;margin:0 0 12px}
.cx-title{font-family:var(--font-display,serif);font-size:clamp(30px,5vw,54px);line-height:1.06;
  margin:0 0 14px;letter-spacing:-.01em}
.cx-lede{font-size:15px;line-height:1.65;color:rgba(240,236,255,.72);max-width:64ch;margin:0 0 14px}
.cx-honest{font-size:13px;line-height:1.7;color:rgba(240,236,255,.6);max-width:64ch;margin:0;
  border-left:2px solid rgba(224,64,251,.4);padding-left:14px}
.cx-honest strong{color:#f0ecff}
.cx-section{margin:0 0 52px}
.cx-h2{font-family:var(--font-display,serif);font-size:24px;margin:0 0 8px}
.cx-h3{font-size:13px;letter-spacing:.14em;text-transform:uppercase;margin:26px 0 8px;
  font-family:var(--font-mono,monospace);color:rgba(240,236,255,.8)}
.cx-h3-space{margin-top:34px}
.cx-sub{font-size:13.5px;line-height:1.6;color:rgba(240,236,255,.6);max-width:62ch;margin:0 0 18px}
.cx-grid{list-style:none;padding:0;margin:0;display:grid;gap:1px;
  grid-template-columns:repeat(auto-fill,minmax(240px,1fr));background:rgba(255,255,255,.07)}
.cx-card{display:block;padding:18px 18px 20px;background:#05040c;text-decoration:none;
  color:inherit;height:100%;transition:background .18s ease}
.cx-card:hover,.cx-card:focus-visible{background:#0c0a1c}
.cx-chip{display:block;font-family:var(--font-mono,monospace);font-size:9px;letter-spacing:.22em;
  text-transform:uppercase;margin-bottom:9px;color:#e040fb}
.cx-card-name{display:block;font-size:17px;line-height:1.25;margin-bottom:7px}
.cx-card-meta{display:block;font-family:var(--font-mono,monospace);font-size:10px;
  letter-spacing:.12em;color:rgba(240,236,255,.45)}
.cx-sys{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px}
.cx-syslink{display:flex;align-items:baseline;gap:8px;padding:8px 13px;
  border:1px solid rgba(255,255,255,.12);text-decoration:none;color:inherit;
  font-family:var(--font-mono,monospace);font-size:11px;letter-spacing:.1em}
.cx-syslink:hover,.cx-syslink:focus-visible{border-color:rgba(224,64,251,.55);background:rgba(224,64,251,.07)}
.cx-syscount{color:rgba(240,236,255,.42);font-size:10px}
.cx-basisgroup{margin:0 0 30px}
.cx-basis{display:inline-block;font-family:var(--font-mono,monospace);font-size:9px;
  letter-spacing:.16em;text-transform:uppercase;padding:3px 8px;border:1px solid currentColor;
  margin-left:10px;vertical-align:middle}
.cx-basis-recorded{color:#22d3ee}
.cx-basis-traditional{color:#d4a847}
.cx-basis-interpretation{color:#e040fb}
.cx-basisnote{font-size:12.5px;line-height:1.65;color:rgba(240,236,255,.55);max-width:62ch;margin:6px 0 14px}
.cx-fields{margin:0;display:grid;gap:1px;background:rgba(255,255,255,.06)}
.cx-field{display:grid;grid-template-columns:150px 1fr;gap:16px;padding:11px 14px;background:#05040c}
.cx-field dt{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:.14em;
  text-transform:uppercase;color:rgba(240,236,255,.5);padding-top:2px}
.cx-field dd{margin:0;font-size:14px;line-height:1.6}
.cx-flag{display:block;margin-top:6px;font-size:11px;line-height:1.5;color:#d4a847;opacity:.9}
.cx-rel{list-style:none;padding:0;margin:0;display:grid;gap:1px;background:rgba(255,255,255,.06)}
.cx-relitem{padding:16px;background:#05040c}
.cx-relwhy{margin:0 0 9px;font-size:14px;line-height:1.6;color:rgba(240,236,255,.86)}
.cx-relbasis{margin:0 0 10px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.cx-rellabel{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:.12em;
  text-transform:uppercase;color:rgba(240,236,255,.45)}
.cx-rellink{font-size:14px;color:#22d3ee;text-decoration:none;border-bottom:1px solid rgba(34,211,238,.28)}
.cx-rellink:hover,.cx-rellink:focus-visible{color:#e040fb;border-color:rgba(224,64,251,.5)}
.cx-relsys{font-family:var(--font-mono,monospace);font-size:9px;letter-spacing:.16em;
  color:rgba(240,236,255,.4);margin-left:6px}
.cx-shared{list-style:none;padding:0;margin:0;display:grid;gap:18px}
.cx-sharedgroup{border-left:2px solid rgba(255,255,255,.12);padding-left:16px}
.cx-sharedwhy{margin:0 0 8px;font-size:13.5px;line-height:1.6;color:rgba(240,236,255,.8)}
.cx-sharedlist{list-style:none;padding:0;margin:8px 0 0;display:flex;flex-wrap:wrap;gap:6px 18px}
.cx-relvia{display:block;font-family:var(--font-mono,monospace);font-size:10px;
  letter-spacing:.08em;color:rgba(240,236,255,.42);margin-top:4px}
.cx-more{font-size:12px;color:rgba(240,236,255,.45);margin:10px 0 0}
.cx-onward{display:grid;gap:1px;background:rgba(255,255,255,.07);margin-bottom:22px}
.cx-onwarditem{padding:20px;background:#05040c}
.cx-onwarditem .cx-h3{margin-top:0}
.cx-quote{font-size:12.5px;line-height:1.6;color:rgba(240,236,255,.5);font-style:italic;
  margin:0 0 14px;max-width:60ch}
.cx-narrow{max-width:64ch}
.cx-oracle{border:1px solid rgba(224,64,251,.22);padding:24px;background:rgba(224,64,251,.03)}
.cx-ask{font-size:12px;margin-top:4px}
.cx-ident{margin:16px 0 0;font-family:var(--font-mono,monospace);font-size:10px;
  letter-spacing:.1em;color:rgba(240,236,255,.4)}
.cx-ident code{color:rgba(240,236,255,.6)}
@media (max-width:560px){
  .cx-wrap{padding:88px 16px 96px}
  .cx-field{grid-template-columns:1fr;gap:5px}
  .cx-grid{grid-template-columns:1fr}
}
`;
