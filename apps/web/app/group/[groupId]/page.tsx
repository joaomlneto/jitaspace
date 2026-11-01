import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { TypeAvatar } from "@jitaspace/eve-components";

import { TypeAnchor } from "~/components/Anchor";
import { GroupBreadcrumbs } from "~/components/Breadcrumbs";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata, resolveTypeImage } from "~/lib/metadata";
import { parseEntityId } from "~/lib/routeParams";
import { cacheSdeRead } from "~/lib/sdeCache";

interface GroupData {
  name: string;
  types: { typeId: number; name: string }[];
}

/**
 * Uncaught on purpose: this route is cached whole, so a database failure must
 * throw rather than store a 404 (see "Never catch a database error inside a
 * `"use cache"` scope" in CLAUDE.md). `findUnique` plus a null test keeps a
 * group that genuinely does not exist apart from a failed query.
 */
async function getGroupData(groupId: number): Promise<GroupData | null> {
  "use cache";
  cacheSdeRead();

  const group = await prisma.group.findUnique({
    select: {
      groupId: true,
      name: true,
      types: {
        select: {
          typeId: true,
          name: true,
        },
      },
    },
    where: {
      groupId,
    },
  });

  if (!group) return null;

  return {
    name: group.name,
    // Defensive: guard against a malformed relation payload before the
    // consumer spreads it. `Array.isArray` is a runtime type guard, so this
    // stays lint-clean even though the Prisma type is already an array.
    types: Array.isArray(group.types) ? group.types : [],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const { groupId: groupIdParam } = await params;
  // `parseEntityId`, not the positive variant: group ids start at 0, and
  // `/group/0` ("#System") is a real row the sitemap advertises. The page and
  // this metadata must accept the same ids, or that URL renders with the bare
  // site title and no canonical.
  const groupId = parseEntityId(groupIdParam);
  if (groupId === null) return {};

  // Uncaught, like the page body: a database failure must throw rather than
  // store generic metadata. It shares `getGroupData` with the page, so both
  // resolve to one cache entry.
  const group = await getGroupData(groupId);
  if (!group) return {};

  const { name, types } = group;
  return pageMetadata({
    title: name,
    description: `Browse the ${types.length} EVE Online items in the ${name} group — attributes, market prices, and where to buy them.`,
    path: `/group/${groupId}`,
    badge: "Item Group",
    // The first type in the group stands in as artwork for the whole group.
    image: types[0] ? await resolveTypeImage(types[0].typeId) : undefined,
    facts: [{ label: "Items", value: String(types.length) }],
  });
}

// ISR per group: without `generateStaticParams` an unlisted id re-renders, and
// re-runs the query below, on every request (see apps/web/CLAUDE.md → "ISR
// for a dynamic `[param]` route"). The real ids live in the database, which
// `next build` cannot reach in CI, and Cache Components rejects an empty list
// — so this lists one id `parseEntityId` refuses, which prerenders as a 404
// without a query. Not `0`: `/group/0` is a real row.
export function generateStaticParams() {
  return [{ groupId: "-1" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ groupId: string }>;
}>) {
  const { groupId: groupIdParam } = await params;
  // Same parser as `generateMetadata`, for the same reason: 0 is a real id.
  const groupId = parseEntityId(groupIdParam);
  if (groupId === null) {
    notFound();
  }

  const group = await getGroupData(groupId);
  if (!group) notFound();
  const { name, types } = group;

  const sortedTypes = [...types].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Container size="md">
      <Stack>
        <Group gap="xl">
          <Title order={1}>{name}</Title>
        </Group>
        <GroupBreadcrumbs groupId={groupId} />
        <Title order={3}>Types</Title>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs">
          {sortedTypes.map((type) => (
            <Group wrap="nowrap" key={type.typeId}>
              <TypeAvatar typeId={type.typeId} size="sm" />
              <TypeAnchor typeId={type.typeId}>
                <Text>{type.name}</Text>
              </TypeAnchor>
            </Group>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ groupId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
