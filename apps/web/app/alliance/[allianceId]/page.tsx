import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@mantine/core";

import PageClient from "./page.client";

const ESI_BASE = "https://esi.evetech.net/latest";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ allianceId: string }>;
}): Promise<Metadata> {
  const { allianceId } = await params;
  const id = Number(allianceId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};

  try {
    const res = await fetch(`${ESI_BASE}/alliances/${id}/`, { // NOSONAR - domain hardcoded; id is a validated safe positive integer
      next: { revalidate: 3600 },
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { name?: string; ticker?: string };
    const name = data.name;
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
