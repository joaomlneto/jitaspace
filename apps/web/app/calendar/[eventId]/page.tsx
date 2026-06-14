import { Suspense } from "react";

import { PageSkeleton } from "~/components/PageSkeleton";
import PageClient from "./page.client";

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ eventId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageClient params={params} />
    </Suspense>
  );
}
