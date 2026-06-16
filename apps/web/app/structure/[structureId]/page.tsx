import { Suspense } from "react";
import { PageSkeleton } from "~/components/PageSkeleton";
import PageClient from "./page.client";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageClient />
    </Suspense>
  );
}
