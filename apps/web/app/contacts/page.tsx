import { Suspense } from "react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { pageMetadata } from "~/lib/metadata";
import ContactsPageClient from "./page.client";

export const metadata = pageMetadata({
  title: "Contacts",
  description:
    "Browse your EVE Online character, corporation and alliance contacts in one place.",
  path: "/contacts",
  badge: "Contacts",
});

export default function Page() {
  // The source selection lives in the URL via nuqs, which reads
  // useSearchParams internally — without a Suspense boundary the route
  // silently drops out of static prerendering under cacheComponents.
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ContactsPageClient />
    </Suspense>
  );
}
