import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@mantine/core";

import PageClient from "./page.client";

const ESI_BASE = "https://esi.evetech.net/latest";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ constellationId: string }>;
}): Promise<Metadata> {
  const { constellationId } = await params;
  const id = Number(constellationId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  try {
    const res = await fetch(`${ESI_BASE}/universe/constellations/${id}/`, { // NOSONAR - domain hardcoded; id is a validated safe positive integer
      next: { revalidate: 86400 },
    });
    if (!res.ok) return {};
    const { name } = (await res.json()) as { name?: string };
    return { title: name, description: name ? `${name} constellation in EVE Online.` : undefined };
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
