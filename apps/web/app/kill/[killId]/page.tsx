import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ killId: string }>;
}): Promise<Metadata> {
  const { killId } = await params;
  const id = parsePositiveEntityId(killId);
  if (id === null) return {};
  return {
    title: `Killmail #${id}`,
    description: `EVE Online killmail #${id} — view kill details, attackers, and loot.`,
    alternates: { canonical: `/kill/${id}` },
  };
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ killId: string }>;
}>) {
  const { killId } = await params;
  if (parsePositiveEntityId(killId) === null) notFound();
  return <PageClient />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ killId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
