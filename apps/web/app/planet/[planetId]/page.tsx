import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata, resolveTypeImage } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { cacheSdeRead } from "~/lib/sdeCache";
import PageClient from "./page.client";

/**
 * Uncaught on purpose: this route is cached whole, so a database failure must
 * throw rather than store a 404 (see "Never catch a database error inside a
 * `"use cache"` scope" in CLAUDE.md). `null` is a planet that genuinely does
 * not exist.
 */
async function readPlanet(planetId: number) {
  "use cache";
  cacheSdeRead();

  return prisma.planet.findUnique({
    select: {
      name: true,
      typeId: true,
      type: { select: { name: true } },
      solarSystem: { select: { name: true } },
      _count: { select: { moons: true } },
    },
    where: { planetId },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ planetId: string }>;
}): Promise<Metadata> {
  const { planetId } = await params;
  const id = parsePositiveEntityId(planetId);
  if (id === null) return {};

  // Uncaught, like the page body: a database failure must throw rather than
  // store generic metadata. It shares `readPlanet` with the page, so both
  // resolve to one cache entry.
  const planet = await readPlanet(id);
  if (!planet) return {};

  const kind = planet.type.name;
  const system = planet.solarSystem.name;

  const kindPhrase = kind ? ` ${kind}` : " planet";
  const inSystem = system ? ` in the ${system} solar system` : "";

  return pageMetadata({
    title: planet.name,
    description: `${planet.name} is a${kindPhrase}${inSystem} of EVE Online.`,
    path: `/planet/${id}`,
    badge: "Planet",
    image: await resolveTypeImage(planet.typeId),
    facts: [
      ...(kind ? [{ label: "Type", value: kind }] : []),
      ...(system ? [{ label: "System", value: system }] : []),
      ...(planet._count.moons
        ? [{ label: "Moons", value: String(planet._count.moons) }]
        : []),
    ],
  });
}

// ISR per planet: without `generateStaticParams` an unlisted id re-renders on
// every request (see apps/web/CLAUDE.md → "ISR for a dynamic `[param]`
// route"). The real ids live in the database, which `next build` cannot reach
// in CI, and Cache Components rejects an empty list — so this lists one id
// `parsePositiveEntityId` refuses, which prerenders as a 404 without a query.
export function generateStaticParams() {
  return [{ planetId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ planetId: string }>;
}>) {
  const { planetId } = await params;
  const id = parsePositiveEntityId(planetId);
  if (id === null) notFound();

  // The same cached read as the metadata, so an id with no planet is a stored
  // 404 rather than a stored empty page.
  if (!(await readPlanet(id))) notFound();

  // The parsed id, not `useParams()`: the client then renders from its props.
  return <PageClient planetId={id} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ planetId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
