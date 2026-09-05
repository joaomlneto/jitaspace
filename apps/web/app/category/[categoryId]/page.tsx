import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import {
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { CategoryBreadcrumbs, GroupAnchor } from "@jitaspace/ui";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata } from "~/lib/metadata";
import { parseEntityId, parsePositiveEntityId } from "~/lib/routeParams";

interface PageProps {
  name?: string;
  groups: { groupId: number; name: string }[];
}

async function getCategoryData(categoryId: number): Promise<PageProps> {
  "use cache";
  cacheLife("days");

  const category = await prisma.category.findUniqueOrThrow({
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
  const categoryId = parsePositiveEntityId(categoryIdParam);
  if (categoryId === null) return {};
  try {
    const { name, groups } = await getCategoryData(categoryId);
    if (!name) return {};
    return pageMetadata({
      title: name,
      description: `Browse EVE Online ${name} by group — ${groups.length} groups of items with attributes and market prices.`,
      path: `/category/${categoryId}`,
      badge: "Item Category",
      facts: [{ label: "Groups", value: String(groups.length) }],
    });
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ categoryId: string }>;
}>) {
  const { categoryId: categoryIdParam } = await params;
  // `parseEntityId`, not the positive variant `generateMetadata` uses: the old
  // `Number.isNaN` guard here accepted `0` while the metadata's falsy test
  // rejected it, and `/category/0` is a real non-deleted row this site puts in
  // its sitemap. Narrowing the page to match the metadata would turn that into
  // a 404; widening the metadata to match the page is a separate decision.
  const categoryId = parseEntityId(categoryIdParam);
  if (categoryId === null) {
    notFound();
  }

  let name: PageProps["name"] = undefined;
  let groups: PageProps["groups"] = [];
  try {
    const data = await getCategoryData(categoryId);
    name = data.name;
    groups = data.groups;
  } catch {
    notFound();
  }

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
