import { Suspense } from "react";
import { Loader } from "@mantine/core";

import EntityHistoryClient from "./page.client";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ entityType: string; id: string }>;
}>) {
  const { entityType, id } = await params;
  return {
    title: `${entityType} ${id} — Change History`,
    description: `Change history for EVE Online ${entityType} ${id} across client builds.`,
  };
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ entityType: string; id: string }>;
}>) {
  const { entityType, id } = await params;
  return <EntityHistoryClient entityType={entityType} entityId={Number(id)} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ entityType: string; id: string }>;
}>) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
