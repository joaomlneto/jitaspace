import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getAlliancesAllianceId } from "@jitaspace/esi-client";

import { PageSkeleton } from "~/components/PageSkeleton";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ allianceId: string }>;
}): Promise<Metadata> {
  const { allianceId } = await params;
  const id = parsePositiveEntityId(allianceId);
  if (id === null) return {};
  try {
    const res = await getAlliancesAllianceId(id);
    const name = res.data.name;
    const logoUrl = `https://images.evetech.net/alliances/${id}/logo`;
    return {
      title: name,
      alternates: { canonical: `/alliance/${id}` },
      openGraph: {
        title: name,
        images: [{ url: logoUrl, width: 512, height: 512 }],
      },
      twitter: {
        card: "summary",
        title: name,
        images: [logoUrl],
      },
    };
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{ params: Promise<{ allianceId: string }> }>) {
  const { allianceId } = await params;
  if (parsePositiveEntityId(allianceId) === null) notFound();
  return <PageClient />;
}

export default function Page({
  params,
}: Readonly<{ params: Promise<{ allianceId: string }> }>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
