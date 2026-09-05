import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getCorporationsCorporationId } from "@jitaspace/esi-client";

import { PageSkeleton } from "~/components/PageSkeleton";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

function stripHtml(s: string): string {
  let out = "";
  let inTag = false;
  for (const ch of s) {
    if (ch === "<") inTag = true;
    else if (ch === ">") inTag = false;
    else if (!inTag) out += ch;
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ corporationId: string }>;
}): Promise<Metadata> {
  const { corporationId } = await params;
  const id = parsePositiveEntityId(corporationId);
  if (id === null) return {};

  try {
    const res = await getCorporationsCorporationId(id);
    const name = res.data.name;
    const description = res.data.description
      ? stripHtml(res.data.description).slice(0, 200)
      : undefined;
    const logoUrl = `https://images.evetech.net/corporations/${id}/logo`;
    return {
      title: name,
      description,
      alternates: { canonical: `/corporation/${id}` },
      openGraph: {
        title: name,
        description,
        images: [{ url: logoUrl, width: 512, height: 512 }],
      },
      twitter: {
        card: "summary",
        title: name,
        description,
        images: [logoUrl],
      },
    };
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{ params: Promise<{ corporationId: string }> }>) {
  const { corporationId } = await params;
  if (parsePositiveEntityId(corporationId) === null) notFound();
  return <PageClient />;
}

export default function Page({
  params,
}: Readonly<{ params: Promise<{ corporationId: string }> }>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
