import { headers } from "next/headers";
import { redirect } from "next/navigation";

function isMobileUserAgent(userAgent: string) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent);
}

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
  const forcedView = sp.view;

  if (forcedView === "mobile") {
    redirect(`/oracle/mobile${forwardQuery}`);
  }

  if (forcedView === "desktop") {
    redirect(`/oracle/desktop${forwardQuery}`);
  }

  const userAgent = headers().get("user-agent") || "";
  redirect(isMobileUserAgent(userAgent) ? `/oracle/mobile${forwardQuery}` : `/oracle/desktop${forwardQuery}`);
}
