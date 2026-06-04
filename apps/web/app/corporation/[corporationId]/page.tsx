import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@mantine/core";

import PageClient from "./page.client";

const ESI_BASE = "https://esi.evetech.net/latest";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ corporationId: string }>;
}): Promise<Metadata> {
  const { corporationId } = await params;
  const id = Number(corporationId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};

  try {
    const res = await fetch(`${ESI_BASE}/corporations/${id}/`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      name?: string;
      description?: string;
      ticker?: string;
    };
    const name = data.name;
    const description = data.description
      ? data.description.replace(/<[^>]+>/g, "").slice(0, 200)
      : undefined;
    const logoUrl = `https://images.evetech.net/corporations/${id}/logo`;
    return {
      title: name,
      description,
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

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <PageClient />
    </Suspense>
  );
}
