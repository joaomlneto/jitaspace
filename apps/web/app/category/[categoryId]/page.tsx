import { notFound } from "next/navigation";
import { Container, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";

import { prisma } from "@jitaspace/db";
import { CategoryBreadcrumbs, GroupAnchor } from "@jitaspace/ui";

interface PageProps {
  name?: string;
  groups: { groupId: number; name: string }[];
}

export const revalidate = 86400;

export default async function Page({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId: categoryIdParam } = await params;
  const categoryId = Number(categoryIdParam);
  if (!categoryIdParam || Number.isNaN(categoryId)) {
    notFound();
  }

  let name: PageProps["name"] = undefined;
  let groups: PageProps["groups"] = [];
  try {
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

    name = category.name;
    groups = category.groups;
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
        <CategoryBreadcrumbs categoryId={categoryId} />
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
