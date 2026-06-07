import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@mantine/core";

import { getCorporationsCorporationId } from "@jitaspace/esi-client";

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
  const id = Number(corporationId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};

  try {
    const res = await getCorporationsCorporationId(id);
    const name = res.data?.name;
    const description = res.data?.description
      ? stripHtml(res.data.description).slice(0, 200)
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
