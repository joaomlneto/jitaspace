import { Suspense } from "react";
import { Loader } from "@mantine/core";

import SkinHistoryClient from "./page.client";

async function PageContent({
  params,
}: {
  params: Promise<{ skinId: string }>;
}) {
  const { skinId } = await params;
  return <SkinHistoryClient skinId={Number(skinId)} />;
}

export default function Page({
  params,
}: {
  params: Promise<{ skinId: string }>;
}) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
