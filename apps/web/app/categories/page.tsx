import { cacheLife } from "next/cache";
import {
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { ItemsIcon } from "@jitaspace/eve-icons";
import { CategoryAnchor } from "@jitaspace/ui";

import { prisma } from "~/lib/db";

export const metadata = {
  title: "Item Categories",
  description:
    "Browse all EVE Online item categories — ships, modules, ammunition, structures, and more.",
};

interface PageProps {
  categories: { categoryId: number; name: string }[];
}

export default async function Page() {
  "use cache";
  cacheLife("days");
  // Deliberately uncaught: a catch inside this `"use cache"` scope would cache
  // the failure as a day-long 404 (e60062ec). Throwing keeps the last good entry.
  const categories: PageProps["categories"] = await prisma.category.findMany({
    select: {
      categoryId: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
  return (
    <Container size="md">
      <Stack>
        <Group>
          <ItemsIcon width={48} />
          <Title>Categories</Title>
        </Group>
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="xs">
          {categories.map((category) => (
            <Group key={category.categoryId}>
              <CategoryAnchor categoryId={category.categoryId}>
                <Text>{category.name}</Text>
              </CategoryAnchor>
            </Group>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
