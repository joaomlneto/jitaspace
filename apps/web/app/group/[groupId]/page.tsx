import { notFound } from "next/navigation";
import { Container, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";

import { prisma } from "@jitaspace/db";
import { GroupBreadcrumbs, TypeAnchor, TypeAvatar } from "@jitaspace/ui";

interface PageProps {
  name?: string;
  types: { typeId: number; name: string }[];
}

export const revalidate = 86400;

export default async function Page({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId: groupIdParam } = await params;
  let name: PageProps["name"] = undefined;
  let types: PageProps["types"] = [];

  try {
    const groupId = Number(groupIdParam);
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

    name = group.name;
    types = group.types ?? [];
  } catch {
    notFound();
  }

  const sortedTypes = [...types].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const groupId = Number(groupIdParam);

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
