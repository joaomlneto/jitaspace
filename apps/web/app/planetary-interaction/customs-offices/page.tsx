import { NuqsAdapter } from "nuqs/adapters/react";

import { pageMetadata } from "~/lib/metadata";
import CustomsOfficesPageClient from "./page.client";

export const metadata = pageMetadata({
  title: "Customs Offices",
  description:
    "Review the tax rates, access rules and reinforcement windows of every customs office your EVE Online corporations own.",
  path: "/planetary-interaction/customs-offices",
  badge: "Planetary Interaction",
});

export default function Page() {
  // The React adapter rather than the app-wide Next one, so the filters do
  // not drop the page out of its static HTML (see apps/web/CLAUDE.md, nuqs).
  return (
    <NuqsAdapter>
      <CustomsOfficesPageClient />
    </NuqsAdapter>
  );
}
