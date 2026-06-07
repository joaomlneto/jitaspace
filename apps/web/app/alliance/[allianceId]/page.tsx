import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@mantine/core";

import { getAlliancesAllianceId } from "@jitaspace/esi-client";

import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ allianceId: string }>;
}): Promise<Metadata> {
  const { allianceId } = await params;
  const id = Number(allianceId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  try {
    const res = await getAlliancesAllianceId(id);
    const name = res.data?.name;
    const logoUrl = `https://images.evetech.net/alliances/${id}/logo`;
    return {
      title: name,
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

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <PageClient />
    </Suspense>
  );
}
