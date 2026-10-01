import { Suspense } from "react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { pageMetadata } from "~/lib/metadata";
import ShipTreePage from "./page.client";

export const metadata = pageMetadata({
  title: "Ship Tree",
  description:
    "Browse EVE Online's ship tree for every faction: which hulls branch from which, where Omega-only ships begin, and which ones you can fly.",
  path: "/ship-tree",
  badge: "Ships",
});

// The tree is reference data and the page renders for anyone. Skills are an
// overlay for a logged-in character, so nothing here reads the session or the
// database. The client page uses `nuqs`, which needs a Suspense boundary or the
// route drops out of static prerendering.
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ShipTreePage />
    </Suspense>
  );
}
