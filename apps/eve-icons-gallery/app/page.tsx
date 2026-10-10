import { Suspense } from "react";

import { Gallery } from "./Gallery";

export default function Page() {
  // The gallery reads its initial search and filter from the query string, so
  // in a static export it renders in the browser, below this boundary.
  return (
    <Suspense>
      <Gallery />
    </Suspense>
  );
}
