import { Suspense } from "react";
import { Loader } from "@mantine/core";

import EntityHistoryClient from "./page.client";

async function PageContent({
  params,
}: {
  params: Promise<{ entityType: string; id: string }>;
}) {
  const { entityType, id } = await params;
  return <EntityHistoryClient entityType={entityType} entityId={Number(id)} />;
}

export default function Page({
  params,
}: {
  params: Promise<{ entityType: string; id: string }>;
}) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
