import { notFound } from "next/navigation";
import { HttpStatusCode } from "axios";

import { prisma } from "@jitaspace/db";

import TypePage from "./page.client";
import type { PageProps } from "./page.client";

export const revalidate = 86400;

export default async function Page({
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

    const props: PageProps = {
      typeId,
      ogImageUrl: `https://images.evetech.net/types/${typeId}/${variation}`,
      typeName: type.name,
      typeDescription: type.description,
    };
    return <TypePage {...props} />;
  } catch {
    notFound();
  }
}
