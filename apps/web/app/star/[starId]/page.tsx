import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata, resolveTypeImage } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ starId: string }>;
}): Promise<Metadata> {
  const { starId } = await params;
  const id = parsePositiveEntityId(starId);
  if (id === null) return {};
  try {
    const star = await prisma.star.findUnique({
      select: {
        name: true,
        typeId: true,
        spectralClass: true,
        temperature: true,
        solarSystem: { select: { name: true } },
      },
      where: { starId: id },
    });
    if (!star) return {};

    const system = star.solarSystem.name;

    return pageMetadata({
      title: star.name,
      description: `${star.name} is a ${
        star.spectralClass ? `${star.spectralClass} class ` : ""
      }star${
        system ? ` at the centre of the ${system} solar system` : ""
      } in EVE Online.`,
      path: `/star/${id}`,
      badge: "Star",
      image: await resolveTypeImage(star.typeId),
      facts: [
        ...(star.spectralClass
          ? [{ label: "Spectral Class", value: star.spectralClass }]
          : []),
        // `temperature` is a BigInt column; format it before it reaches the URL.
        { label: "Temperature", value: `${star.temperature.toString()} K` },
        ...(system ? [{ label: "System", value: system }] : []),
      ],
    });
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ starId: string }>;
}>) {
  const { starId } = await params;
  if (parsePositiveEntityId(starId) === null) notFound();
  return <PageClient />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ starId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
