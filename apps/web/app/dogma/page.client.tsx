"use client";

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

import classes from "~/components/Card/SectionLinkCard.module.css";

export default function PageClient() {
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
            className={classes.card}
            styles={{
              root: {
                border: `${rem(1)} solid ${
                  colorScheme === "dark"
                    ? theme.colors.dark[5]
                    : theme.colors.gray[1]
                }`,
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
              <Text fz="lg" fw={500} className={classes.title} mt="md">
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
            className={classes.card}
            styles={{
              root: {
                border: `${rem(1)} solid ${
                  colorScheme === "dark"
                    ? theme.colors.dark[5]
                    : theme.colors.gray[1]
                }`,
              },
            }}
            padding="xl"
          >
            <Container m={0} p={0} w={64} h={64}>
              <OtherIcon height={64} width={64} color={theme.primaryColor} />
            </Container>
            <Group>
              <Text fz="lg" fw={500} className={classes.title} mt="md">
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
