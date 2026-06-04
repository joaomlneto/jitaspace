import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@mantine/core";

import PageClient from "./page.client";

const ESI_BASE = "https://esi.evetech.net/latest";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ characterId: string }>;
}): Promise<Metadata> {
  const { characterId } = await params;
  const id = Number(characterId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};

  try {
    const res = await fetch(`${ESI_BASE}/characters/${id}/`, { // NOSONAR - domain hardcoded; id is a validated safe positive integer
      next: { revalidate: 3600 },
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { name?: string; description?: string };
    const name = data.name;
    const portraitUrl = `https://images.evetech.net/characters/${id}/portrait`;
    return {
      title: name,
      openGraph: {
        title: name,
        images: [{ url: portraitUrl, width: 512, height: 512 }],
      },
      twitter: {
        card: "summary",
        title: name,
        images: [portraitUrl],
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
