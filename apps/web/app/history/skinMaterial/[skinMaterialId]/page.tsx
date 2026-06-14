import { Suspense } from "react";
import { Loader } from "@mantine/core";

import SkinMaterialHistoryClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ skinMaterialId: string }>;
}) {
  const { skinMaterialId } = await params;
  return {
    title: `SKIN Material ${skinMaterialId} — Change History`,
    description: `How EVE Online SKIN material ${skinMaterialId} has changed across client builds.`,
  };
}

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
