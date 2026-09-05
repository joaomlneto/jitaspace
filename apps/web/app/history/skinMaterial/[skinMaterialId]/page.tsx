import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader } from "@mantine/core";

import { parsePositiveEntityId } from "~/lib/routeParams";
import SkinMaterialHistoryClient from "./page.client";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ skinMaterialId: string }>;
}>) {
  const { skinMaterialId } = await params;
  const id = parsePositiveEntityId(skinMaterialId);
  if (id === null) return {};
  return {
    title: `SKIN Material ${id} — Change History`,
    description: `How EVE Online SKIN material ${id} has changed across client builds.`,
    alternates: { canonical: `/history/skinMaterial/${id}` },
  };
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ skinMaterialId: string }>;
}>) {
  const { skinMaterialId } = await params;
  const id = parsePositiveEntityId(skinMaterialId);
  if (id === null) notFound();
  return <SkinMaterialHistoryClient skinMaterialId={id} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ skinMaterialId: string }>;
}>) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
