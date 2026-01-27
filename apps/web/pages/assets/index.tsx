import type { ReactElement } from "react";
import Link from "next/link";
import {
  Card,
  Container,
  Group,
  rem,
  SimpleGrid,
  Text,
  Title,
  UnstyledButton,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";

import { AssetsIcon, CorporationAssetsIcon } from "@jitaspace/eve-icons";

import { MainLayout } from "~/layouts";

export default function Page() {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  return (
    <Container size="lg">
      <Group>
        <AssetsIcon width={48} />
        <Title order={1}>Assets</Title>
      </Group>
      <SimpleGrid spacing="xl" my="xl" cols={{ base: 1, md: 2 }}>
        <UnstyledButton component={Link} href="/assets/character">
          <Card
            shadow="md"
            radius="md"
            mih={200}
            styles={{
              root: {
                transition: "transform 0.2s",
                border: `${rem(1)} solid ${
                  colorScheme === "dark"
                    ? theme.colors.dark[5]
                    : theme.colors.gray[1]
                }`,
                /* // FIXME Mantine v7 migration
              "&:hover": {
                transform: "scale(1.05)",
              },*/
              },
            }}
            padding="xl"
          >
            <Container m={0} p={0} w={64} h={64}>
              <AssetsIcon height={64} width={64} color={theme.primaryColor} />
            </Container>
            <Group>
              <Text
                fz="lg"
                fw={500}
                style={{
                  "&::after": {
                    content: '""',
                    display: "block",
                    backgroundColor: theme.primaryColor,
                    width: rem(45),
                    height: rem(2),
                    marginTop: theme.spacing.sm,
                  },
                }}
                mt="md"
              >
                Character Assets
              </Text>
            </Group>
            <Text fz="sm" c="dimmed" mt="sm">
              View your character assets.
            </Text>
          </Card>
        </UnstyledButton>
        <UnstyledButton component={Link} href="/assets/corporation">
          <Card
            shadow="md"
            radius="md"
            mih={200}
            styles={{
              root: {
                transition: "transform 0.2s",
                border: `${rem(1)} solid ${
                  colorScheme === "dark"
                    ? theme.colors.dark[5]
                    : theme.colors.gray[1]
                }`,
                /* // FIXME Mantine v7 migration
                  "&:hover": {
                    transform: "scale(1.05)",
                  },*/
              },
            }}
            padding="xl"
          >
            <Container m={0} p={0} w={64} h={64}>
              <CorporationAssetsIcon
                height={64}
                width={64}
                color={theme.primaryColor}
              />
            </Container>
            <Group>
              <Text
                fz="lg"
                fw={500}
                style={{
                  "&::after": {
                    content: '""',
                    display: "block",
                    backgroundColor: theme.primaryColor,
                    width: rem(45),
                    height: rem(2),
                    marginTop: theme.spacing.sm,
                  },
                }}
                mt="md"
              >
                Corporation Assets
              </Text>
            </Group>
            <Text fz="sm" c="dimmed" mt="sm">
              View your corporation assets.
            </Text>
          </Card>
        </UnstyledButton>
      </SimpleGrid>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
