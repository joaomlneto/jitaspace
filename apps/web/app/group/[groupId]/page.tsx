import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import {
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { TypeAnchor, TypeAvatar } from "@jitaspace/ui";

import { GroupBreadcrumbs } from "~/components/Breadcrumbs";
import { prisma } from "~/lib/db";

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
    types: group.types ?? [],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupId: string }>;
}): Promise<Metadata> {
  const { groupId: groupIdParam } = await params;
  const groupId = Number(groupIdParam);
  if (!groupId) return {};
  try {
    const { name } = await getGroupData(groupId);
    return {
      title: name,
      description: name
        ? `Browse EVE Online ${name} items and types.`
        : undefined,
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
  const groupId = Number(groupIdParam);

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
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
