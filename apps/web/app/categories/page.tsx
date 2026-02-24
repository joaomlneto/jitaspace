import { notFound } from "next/navigation";
import {
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { prisma } from "@jitaspace/db";
import { ItemsIcon } from "@jitaspace/eve-icons";
import { CategoryAnchor } from "@jitaspace/ui";


interface PageProps {
  categories: { categoryId: number; name: string }[];
}

export const revalidate = 86400;

export default async function Page() {
  let categories: PageProps["categories"] = [];
  try {
    categories = await prisma.category.findMany({
      select: {
        categoryId: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  } catch {
    notFound();
  }
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
