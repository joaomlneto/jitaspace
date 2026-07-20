import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import type { Metadata } from "next";
import { Container, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";

import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { CategoryBreadcrumbs, GroupAnchor } from "@jitaspace/ui";

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
  const categoryId = Number(categoryIdParam);
  if (!categoryId) return {};
  try {
    const { name } = await getCategoryData(categoryId);
    return {
      title: name,
      description: name
        ? `Browse EVE Online ${name} items by group.`
        : undefined,
    };
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
  const categoryId = Number(categoryIdParam);
  if (!categoryIdParam || Number.isNaN(categoryId)) {
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

  const sortedGroups = [...groups].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

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
