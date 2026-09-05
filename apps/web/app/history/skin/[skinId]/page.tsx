import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader } from "@mantine/core";

import { parsePositiveEntityId } from "~/lib/routeParams";
import SkinHistoryClient from "./page.client";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ skinId: string }>;
}>) {
  const { skinId } = await params;
  const id = parsePositiveEntityId(skinId);
  if (id === null) return {};
  return {
    title: `SKIN ${id} — Change History`,
    description: `How EVE Online SKIN ${id} has changed across client builds.`,
    alternates: { canonical: `/history/skin/${id}` },
  };
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ skinId: string }>;
}>) {
  const { skinId } = await params;
  const id = parsePositiveEntityId(skinId);
  if (id === null) notFound();
  return <SkinHistoryClient skinId={id} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ skinId: string }>;
}>) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
