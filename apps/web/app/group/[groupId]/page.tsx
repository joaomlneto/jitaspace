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

import { TypeAnchor, TypeAvatar } from "@jitaspace/eve-components";

import { GroupBreadcrumbs } from "~/components/Breadcrumbs";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { parseEntityId, parsePositiveEntityId } from "~/lib/routeParams";

interface PageProps {
  name?: string;
  types: { typeId: number; name: string }[];
}

async function getGroupData(groupId: number): Promise<PageProps> {
  "use cache";
  cacheLife("days");

  const group = await prisma.group.findUniqueOrThrow({
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
  const groupId = parsePositiveEntityId(groupIdParam);
  if (groupId === null) return {};
  try {
    const { name } = await getGroupData(groupId);
    return {
      title: name,
      description: name
        ? `Browse EVE Online ${name} items and types.`
        : undefined,
      alternates: { canonical: `/group/${groupId}` },
    };
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ groupId: string }>;
}>) {
  const { groupId: groupIdParam } = await params;
  // `parseEntityId`, not the positive variant `generateMetadata` uses: this
  // page had no numeric guard at all, so `/group/0` — a real non-deleted row
  // this site puts in its sitemap — renders today. Narrowing to match the
  // metadata would turn that into a 404; widening the metadata to match the
  // page is a separate decision.
  const groupId = parseEntityId(groupIdParam);
  if (groupId === null) {
    notFound();
  }

  let name: PageProps["name"] = undefined;
  let types: PageProps["types"] = [];

  try {
    const data = await getGroupData(groupId);
    name = data.name;
    types = data.types;
  } catch {
    notFound();
  }

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
