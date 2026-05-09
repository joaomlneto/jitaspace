import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { Container, Group, Loader, SimpleGrid, Stack, Text, Title } from "@mantine/core";

import { prisma } from "@jitaspace/db";
import { GroupBreadcrumbs, TypeAnchor, TypeAvatar } from "@jitaspace/ui";

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

async function PageContent({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
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

  const sortedTypes = [...types].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

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
}: {
  params: Promise<{ groupId: string }>;
}) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
