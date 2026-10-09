import { redirect } from "next/navigation";

/* Params the Oracle desktop/mobile clients know how to consume. Anything
   else is dropped rather than forwarded into analytics or the request body. */
/* Stable research identifier (e.g. research-v1:cymatics) must survive this
   chooser or the Oracle loses the research anchor on redirect. An identifier
   only: the title, summary and permitted sources are resolved server-side
   from the research registry, never forwarded from the URL. */
const FORWARDED_PARAMS = ["view", "q", "artworkId", "researchTopicId", "from"] as const;

function buildForwardQuery(sp: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const key of FORWARDED_PARAMS) {
    const value = sp[key];
    if (typeof value === "string" && value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default function OracleRouteChooser({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp = searchParams || {};
  const forwardQuery = buildForwardQuery(sp);

  /* Both view values and both user agents now land on the one responsive
     client. A mobile UA used to divert visitors to /oracle/mobile, a
     separate 583-line stub with none of the anchoring, history, evidence
     or unknown-context behaviour of the real Oracle. That client is
     responsive at 390px, so the audience no longer decides anything:
     every visitor gets the same implementation and the same ground rules.
     view=desktop and view=mobile are both honoured, so an explicit choice
     is never rewritten. */
  redirect(`/oracle/desktop${forwardQuery}`);
}
