import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@mantine/core";

import PageClient from "./page.client";

const ESI_BASE = "https://esi.evetech.net/latest";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ regionId: string }>;
}): Promise<Metadata> {
  const { regionId } = await params;
  const id = Number(regionId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  try {
    const res = await fetch(`${ESI_BASE}/universe/regions/${id}/`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return {};
    const { name } = (await res.json()) as { name?: string };
    return { title: name, description: name ? `${name} region in EVE Online.` : undefined };
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
