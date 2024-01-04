import React, { type ReactElement } from "react";
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

import { AttributesIcon, OtherIcon } from "@jitaspace/eve-icons";

import { MainLayout } from "~/layouts";

export default function Page() {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  return (
    <Container size="lg">
      <Group>
        <AttributesIcon width={48} />
        <Title order={1}>Dogma System</Title>
      </Group>
      <SimpleGrid spacing="xl" my="xl" cols={{ base: 1, md: 2 }}>
        <UnstyledButton component={Link} href="/dogma/attributes">
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
              <AttributesIcon
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
                Dogma Attributes
              </Text>
            </Group>
            <Text fz="sm" c="dimmed" mt="sm">
              View the characteristics of all the items in the game.
            </Text>
          </Card>
        </UnstyledButton>
        <UnstyledButton component={Link} href="/dogma/effects">
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
              <OtherIcon height={64} width={64} color={theme.primaryColor} />
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
                Dogma Effects
              </Text>
            </Group>
            <Text fz="sm" c="dimmed" mt="sm">
              View how characteristics of things affect other things.
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
