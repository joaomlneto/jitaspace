import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import type { Metadata } from "next";
import { HttpStatusCode } from "axios";
import { Loader } from "@mantine/core";

import { prisma } from "~/lib/db";

import TypePage from "./page.client";
import type { PageProps } from "./page.client";

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

async function getTypeData(typeId: number): Promise<PageProps> {
  "use cache";
  cacheLife("days");

  const type = await prisma.type.findUniqueOrThrow({
    select: {
      typeId: true,
      name: true,
      description: true,
    },
    where: {
      typeId,
    },
  });

  const typeImageVariations: string[] = ((await fetch(
    `https://images.evetech.net/types/${typeId}`,
  ).then((res) => {
    return res.status === HttpStatusCode.NotFound ? [] : res.json();
  })) as string[]) ?? [];

  const variation: string | undefined =
    !typeImageVariations || typeImageVariations?.includes("icon")
      ? "icon"
      : typeImageVariations[0];

  return {
    typeId,
    ogImageUrl: `https://images.evetech.net/types/${typeId}/${variation}`,
    typeName: type.name,
    typeDescription: type.description,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ typeId: string }>;
}): Promise<Metadata> {
  const { typeId: typeIdParam } = await params;
  const typeId = Number(typeIdParam);
  if (!typeId) return {};

  try {
    const { typeName, typeDescription, ogImageUrl } =
      await getTypeData(typeId);
    const description = typeDescription
      ? stripHtml(typeDescription).slice(0, 200)
      : undefined;
    return {
      title: typeName ?? undefined,
      description,
      openGraph: {
        title: typeName ?? undefined,
        description,
        images: ogImageUrl ? [{ url: ogImageUrl, width: 64, height: 64 }] : [],
      },
      twitter: {
        card: "summary",
        title: typeName ?? undefined,
        description,
        images: ogImageUrl ? [ogImageUrl] : [],
      },
    };
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: {
  params: Promise<{ typeId: string }>;
}) {
  const { typeId: typeIdParam } = await params;
  const typeId = Number(typeIdParam);
  if (!typeId) {
    notFound();
  }

  try {
    const props = await getTypeData(typeId);
    return <TypePage {...props} />;
  } catch {
    notFound();
  }
}

export default function Page({
  params,
}: {
  params: Promise<{ typeId: string }>;
}) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
