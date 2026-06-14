import { Suspense } from "react";
import { Loader } from "@mantine/core";

import SkinMaterialHistoryClient from "./page.client";

async function PageContent({
  params,
}: {
  params: Promise<{ skinMaterialId: string }>;
}) {
  const { skinMaterialId } = await params;
  return <SkinMaterialHistoryClient skinMaterialId={Number(skinMaterialId)} />;
}

export default function Page({
  params,
}: {
  params: Promise<{ skinMaterialId: string }>;
}) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
