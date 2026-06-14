import { Suspense } from "react";
import { Loader } from "@mantine/core";

import SkinHistoryClient from "./page.client";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ skinId: string }>;
}>) {
  const { skinId } = await params;
  return {
    title: `SKIN ${skinId} — Change History`,
    description: `How EVE Online SKIN ${skinId} has changed across client builds.`,
  };
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ skinId: string }>;
}>) {
  const { skinId } = await params;
  return <SkinHistoryClient skinId={Number(skinId)} />;
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
