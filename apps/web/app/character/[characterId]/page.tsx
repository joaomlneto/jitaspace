import type { Metadata } from "next";
import { Suspense } from "react";

import { getCharactersCharacterId } from "@jitaspace/esi-client";

import { PageSkeleton } from "~/components/PageSkeleton";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ characterId: string }>;
}): Promise<Metadata> {
  const { characterId } = await params;
  const id = Number(characterId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  try {
    const res = await getCharactersCharacterId(id);
    const name = res.data.name;
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
    <Suspense fallback={<PageSkeleton />}>
      <PageClient />
    </Suspense>
  );
}
