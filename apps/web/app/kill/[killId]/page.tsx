import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getKillmailsKillmailIdKillmailHash } from "@jitaspace/esi-client";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata, resolveTypeImage } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import PageClient from "./page.client";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ killId: string }>;
  // Next always passes this to a page's generateMetadata; optional here so the
  // function stays callable with params alone.
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { killId } = await params;
  const id = Number(killId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};

  const fallback = pageMetadata({
    title: `Killmail #${id}`,
    description: `EVE Online killmail #${id} — victim, ship, attackers, and dropped loot.`,
    path: `/kill/${id}`,
    badge: "Killmail",
  });

  // ESI needs the killmail hash, which isn't in the path. The page itself
  // recovers a missing hash from zKillboard, but doing that here would put a
  // rate-limited third party on the path of every crawler unfurl — so a
  // detailed card is offered only when the shared link already carries `?hash=`.
  const hash = (await searchParams)?.hash;
  if (typeof hash !== "string" || !hash) return fallback;

  try {
    const killmail = (await getKillmailsKillmailIdKillmailHash(hash, id)).data;
    const { victim } = killmail;

    const [ship, system] = await Promise.all([
      prisma.type.findUnique({
        select: { name: true },
        where: { typeId: victim.ship_type_id },
      }),
      prisma.solarSystem.findUnique({
        select: { name: true },
        where: { solarSystemId: killmail.solar_system_id },
      }),
    ]);

    const when = killmail.killmail_time.slice(0, 10);
    const shipName = ship?.name;
    const systemName = system?.name;

    return pageMetadata({
      title: shipName ? `${shipName} destroyed` : `Killmail #${id}`,
      description: `An EVE Online ${shipName ?? "ship"} was destroyed${
        systemName ? ` in ${systemName}` : ""
      } on ${when} by ${killmail.attackers.length} attackers.`,
      path: `/kill/${id}`,
      badge: "Killmail",
      image: await resolveTypeImage(victim.ship_type_id),
      facts: [
        ...(systemName ? [{ label: "System", value: systemName }] : []),
        { label: "Attackers", value: String(killmail.attackers.length) },
        { label: "Date", value: when },
      ],
    });
  } catch {
    return fallback;
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ killId: string }>;
}>) {
  const { killId } = await params;
  if (parsePositiveEntityId(killId) === null) notFound();
  return <PageClient />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ killId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
