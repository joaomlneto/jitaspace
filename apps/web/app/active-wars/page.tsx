import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { ActiveWarsView } from "~/components/Wars/ActiveWarsView";
import { pageMetadata } from "~/lib/metadata";
import { getWarRoomData } from "./data";

export const metadata = pageMetadata({
  title: "Active Wars",
  description:
    "Live list of active wars in EVE Online — track ongoing conflicts between corporations and alliances.",
  path: "/active-wars",
  badge: "Wars",
});

async function ActiveWarsContent() {
  let data;
  try {
    data = await getWarRoomData();
  } catch {
    notFound();
  }

  return <ActiveWarsView data={data} />;
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ActiveWarsContent />
    </Suspense>
  );
}
