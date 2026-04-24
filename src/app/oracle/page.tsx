import { headers } from "next/headers";
import { redirect } from "next/navigation";

function isMobileUserAgent(userAgent: string) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent);
}

export default function OracleRouteChooser({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  const forcedView = searchParams?.view;

  if (forcedView === "mobile") {
    redirect("/oracle/mobile");
  }

  if (forcedView === "desktop") {
    redirect("/oracle/desktop");
  }

  const userAgent = headers().get("user-agent") || "";
  redirect(isMobileUserAgent(userAgent) ? "/oracle/mobile" : "/oracle/desktop");
}
