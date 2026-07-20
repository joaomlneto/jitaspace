import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { getTravelPageData } from "./data";
import TravelPage from "./page.client";

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ waypoints?: string[] }>;
}>) {
  const { waypoints } = await params;

  let travelData: Awaited<ReturnType<typeof getTravelPageData>>;
  try {
    travelData = await getTravelPageData(waypoints);
  } catch {
    notFound();
  }

  return (
    <TravelPage
      initialWaypoints={travelData.initialWaypoints}
      solarSystems={travelData.solarSystems}
    />
  );
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ waypoints?: string[] }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
