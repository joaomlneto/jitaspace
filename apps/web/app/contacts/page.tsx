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

import { ContactsIcon } from "@jitaspace/eve-icons";

import classes from "~/components/Card/SectionLinkCard.module.css";

export default function Page() {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  return (
    <Container size="lg">
      <Group>
        <ContactsIcon width={48} />
        <Title order={1}>Contacts</Title>
      </Group>
      <SimpleGrid spacing="xl" my="xl" cols={{ base: 1, md: 3 }}>
        <UnstyledButton component={Link} href="/contacts/character">
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
              <ContactsIcon height={64} width={64} color={theme.primaryColor} />
            </Container>
            <Group>
              <Text fz="lg" fw={500} className={classes.title} mt="md">
                Character Contacts
              </Text>
            </Group>
            <Text fz="sm" c="dimmed" mt="sm">
              View your character&apos;s contacts.
            </Text>
          </Card>
        </UnstyledButton>
        <UnstyledButton component={Link} href="/contacts/corporation">
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
              <ContactsIcon height={64} width={64} color={theme.primaryColor} />
            </Container>
            <Group>
              <Text fz="lg" fw={500} className={classes.title} mt="md">
                Corporation Contacts
              </Text>
            </Group>
            <Text fz="sm" c="dimmed" mt="sm">
              View your corporation&apos;s contacts.
            </Text>
          </Card>
        </UnstyledButton>
        <UnstyledButton component={Link} href="/contacts/alliance">
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
              <ContactsIcon height={64} width={64} color={theme.primaryColor} />
            </Container>
            <Group>
              <Text fz="lg" fw={500} className={classes.title} mt="md">
                Alliance Contacts
              </Text>
            </Group>
            <Text fz="sm" c="dimmed" mt="sm">
              View your alliance&apos;s contacts.
            </Text>
          </Card>
        </UnstyledButton>
      </SimpleGrid>
    </Container>
  );
}
