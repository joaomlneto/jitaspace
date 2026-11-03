import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader } from "@mantine/core";
import { NuqsAdapter } from "nuqs/adapters/react";

import { entityTypeMeta } from "~/lib/history";
import { getCachedEntityHistory } from "~/lib/history-entity-page";
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

/**
 * Whether this route serves `raw`'s history. Not an item's: that is the History
 * tab of its item page (`/type/{id}/history`), so `/history/type/{id}` 404s
 * rather than serving a second copy of it.
 */
const isServedHere = (raw: string) => isEntityKind(raw) && raw !== "type";

// `parseEntityId` rather than the positive variant: this catch-all also serves
// `category` and `group`, whose id 0 is a real row (see `~/lib/routeParams`).
export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ entityType: string; id: string }>;
}>) {
  const { entityType, id } = await params;
  const entityId = parseEntityId(id);
  if (entityId === null || !isServedHere(entityType)) return {};
  const { label } = entityTypeMeta(entityType);
  const { name } = await getCachedEntityHistory(entityType, entityId);
  const title = name
    ? `${name} (${label} ${entityId})`
    : `${label} ${entityId}`;
  return pageMetadata({
    title: `${title} — Change History`,
    description: `Change history for EVE Online ${label.toLowerCase()} ${name ?? entityId} across client builds.`,
    path: `/history/${entityType}/${entityId}`,
    badge: "Change History",
  });
}

// ISR, like `/history/build/[build]` (see its page.tsx): the page is cached
// whole per entity after its first request. The history DB is unreachable from
// CI, so this lists one pair the page 404s before reading anything: items are
// not served here.
export function generateStaticParams() {
  return [{ entityType: "type", id: "0" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ entityType: string; id: string }>;
}>) {
  const { entityType, id } = await params;
  const entityId = parseEntityId(id);
  if (entityId === null || !isServedHere(entityType)) notFound();
  // Uncaught: the page is cached whole, so a database failure must throw
  // rather than store a broken page.
  const history = await getCachedEntityHistory(entityType, entityId);
  // nuqs's React adapter keeps the cached page complete; see apps/web/CLAUDE.md
  // → "URL-synced filter state".
  return (
    <NuqsAdapter>
      <EntityHistoryClient history={history} />
    </NuqsAdapter>
  );
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
