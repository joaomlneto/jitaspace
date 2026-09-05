import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader } from "@mantine/core";

import { pageMetadata } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import TypeHistoryClient from "./page.client";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ typeId: string }>;
}>) {
  const { typeId } = await params;
  const id = parsePositiveEntityId(typeId);
  if (id === null) return {};
  return pageMetadata({
    title: `Type ${id} — Change History`,
    description: `How EVE Online type ${id} has changed across client builds.`,
    path: `/history/type/${id}`,
    badge: "Change History",
  });
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ typeId: string }>;
}>) {
  const { typeId } = await params;
  const id = parsePositiveEntityId(typeId);
  if (id === null) notFound();
  return <TypeHistoryClient typeId={id} />;
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
