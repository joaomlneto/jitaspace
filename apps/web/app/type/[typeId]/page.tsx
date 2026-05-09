import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { HttpStatusCode } from "axios";
import { Loader } from "@mantine/core";

import { prisma } from "@jitaspace/db";

import TypePage from "./page.client";
import type { PageProps } from "./page.client";

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
