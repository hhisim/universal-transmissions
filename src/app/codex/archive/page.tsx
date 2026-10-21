import type { Metadata } from "next";
import Link from "next/link";
import {
  BASIS_LABEL, BASIS_NOTE, CORPUS, MEASURED_LOOKING, SYSTEMS, SYSTEMS_WITH_REGISTERED_ROUTES,
  SYSTEMS_WITH_RESEARCH_ROUTE, arrivalContext, archiveHref, archiveRecordFor, isKnownSystem,
  arrivalSourceHref, recordFromId, recordsInSystem, registeredRoutesForSystem, relationshipGroups,
  representativeSet, researchRouteForSystem, searchArchive, sharedWith, systemHref,
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

/** The address a search leaves behind, so a record opened from results returns to the results. */
function searchHref(q: string): string {
  return `/codex/archive?q=${encodeURIComponent(q)}`;
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

/**
 * A plain GET form: the search needs no script, leaves the query in the address, and works
 * with the keyboard and with history exactly as the rest of the archive already does.
 */
const SearchForm = ({ defaultValue = "" }: { defaultValue?: string }) => (
  <form className="cx-search" action="/codex/archive" method="get" role="search">
    <label className="cx-searchlabel" htmlFor="cx-q">
      Search the archive
    </label>
    <div className="cx-searchrow">
      <input
        id="cx-q"
        className="cx-searchinput"
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="A record name or a recorded value — Aleph, Silver, Metron…"
        autoComplete="off"
      />
      <button className="cx-searchgo" type="submit">
        Search
      </button>
    </div>
  </form>
);

const Shell = ({ children }: { children: React.ReactNode }) => (
  <main className="ut-foreground ut-correspondence cx-wrap">
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
  const rawQuery = first(sp.q).trim().slice(0, 80);
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
          <SearchForm />
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

  /* ── a search ─────────────────────────────────────────────────────────── */
  if (!rawEntry && !rawSystem && rawQuery) {
    const result = searchArchive(rawQuery);
    const from = searchHref(rawQuery);
    return (
      <Shell>
        <nav className="cx-crumb" aria-label="Breadcrumb">
          <Link className="cx-back" href="/codex/archive">← THE CORRESPONDENCE ARCHIVE</Link>
        </nav>
        <header className="cx-head">
          <p className="cx-kicker">Codex search</p>
          <h1 className="cx-title">&ldquo;{result.query}&rdquo;</h1>
          <p className="cx-lede">
            {result.nameTotal === 0 && result.valueTotal === 0
              ? `Nothing in the archive matches that. The corpus holds ${CORPUS.records} records in ${CORPUS.systems} systems, and a name is only found by what it is actually called.`
              : <>{result.nameTotal} {result.nameTotal === 1 ? "record is" : "records are"} named this, and{" "}
                  {result.valueTotal} recorded {result.valueTotal === 1 ? "value carries" : "values carry"} it.</>}
          </p>
          <SearchForm defaultValue={rawQuery} />
        </header>

        {result.names.length > 0 && (
          <section className="cx-section" aria-labelledby="cx-sr-names">
            <h2 className="cx-h2" id="cx-sr-names">Records with this name</h2>
            <p className="cx-sub">
              A name can exist in more than one system, and those are different records. Each is
              listed under the system that holds it.
            </p>
            <ul className="cx-grid">
              {result.names.map((n) => (
                <li key={n.id}>
                  <Link className="cx-card" href={archiveHref(n.id, from)}>
                    <span className="cx-chip">{prettySystem(n.sys)}</span>
                    <span className="cx-card-name">{n.e}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {result.namesTruncated && (
              <p className="cx-more">
                Showing {result.names.length} of {result.nameTotal}. Refine the search to see the rest.
              </p>
            )}
          </section>
        )}

        {result.values.length > 0 && (
          <section className="cx-section" aria-labelledby="cx-sr-values">
            <h2 className="cx-h2" id="cx-sr-values">Recorded values carrying it</h2>
            <p className="cx-sub">
              The same words appear as values inside records. Each row names the field it was
              recorded in and the records that carry it.
            </p>
            <ul className="cx-shared">
              {result.values.map((v) => (
                <li className="cx-sharedgroup" key={`${v.field}-${v.value}`}>
                  <p className="cx-rellabel">
                    {v.fieldLabel}: <strong>{v.value}</strong>
                  </p>
                  <ul className="cx-sharedlist">
                    {v.records.map((r) => (
                      <li key={r.id}>
                        <Link className="cx-rellink" href={archiveHref(r.id, from)}>
                          {r.e} <span className="cx-relsys">{prettySystem(r.sys)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            {result.valuesTruncated && (
              <p className="cx-more">
                Showing {result.values.length} of {result.valueTotal} recorded values. Refine the search to see the rest.
              </p>
            )}
          </section>
        )}
      </Shell>
    );
  }

  /* ── no selection: the way in ─────────────────────────────────────────── */
  if (!rawEntry) {
    const seeds = representativeSet(8);
    return (
      <Shell>
        {/* The material comes first: one line, a search, then records. The longer note about
            what these correspondences are now sits after the material rather than in front of it. */}
        <header className="cx-head">
          <p className="cx-kicker">Universal Transmissions — Codex</p>
          <h1 className="cx-title">The Correspondence Archive</h1>
          <p className="cx-lede">
            {CORPUS.records} records across {CORPUS.systems} systems. Open one and follow what its
            own fields reach.
          </p>
          <SearchForm />
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
            {SYSTEMS.length} systems, {SYSTEMS.reduce((n, s) => n + s.count, 0)} records to
            address.
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

        <section className="cx-section" aria-labelledby="cx-how-h">
          <h2 className="cx-h2" id="cx-how-h">How to read this</h2>
          <p className="cx-honest">
            These are <strong>symbolic correspondences</strong> recorded in the UT Codex.
            A field like Frequency or Physiology carries an assignment this archive makes — a
            tone, a number, an organ, a stone — held beside the letter, card or form it belongs
            to. Take any one of them and follow it as far as it goes: that is what the lattice
            is for. Every link on a record comes from that record&rsquo;s own fields, and nothing
            is inferred to fill a gap.
          </p>
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
  /* Where the visitor came from, re-read from the source record's own fields: the value that
     reaches this record is reported, and a source that does not actually reach it claims nothing. */
  const arrival = arrivalContext(from, pair.sys, pair.e);
  /* The source's own address, returned unchanged: it already carries the context the visitor set
     out from. */
  const sourceHref = arrivalSourceHref(from, pair.sys, pair.e);
  /* Routes other registries already draw into this system's view. Empty when none does. */
  const registered = registeredRoutesForSystem(pair.sys);
  /* The address this record is read AT, which is what its own links carry onward. Using the
     incoming `from` when there is one means the next record's return target comes back here, and
     this record's return target is still the search results or system view the visitor set out
     from — instead of every record in the archive pointing at the archive index. */
  const contextHref = from || "/codex/archive";
  const selfHref = archiveHref(entry.id, contextHref);
  const totalTargets = groups.reduce((n, g) => n + g.total, 0);
  const sysName = prettySystem(entry.sys);
  const oracleHref =
    `/oracle?entryId=${encodeURIComponent(entry.id)}` +
    `&q=${encodeURIComponent(
      `Open the correspondences of “${entry.e}” (the ${sysName} entry) and follow them into the other systems they reach.`
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

      {arrival && (arrival.source || arrival.systemView) && (
        <p className="cx-arrival" data-arrival={arrival.source ? "record" : "system"}>
          {arrival.source ? (
            <>
              You arrived from{" "}
              <Link className="cx-rellink" href={sourceHref ?? contextHref} data-arrival-source="true">
                {arrival.source.e}
              </Link>{" "}
              <span className="cx-relsys">{prettySystem(arrival.source.sys)}</span>
              {arrival.viaFieldLabel && arrival.viaValue && (
                <>
                  {" "}via {arrival.viaFieldLabel}: &ldquo;{arrival.viaValue}&rdquo;
                </>
              )}
            </>
          ) : (
            <>You arrived from the {prettySystem(String(arrival.systemView))} system.</>
          )}
        </p>
      )}

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
          )}. {entry.fields.length > 0 ? "Each is carried with the record it belongs to." : ""}
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
                        a symbolic correspondence of the UT Codex
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

          {registered.length > 0 && (
            <div className="cx-onwarditem" data-registered-routes={registered.length}>
              <h3 className="cx-h3">Read further</h3>
              <p className="cx-basisnote">
                Where this system&rsquo;s records are read elsewhere in the archive.
              </p>
              <ul className="cx-reglist">
                {registered.map((r) => (
                  <li key={`${r.kind}-${r.href}`}>
                    <Link className="cx-out" href={r.href} data-registered-kind={r.kind}>
                      {r.kind === "Guided path" ? "Follow" : "Read"} {r.title} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
                No research room documents the {sysName} lattice, so no research route is offered
                from this record. Only {SYSTEMS_WITH_RESEARCH_ROUTE.map(prettySystem).join(" and ")}{" "}
                currently have one.
              </p>
            )}
          </div>
        </div>
        <p className="cx-basisnote cx-narrow">
          No artwork or Journal record names a Codex entry, so no route is offered from a Codex
          record into either.
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

