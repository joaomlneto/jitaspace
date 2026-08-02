import { Suspense } from "react";
import { cacheLife } from "next/cache";

import { PageSkeleton } from "~/components/PageSkeleton";
import type { SdeLastModifiedResponse, VercelStatusResponse } from "./types";
import { prisma } from "~/lib/db";
import StatusPageClient from "./page.client";

export const metadata = {
  title: "Server Status",
  description: "EVE Online Tranquility server status and JitaSpace service health.",
};

async function getVercelStatus() {
  "use server";

  return await fetch("https://www.vercel-status.com/api/v2/status.json", {
    next: { revalidate: 60 },
  }).then((res) => res.json() as Promise<VercelStatusResponse>);
}

async function getSdeLastModified() {
  "use server";

  return await fetch(
    "https://developers.eveonline.com/static-data/tranquility/latest.jsonl",
    {
      next: { revalidate: 60 },
    },
  ).then((res) => res.json() as Promise<SdeLastModifiedResponse>);
}

/**
 * When our SDE-derived data last changed, as the newest `updatedAt` across a
 * sample of tables the SDE ingest owns outright.
 *
 * Tables the ESI scrapers also write (Type, SolarSystem, …) are deliberately
 * excluded: an ESI run touching them would report the SDE as fresher than it
 * is. The sample spans unrelated corners of the SDE because a release that
 * changes nothing at all in every one of them would be unheard of.
 */
async function getSdeDataUpdatedAt(): Promise<string | null> {
  "use cache";
  cacheLife("hours");

  const [blueprints, certificates, skins, typeMaterials, landmarks] =
    await Promise.all([
      prisma.blueprint.aggregate({ _max: { updatedAt: true } }),
      prisma.certificate.aggregate({ _max: { updatedAt: true } }),
      prisma.skin.aggregate({ _max: { updatedAt: true } }),
      prisma.typeMaterial.aggregate({ _max: { updatedAt: true } }),
      prisma.landmark.aggregate({ _max: { updatedAt: true } }),
    ]);

  const newest = [blueprints, certificates, skins, typeMaterials, landmarks]
    .map((result) => result._max.updatedAt)
    .filter((date): date is Date => date !== null)
    .reduce<Date | null>(
      (latest, date) => (latest === null || date > latest ? date : latest),
      null,
    );

  return newest?.toISOString() ?? null;
}

async function StatusPageContent() {
  const vercelStatusData = await getVercelStatus().catch(() => null);
  const sdeLastModifiedData = await getSdeLastModified().catch(() => null);
  const sdeDataUpdatedAt = await getSdeDataUpdatedAt().catch(() => null);

  return (
    <StatusPageClient
      vercelStatusData={vercelStatusData}
      sdeLastModifiedData={sdeLastModifiedData}
      sdeDataUpdatedAt={sdeDataUpdatedAt}
    />
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StatusPageContent />
    </Suspense>
  );
}
