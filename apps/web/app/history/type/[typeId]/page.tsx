import { Suspense } from "react";
import { Loader } from "@mantine/core";

import TypeHistoryClient from "./page.client";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ typeId: string }>;
}>) {
  const { typeId } = await params;
  return {
    title: `Type ${typeId} — Change History`,
    description: `How EVE Online type ${typeId} has changed across client builds.`,
  };
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ typeId: string }>;
}>) {
  const { typeId } = await params;
  return <TypeHistoryClient typeId={Number(typeId)} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ typeId: string }>;
}>) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
