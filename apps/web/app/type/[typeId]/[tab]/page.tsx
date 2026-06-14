import { redirect } from "next/navigation";

import { isTypePageTab } from "../tabs";

/**
 * Convenience deep-link route: `/type/{typeId}/{tab}` redirects to the canonical
 * type page (`/type/{typeId}`) with the requested tab pre-selected via `?tab=`.
 * Unknown tab names fall through to the page's default tab.
 */
export default async function TypeTabRedirectPage({
  params,
}: Readonly<{
  params: Promise<{ typeId: string; tab: string }>;
}>) {
  const { typeId, tab } = await params;
  redirect(
    isTypePageTab(tab) ? `/type/${typeId}?tab=${tab}` : `/type/${typeId}`,
  );
}
