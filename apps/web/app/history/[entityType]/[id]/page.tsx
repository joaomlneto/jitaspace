import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader } from "@mantine/core";

import { pageMetadata } from "~/lib/metadata";
import { parseEntityId } from "~/lib/routeParams";
import EntityHistoryClient from "./page.client";

/**
 * Whether `raw` is the canonical spelling of an entity kind.
 *
 * Unlike the numeric segments there is no id to parse here: `entityType` is
 * matched verbatim against `Entity.kind` in the history DB, which stores
 * lowerCamelCase identifiers ("type", "skinMaterial", "npcCorporationDivision"
 * — every key of ENTITY_TYPE_META). A non-matching kind reads back as an empty
 * timeline, so before this guard `/history/GROUP/25` and `/history/Group/25`
 * each served HTTP 200 alongside `/history/group/25` — an unbounded family of
 * near-duplicate URLs minted from one real page. Rejecting rather than
 * lowercasing keeps exactly one URL per entity, matching how `~/lib/routeParams`
 * treats the numeric ids. Deliberately a shape test and not an allowlist: the
 * kinds are written by an out-of-repo ingest, so a new one must not 404 here.
 */
const isEntityKind = (raw: string) => /^[a-z][A-Za-z0-9]*$/.test(raw);

// `parseEntityId` rather than the positive variant: this catch-all also serves
// `category` and `group`, whose id 0 is a real row (see `~/lib/routeParams`).
export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ entityType: string; id: string }>;
}>) {
  const { entityType, id } = await params;
  const entityId = parseEntityId(id);
  if (entityId === null || !isEntityKind(entityType)) return {};
  return pageMetadata({
    title: `${entityType} ${entityId} — Change History`,
    description: `Change history for EVE Online ${entityType} ${entityId} across client builds.`,
    path: `/history/${entityType}/${entityId}`,
    badge: "Change History",
  });
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ entityType: string; id: string }>;
}>) {
  const { entityType, id } = await params;
  const entityId = parseEntityId(id);
  if (entityId === null || !isEntityKind(entityType)) notFound();
  return <EntityHistoryClient entityType={entityType} entityId={entityId} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ entityType: string; id: string }>;
}>) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
