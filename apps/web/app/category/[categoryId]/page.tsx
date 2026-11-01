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

import { GroupAnchor } from "~/components/Anchor";
import { CategoryBreadcrumbs } from "~/components/Breadcrumbs";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata } from "~/lib/metadata";
import { parseEntityId } from "~/lib/routeParams";
import { cacheSdeRead } from "~/lib/sdeCache";

interface CategoryData {
  name: string;
  groups: { groupId: number; name: string }[];
}

/**
 * Uncaught on purpose: this route is cached whole, so a database failure must
 * throw rather than store a 404 (see "Never catch a database error inside a
 * `"use cache"` scope" in CLAUDE.md). `findUnique` plus a null test keeps a
 * category that genuinely does not exist apart from a failed query.
 */
async function getCategoryData(
  categoryId: number,
): Promise<CategoryData | null> {
  "use cache";
  cacheSdeRead();

  const category = await prisma.category.findUnique({
    select: {
      categoryId: true,
      name: true,
      groups: {
        select: {
          groupId: true,
          name: true,
        },
      },
    },
    where: {
      categoryId,
    },
  });

  if (!category) return null;

  return {
    name: category.name,
    groups: category.groups,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}): Promise<Metadata> {
  const { categoryId: categoryIdParam } = await params;
  // `parseEntityId`, not the positive variant: category ids start at 0, and
  // `/category/0` ("#System") is a real row the sitemap advertises. The page
  // and this metadata must accept the same ids, or that URL renders with the
  // bare site title and no canonical.
  const categoryId = parseEntityId(categoryIdParam);
  if (categoryId === null) return {};

  // Uncaught, like the page body: a database failure must throw rather than
  // store generic metadata. It shares `getCategoryData` with the page, so both
  // resolve to one cache entry.
  const category = await getCategoryData(categoryId);
  if (!category) return {};

  const { name, groups } = category;
  return pageMetadata({
    title: name,
    description: `Browse EVE Online ${name} by group — ${groups.length} groups of items with attributes and market prices.`,
    path: `/category/${categoryId}`,
    badge: "Item Category",
    facts: [{ label: "Groups", value: String(groups.length) }],
  });
}

// ISR per category: without `generateStaticParams` an unlisted id re-renders,
// and re-runs the query below, on every request (see apps/web/CLAUDE.md → "ISR
// for a dynamic `[param]` route"). The real ids live in the database, which
// `next build` cannot reach in CI, and Cache Components rejects an empty list
// — so this lists one id `parseEntityId` refuses, which prerenders as a 404
// without a query. Not `0`: `/category/0` is a real row.
export function generateStaticParams() {
  return [{ categoryId: "-1" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ categoryId: string }>;
}>) {
  const { categoryId: categoryIdParam } = await params;
  // Same parser as `generateMetadata`, for the same reason: 0 is a real id.
  const categoryId = parseEntityId(categoryIdParam);
  if (categoryId === null) {
    notFound();
  }

  const category = await getCategoryData(categoryId);
  if (!category) notFound();
  const { name, groups } = category;

  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Container size="md">
      <Stack>
        <Group gap="xl">
          <Title order={1}>{name}</Title>
        </Group>
        <CategoryBreadcrumbs categoryId={categoryId} categoryName={name} />
        <Stack gap="xs">
          <Title order={3}>Groups</Title>
          <SimpleGrid spacing="xs" cols={{ base: 1, xs: 2, md: 3 }}>
            {sortedGroups.map((group) => (
              <Group key={group.groupId}>
                <GroupAnchor groupId={group.groupId} key={group.groupId}>
                  <Text>{group.name}</Text>
                </GroupAnchor>
              </Group>
            ))}
          </SimpleGrid>
        </Stack>
      </Stack>
    </Container>
  );
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ categoryId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
