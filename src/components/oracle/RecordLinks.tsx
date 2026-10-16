/**
 * The records an answer was grounded on, offered as destinations.
 *
 * This is an invitation to explore, not an evidence report: the record's own title, what kind
 * of record it is, and the page it lives on. No identifier, no confidence, no score, no
 * disclaimer — those belong to the selected-entry evidence panel, not here.
 *
 * It renders ONLY what the server resolved. It never reads the answer's prose, and a record it
 * was not given is a record it cannot invent.
 *
 * Imports the shared shape module only, so no registry, resolver or corpus reaches the browser.
 */
import { isEmptyLinkSet, prettySystemName, type RecordLink, type RecordLinkSet } from "@/lib/record-link-types";

/** One record, as a real link. Keyboard operable and focusable because it is an anchor. */
function RecordAnchor({ record }: { record: RecordLink }) {
  return (
    <a className="oracle-record" href={record.href} data-record-kind={record.kind}>
      <span className="oracle-record-kind">{record.kind}</span>
      <span className="oracle-record-title">{record.title}</span>
      {record.system ? (
        <span className="oracle-record-system">{prettySystemName(record.system)}</span>
      ) : null}
    </a>
  );
}

export default function RecordLinks({ set }: { set: RecordLinkSet | null | undefined }) {
  if (isEmptyLinkSet(set)) return null;
  const resolved = set!.resolved;
  const ambiguous = set!.ambiguous;

  return (
    <section className="oracle-records" aria-label="Records this answer opened">
      {resolved.length ? (
        <>
          <p className="oracle-records-kicker">In the archive</p>
          <ul className="oracle-records-list">
            {resolved.map((r) => (
              <li className="oracle-records-item" key={r.id}>
                <RecordAnchor record={r} />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {ambiguous.map((group) => (
        /* Alternatives, not a selection: both records are offered equally and nothing is marked
           as taken, because the visitor has not chosen yet. The kind on each link is what tells
           them apart. */
        <div
          className="oracle-records-ambiguous"
          role="group"
          aria-label={`More than one record answers to ${group.name}`}
          key={group.name}
        >
          <p className="oracle-records-ask">
            More than one record answers to <em>{group.name}</em>. Which did you mean?
          </p>
          <ul className="oracle-records-list">
            {group.options.map((r) => (
              <li className="oracle-records-item" key={r.id}>
                <RecordAnchor record={r} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
