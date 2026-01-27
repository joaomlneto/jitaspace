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
import { NextSeo } from "next-seo";

import { ContactsIcon } from "@jitaspace/eve-icons";

import { MainLayout } from "~/layouts";

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
              <ContactsIcon height={64} width={64} color={theme.primaryColor} />
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
                Character Contacts
              </Text>
            </Group>
            <Text fz="sm" c="dimmed" mt="sm">
              View your character's contacts.
            </Text>
          </Card>
        </UnstyledButton>
        <UnstyledButton component={Link} href="/contacts/corporation">
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
              <ContactsIcon height={64} width={64} color={theme.primaryColor} />
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
                Corporation Contacts
              </Text>
            </Group>
            <Text fz="sm" c="dimmed" mt="sm">
              View your corporation's contacts.
            </Text>
          </Card>
        </UnstyledButton>
        <UnstyledButton component={Link} href="/contacts/alliance">
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
              <ContactsIcon height={64} width={64} color={theme.primaryColor} />
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
                Alliance Contacts
              </Text>
            </Group>
            <Text fz="sm" c="dimmed" mt="sm">
              View your alliance's contacts.
            </Text>
          </Card>
        </UnstyledButton>
      </SimpleGrid>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Contacts" />
      {page}
    </MainLayout>
  );
};
