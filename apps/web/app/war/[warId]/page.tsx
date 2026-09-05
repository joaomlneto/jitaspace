import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ warId: string }>;
}): Promise<Metadata> {
  const { warId } = await params;
  const id = parsePositiveEntityId(warId);
  if (id === null) return {};
  return {
    title: `War #${id}`,
    description: `EVE Online war #${id} — view war details, mutual war status, and open kills.`,
    alternates: { canonical: `/war/${id}` },
  };
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ warId: string }>;
}>) {
  const { warId } = await params;
  if (parsePositiveEntityId(warId) === null) notFound();
  return <PageClient />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ warId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
