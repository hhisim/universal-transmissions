import type { Metadata } from "next";
import Link from "next/link";
import {
  BASIS_LABEL, BASIS_NOTE, MEASURED_LOOKING, SYSTEMS, SYSTEMS_WITH_RESEARCH_ROUTE,
  archiveHref, archiveRecordFor, isKnownSystem, recordFromId, recordsInSystem,
  relationshipGroups, representativeSet, researchRouteForSystem, sharedWith, systemHref,
} from "@/lib/codex-archive";

export const metadata: Metadata = {
  alternates: { canonical: "/codex/archive" },
  title: "The Correspondence Archive",
  description:
    "Explore the UT Codex as an archive: select a record, follow the relationships its own fields support, and ask the Oracle about it. Symbolic correspondences, not measurements.",
};

const TOP_GROUPS_IN_OVERVIEW = 6;

function first(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : Array.isArray(v) && typeof v[0] === "string" ? v[0] : "";
}

function safeReturn(v: string): string {
  return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : "";
}

/** Visitor-facing name for a system, e.g. PLATONIC_SOLIDS → Platonic Solids. */
function prettySystem(sys: string): string {
  return sys
    .split("_")
    .map((w) => (w.length <= 2 ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");
}

const Shell = ({ children }: { children: React.ReactNode }) => (
  <main className="cx-wrap">
    <style>{CSS}</style>
    {children}
  </main>
);

const UnknownRecord = () => (
  <Shell>
    <header className="cx-head">
      <p className="cx-kicker">Universal Transmissions — Codex</p>
      <h1 className="cx-title">That record isn&rsquo;t in the archive</h1>
      <p className="cx-lede">
        Nothing here is shown in its place. A different record would read as the one you
        asked for.
      </p>
      <Link className="cx-back" href="/codex/archive">← BACK TO THE ARCHIVE</Link>
    </header>
  </Shell>
);

export default function ArchivePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp = searchParams || {};
  const rawEntry = first(sp.entry).trim().slice(0, 200);
  const rawSystem = first(sp.system).trim().slice(0, 80);
  const from = safeReturn(first(sp.from).slice(0, 200));

  /* ── a system was chosen ─────────────────────────────────────────────── */
  if (!rawEntry && rawSystem) {
    const sys = rawSystem.toUpperCase().replace(/[\s-]+/g, "_");
    if (!isKnownSystem(sys)) {
      return (
        <Shell>
          <header className="cx-head">
            <p className="cx-kicker">Universal Transmissions — Codex</p>
            <h1 className="cx-title">&ldquo;{rawSystem}&rdquo; isn&rsquo;t a system in the archive</h1>
            <p className="cx-lede">
              The Codex records {SYSTEMS.length} systems. Nothing is substituted for the one
              you asked for.
            </p>
            <Link className="cx-back" href="/codex/archive">← BACK TO THE ARCHIVE</Link>
          </header>
          <section className="cx-section">
            <h2 className="cx-h2">The systems that do exist</h2>
            <ul className="cx-sys">
              {SYSTEMS.map((s) => (
                <li key={s.sys}>
                  <Link className="cx-syslink" href={systemHref(s.sys)}>
                    <span className="cx-sysname">{prettySystem(s.sys)}</span>
                    <span className="cx-syscount">{s.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Shell>
      );
    }
    const records = recordsInSystem(sys);
    return (
      <Shell>
        <nav className="cx-crumb" aria-label="Breadcrumb">
          <Link className="cx-back" href="/codex/archive">← THE CORRESPONDENCE ARCHIVE</Link>
        </nav>
        <header className="cx-head">
          <p className="cx-kicker">Codex system</p>
          <h1 className="cx-title">{prettySystem(sys)}</h1>
          <p className="cx-lede">
            {records.length} {records.length === 1 ? "record" : "records"} in this system.
            Select one to see what its own fields connect it to.
          </p>
        </header>
        <section className="cx-section">
          <h2 className="cx-h2">Records in {prettySystem(sys)}</h2>
          <ul className="cx-grid">
            {records.map((r) => (
              <li key={r.id}>
                <Link className="cx-card" href={archiveHref(r.id, systemHref(sys))}>
                  <span className="cx-card-name">{r.e}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </Shell>
    );
  }

  /* ── no selection: the way in ─────────────────────────────────────────── */
  if (!rawEntry) {
    const seeds = representativeSet(8);
    return (
      <Shell>
        <header className="cx-head">
          <p className="cx-kicker">Universal Transmissions — Codex</p>
          <h1 className="cx-title">The Correspondence Archive</h1>
          <p className="cx-lede">
            The Codex as a place you can walk through. Select a record and see what its own
            fields connect it to, why those connections exist, and where they lead. Every link
            here comes from the corpus — nothing is inferred to fill a gap.
          </p>
          <p className="cx-honest">
            These are <strong>symbolic correspondences</strong> recorded in the UT Codex.
            Fields like Frequency or Physiology are assignments, not measurements, and nothing
            here is an empirical claim about the world.
          </p>
        </header>

        <section className="cx-section" aria-labelledby="cx-seeds-h">
          <h2 className="cx-h2" id="cx-seeds-h">A way in</h2>
          <p className="cx-sub">
            One record from each system, chosen for the breadth of the archive its own values
            reach into — not for how many links it has, which measures almost nothing in a
            corpus this densely cross-linked.
          </p>
          <ul className="cx-grid">
            {seeds.map((s) => (
              <li key={s.id}>
                <Link className="cx-card" href={archiveHref(s.id, "/codex/archive")}>
                  <span className="cx-chip">{prettySystem(s.sys)}</span>
                  <span className="cx-card-name">{s.e}</span>
                  <span className="cx-card-meta">reaches {s.reaches} systems</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="cx-section" aria-labelledby="cx-sys-h">
          <h2 className="cx-h2" id="cx-sys-h">Or browse a system</h2>
          <p className="cx-sub">
            {SYSTEMS.length} systems, {SYSTEMS.reduce((n, s) => n + s.count, 0)} records.
          </p>
          <ul className="cx-sys">
            {SYSTEMS.map((s) => (
              <li key={s.sys}>
                <Link className="cx-syslink" href={systemHref(s.sys)}>
                  <span className="cx-sysname">{prettySystem(s.sys)}</span>
                  <span className="cx-syscount">{s.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </Shell>
    );
  }

  /* ── the selected record ──────────────────────────────────────────────── */
  const pair = recordFromId(rawEntry);
  if (!pair) return <UnknownRecord />;
  const entry = archiveRecordFor(pair.sys, pair.e);
  if (!entry) return <UnknownRecord />;

  const { groups, unresolved, ambiguous } = relationshipGroups(pair.sys, pair.e, 3);
  const shared = sharedWith(pair.sys, pair.e).slice(0, 4);
  const research = researchRouteForSystem(pair.sys);
  const selfHref = archiveHref(entry.id, "/codex/archive");
  const totalTargets = groups.reduce((n, g) => n + g.total, 0);
  const sysName = prettySystem(entry.sys);
  const oracleHref =
    `/oracle?entryId=${encodeURIComponent(entry.id)}` +
    `&q=${encodeURIComponent(
      `Explain the recorded correspondences of “${entry.e}” (the ${sysName} entry) and say which of them are symbolic assignments rather than measured.`
    )}` +
    `&from=${encodeURIComponent(selfHref)}`;

  const grouped = (["recorded", "traditional", "interpretation"] as const)
    .map((b) => ({ basis: b, fields: entry.fields.filter((f) => f.basis === b) }))
    .filter((g) => g.fields.length);

  return (
    <Shell>
      <nav className="cx-crumb" aria-label="Breadcrumb">
        {from ? (
          <Link className="cx-back" href={from}>← RETURN TO WHERE YOU WERE</Link>
        ) : (
          <Link className="cx-back" href="/codex/archive">← THE CORRESPONDENCE ARCHIVE</Link>
        )}
      </nav>

      {/* Selection stays at the top, with the Oracle action beside it. */}
      <header className="cx-head">
        <p className="cx-kicker">
          <Link className="cx-sysinline" href={systemHref(entry.sys)}>{sysName}</Link>
          {" — Codex record"}
        </p>
        <h1 className="cx-title">{entry.e}</h1>
        <p className="cx-lede">
          {entry.fields.length} recorded correspondences{totalTargets > 0 && (
            <> reaching <strong>{totalTargets}</strong> other {totalTargets === 1 ? "record" : "records"} across{" "}
            <strong>{groups.length}</strong> systems</>
          )}. {entry.fields.length > 0 ? "Each is shown with what kind of claim it is." : ""}
        </p>
        <p className="cx-askrow">
          <Link className="cx-ask" href={oracleHref}>
            Ask the Oracle about {entry.e} →
          </Link>
        </p>
      </header>

      {/* ── relationship overview: readable at a glance, detail on demand ── */}
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
              Reached through this record&rsquo;s own fields. Each count is the number of
              distinct records, and each group opens to show how.
            </p>
            <ul className="cx-overview">
              {groups.slice(0, TOP_GROUPS_IN_OVERVIEW).map((g) => (
                <li key={`ov-${g.sys}`}>
                  <a className="cx-ovchip" href={`#rel-${g.sys}`}>
                    <span className="cx-ovsys">{prettySystem(g.sys)}</span>
                    <span className="cx-ovcount">{g.total}</span>
                  </a>
                </li>
              ))}
              {groups.length > TOP_GROUPS_IN_OVERVIEW && (
                <li>
                  <span className="cx-ovchip cx-ovrest">
                    +{groups.length - TOP_GROUPS_IN_OVERVIEW} more systems
                  </span>
                </li>
              )}
            </ul>

            <div className="cx-rel">
              {groups.map((g) => (
                <details className="cx-relitem" key={g.sys} id={`rel-${g.sys}`}>
                  <summary className="cx-relsum">
                    <span className="cx-relsumsys">{prettySystem(g.sys)}</span>
                    <span className="cx-relsumcount">
                      {g.total} {g.total === 1 ? "record" : "records"}
                    </span>
                    <span className="cx-relbasis inline">
                      {g.bases.map((b) => (
                        <span className={`cx-basis cx-basis-${b}`} key={b}>{BASIS_LABEL[b]}</span>
                      ))}
                    </span>
                  </summary>
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
                  {g.total > g.examples.length && (
                    <p className="cx-more">
                      &hellip;and {g.total - g.examples.length} more in {prettySystem(g.sys)}.
                    </p>
                  )}
                </details>
              ))}
            </div>
          </>
        )}

        {(unresolved.length > 0 || ambiguous.length > 0) && (
          <details className="cx-relitem cx-quiet" id="rel-unlinked">
            <summary className="cx-relsum">
              <span className="cx-relsumsys">Values shown without a link</span>
              <span className="cx-relsumcount">{unresolved.length + ambiguous.length}</span>
            </summary>
            <p className="cx-basisnote">
              These are readable as recorded, but they name no single record in the system
              their field belongs to — so no link is invented for them.
            </p>
            <ul className="cx-plainlist">
              {ambiguous.map((a, i) => (
                <li key={`amb-${i}`}>
                  <strong>{a.value}</strong>
                  <span className="cx-plainwhy">
                    {a.fieldLabel}: could be any of {a.candidates.join(", ")}
                  </span>
                </li>
              ))}
              {unresolved.map((u, i) => (
                <li key={`unr-${i}`}>
                  <strong>{u.value}</strong>
                  <span className="cx-plainwhy">
                    {u.fieldLabel}: no record by this name in that system
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {shared.length > 0 && (
          <details className="cx-relitem cx-quiet" id="rel-shared">
            <summary className="cx-relsum">
              <span className="cx-relsumsys">Shares a recorded correspondence</span>
              <span className="cx-relsumcount">{shared.length}</span>
            </summary>
            <ul className="cx-shared">
              {shared.map((s) => (
                <li className="cx-sharedgroup" key={`${s.field}-${s.value}`}>
                  <p className="cx-rellabel">
                    {s.fieldLabel}: <strong>{s.value}</strong>
                    <span className={`cx-basis cx-basis-${s.basis}`}>{s.basisLabel}</span>
                  </p>
                  <p className="cx-sharedwhy">
                    {s.total} other Codex {s.total === 1 ? "record carries" : "records carry"}{" "}
                    the same recorded correspondence.
                  </p>
                  <ul className="cx-sharedlist">
                    {s.others.map((o) => (
                      <li key={o.id}>
                        <Link className="cx-rellink" href={archiveHref(o.id, selfHref)}>
                          {o.e} <span className="cx-relsys">{prettySystem(o.sys)}</span>
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
          </details>
        )}
      </section>

      {/* ── every recorded field, on demand ── */}
      <section className="cx-section" aria-labelledby="cx-fields-h">
        <h2 className="cx-h2" id="cx-fields-h">What this record holds</h2>
        <p className="cx-sub">
          The record&rsquo;s own {entry.fields.length} recorded correspondences, gathered by
          what kind of claim each one is.
        </p>
        {grouped.map((g) => (
          <details className="cx-relitem" key={g.basis}>
            <summary className="cx-relsum">
              <span className={`cx-basis cx-basis-${g.basis}`}>{BASIS_LABEL[g.basis]}</span>
              <span className="cx-relsumcount">{g.fields.length}</span>
            </summary>
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
          </details>
        ))}
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
                  The archive&rsquo;s own {sysName} lattice is documented in the{" "}
                  {research.room} room, which is what makes this route real rather than
                  decorative.
                </p>
                <p className="cx-quote">“{research.why}”</p>
                <Link className="cx-out" href={research.href}>
                  Read the {research.room} room →
                </Link>
              </>
            ) : (
              <p className="cx-basisnote">
                No research room documents the {sysName} lattice, so no route is offered from
                this record. Only {SYSTEMS_WITH_RESEARCH_ROUTE.map(prettySystem).join(" and ")}{" "}
                currently have one.
              </p>
            )}
          </div>
        </div>
        <p className="cx-basisnote cx-narrow">
          There is no artwork or Journal route from a Codex record: no record in either
          registry names a Codex entry, so none is offered. The Codex anchors that do exist run
          the other way — from the research rooms into the Codex.
        </p>
      </section>

      <section className="cx-section cx-oracle" aria-labelledby="cx-oracle-h">
        <h2 className="cx-h2" id="cx-oracle-h">Ask the Oracle about {entry.e}</h2>
        <p className="cx-basisnote">
          The Oracle picks up this selection and answers about it, then brings you back to this
          record.
        </p>
        <Link className="cx-ask" href={oracleHref}>
          Ask about {entry.e} (in {sysName}) →
        </Link>
      </section>
    </Shell>
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
.cx-sysinline{color:inherit;text-decoration:none;border-bottom:1px solid rgba(224,64,251,.4)}
.cx-sysinline:hover{color:#22d3ee}
.cx-title{font-family:var(--font-display,serif);font-size:clamp(30px,5vw,54px);line-height:1.06;
  margin:0 0 14px;letter-spacing:-.01em}
.cx-lede{font-size:15px;line-height:1.65;color:rgba(240,236,255,.72);max-width:64ch;margin:0 0 16px}
.cx-lede strong{color:#f0ecff}
.cx-honest{font-size:13px;line-height:1.7;color:rgba(240,236,255,.6);max-width:64ch;margin:0;
  border-left:2px solid rgba(224,64,251,.4);padding-left:14px}
.cx-honest strong{color:#f0ecff}
.cx-askrow{margin:0}
.cx-section{margin:0 0 52px}
.cx-h2{font-family:var(--font-display,serif);font-size:24px;margin:0 0 8px}
.cx-h3{font-size:13px;letter-spacing:.14em;text-transform:uppercase;margin:26px 0 8px;
  font-family:var(--font-mono,monospace);color:rgba(240,236,255,.8)}
.cx-sub{font-size:13.5px;line-height:1.6;color:rgba(240,236,255,.6);max-width:62ch;margin:0 0 18px}
.cx-grid{list-style:none;padding:0;margin:0;display:grid;gap:1px;
  grid-template-columns:repeat(auto-fill,minmax(230px,1fr));background:rgba(255,255,255,.07)}
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
.cx-overview{list-style:none;padding:0;margin:0 0 22px;display:flex;flex-wrap:wrap;gap:8px}
.cx-ovchip{display:flex;align-items:baseline;gap:9px;padding:7px 13px;text-decoration:none;color:inherit;
  border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.02)}
.cx-ovchip:hover,.cx-ovchip:focus-visible{border-color:rgba(34,211,238,.55);background:rgba(34,211,238,.06)}
.cx-ovsys{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:.14em;text-transform:uppercase}
.cx-ovcount{font-family:var(--font-mono,monospace);font-size:11px;color:#22d3ee}
.cx-ovrest{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:.12em;
  color:rgba(240,236,255,.45);background:none}
.cx-basis{display:inline-block;font-family:var(--font-mono,monospace);font-size:9px;
  letter-spacing:.16em;text-transform:uppercase;padding:3px 8px;border:1px solid currentColor;
  margin-left:10px;vertical-align:middle}
.cx-basis.inline{margin-left:0}
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
.cx-rel{display:grid;gap:1px;background:rgba(255,255,255,.06);margin-top:18px}
.cx-relitem{background:#05040c;padding:0}
.cx-relitem.cx-quiet{margin-top:18px;background:rgba(255,255,255,.02)}
.cx-relsum{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:15px 16px;
  cursor:pointer;list-style:none;font-family:var(--font-mono,monospace);font-size:11px;
  letter-spacing:.12em;text-transform:uppercase}
.cx-relsum::-webkit-details-marker{display:none}
.cx-relsum::before{content:"+";color:#e040fb;width:10px}
.cx-relitem[open]>.cx-relsum::before{content:"–"}
.cx-relsum:hover{background:rgba(224,64,251,.05)}
.cx-relsum:focus-visible{outline:1px solid rgba(34,211,238,.6);outline-offset:-1px}
.cx-relsumsys{color:rgba(240,236,255,.88)}
.cx-relsumcount{color:#22d3ee}
.cx-relitem>*:not(summary){padding-left:38px;padding-right:16px}
.cx-relitem>*:not(summary):last-child{padding-bottom:16px}
.cx-rellabel{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:.12em;
  text-transform:uppercase;color:rgba(240,236,255,.45);margin:0 0 8px}
.cx-rellink{font-size:14px;color:#22d3ee;text-decoration:none;border-bottom:1px solid rgba(34,211,238,.28)}
.cx-rellink:hover,.cx-rellink:focus-visible{color:#e040fb;border-color:rgba(224,64,251,.5)}
.cx-relsys{font-family:var(--font-mono,monospace);font-size:9px;letter-spacing:.16em;
  color:rgba(240,236,255,.4);margin-left:6px}
.cx-shared{list-style:none;padding:0;margin:10px 0 0;display:grid;gap:18px}
.cx-sharedgroup{border-left:2px solid rgba(255,255,255,.12);padding-left:16px}
.cx-sharedwhy{margin:0 0 8px;font-size:13.5px;line-height:1.6;color:rgba(240,236,255,.8)}
.cx-sharedlist{list-style:none;padding:0;margin:10px 0 0;display:flex;flex-wrap:wrap;gap:8px 18px}
.cx-relvia{display:block;font-family:var(--font-mono,monospace);font-size:10px;
  letter-spacing:.08em;color:rgba(240,236,255,.42);margin-top:4px}
.cx-more{font-size:12px;color:rgba(240,236,255,.45);margin:10px 0 0}
.cx-plainlist{list-style:none;padding:0;margin:10px 0 0;display:grid;gap:10px}
.cx-plainlist li{font-size:13.5px}
.cx-plainwhy{display:block;font-family:var(--font-mono,monospace);font-size:10px;
  letter-spacing:.08em;color:rgba(240,236,255,.42);margin-top:3px}
.cx-onward{display:grid;gap:1px;background:rgba(255,255,255,.07);margin-bottom:22px}
.cx-onwarditem{padding:20px;background:#05040c}
.cx-onwarditem .cx-h3{margin-top:0}
.cx-quote{font-size:12.5px;line-height:1.6;color:rgba(240,236,255,.5);font-style:italic;
  margin:0 0 14px;max-width:60ch}
.cx-narrow{max-width:64ch}
.cx-oracle{border:1px solid rgba(224,64,251,.22);padding:24px;background:rgba(224,64,251,.03)}
.cx-ask{font-size:12px;margin-top:4px}
@media (max-width:560px){
  .cx-wrap{padding:88px 16px 96px}
  .cx-field{grid-template-columns:1fr;gap:5px}
  .cx-grid{grid-template-columns:1fr}
  .cx-relitem>*:not(summary){padding-left:16px}
}
`;
