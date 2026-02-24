"use client";

import type { ImageProps } from "next/image";
import type { LinkProps } from "next/link";
import type React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Anchor,
  Badge,
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
import { openContextModal } from "@mantine/modals";

import { useAuthenticatedCharacterIds } from "@jitaspace/hooks";
import { CharacterAvatar } from "@jitaspace/ui";

import { AuthenticatedCharacterCard } from "~/components/Card";
import { DevelopmentModeAlert } from "~/components/debug";
import { characterApps, universeApps } from "~/config/apps";

const devApps: {
  name: string;
  description: string;
  icon: (props: Partial<Omit<ImageProps, "src">>) => React.ReactElement;
  url: LinkProps["href"];
  onClick?: () => void;
  tags?: string[];
}[] = [
  {
    name: "An OpenAPI for the SDE",
    description:
      "An OpenAPI specification for the EVE Online Static Data Export, making it easy to integrate into your web applications without the need for a database.",
    icon: ({ alt, ...otherProps }) => (
      <Image
        src="https://images.evetech.net/types/60753/icon?size=64"
        alt={alt ?? "SDE OpenAPI"}
        {...otherProps}
      />
    ),
    url: "https://sde.jita.space",
  },
];

export default function Page() {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const authenticatedCharacterIds = useAuthenticatedCharacterIds();

  return (
    <Container size="xl">
      {process.env.NODE_ENV == "development" && <DevelopmentModeAlert />}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {authenticatedCharacterIds.map((characterId) => (
          <AuthenticatedCharacterCard
            characterId={characterId}
            key={characterId}
          />
        ))}
      </SimpleGrid>
      <Group wrap="nowrap" gap="xs" mt="md" mb="xl">
        <CharacterAvatar characterId={1} size="sm" />
        <Anchor
          onClick={() => {
            openContextModal({
              modal: "login",
              title: "Login",
              size: "xl",
              innerProps: {},
            });
          }}
        >
          Add character
        </Anchor>
      </Group>
      <Title order={3}>Capsuleer Tools</Title>
      <SimpleGrid spacing="xl" my="xl" cols={{ base: 1, xs: 2, sm: 3 }}>
        {Object.values(characterApps).map((feature) => (
          <UnstyledButton
            component={feature.url ? Link : Link}
            href={feature.url ?? ""}
            onClick={feature.onClick}
            key={feature.name}
          >
            <Card
              shadow="md"
              radius="md"
              styles={{
                root: {
                  height: "100%",
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
                <feature.Icon
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
                  {feature.name}
                </Text>
                {feature.tags?.map((tag) => <Badge key={tag}>{tag}</Badge>)}
              </Group>
              <Text fz="sm" c="dimmed" mt="sm">
                {feature.description}
              </Text>
            </Card>
          </UnstyledButton>
        ))}
      </SimpleGrid>
      <Title order={3}>Universe</Title>
      <SimpleGrid spacing="xl" my="xl" cols={{ base: 1, xs: 2, sm: 3 }}>
        {Object.values(universeApps).map((feature) => (
          <UnstyledButton
            component={feature.url ? Link : Link}
            href={feature.url ?? ""}
            onClick={feature.onClick}
            key={feature.name}
          >
            <Card
              shadow="md"
              radius="md"
              styles={{
                root: {
                  height: "100%",
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
                <feature.Icon
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
                  {feature.name}
                </Text>
                {feature.tags?.map((tag) => <Badge key={tag}>{tag}</Badge>)}
              </Group>
              <Text fz="sm" c="dimmed" mt="sm">
                {feature.description}
              </Text>
            </Card>
          </UnstyledButton>
        ))}
      </SimpleGrid>
      <Title order={3}>Development Tools</Title>
      <SimpleGrid spacing="xl" my="xl" cols={{ base: 1, xs: 2 }}>
        {devApps.map((feature) => (
          <UnstyledButton
            component={feature.url ? Link : Link}
            href={feature.url ?? ""}
            onClick={feature.onClick}
            key={feature.name}
          >
            <Card
              shadow="md"
              radius="md"
              styles={{
                root: {
                  height: "100%",
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
              <feature.icon height={64} width={64} color={theme.primaryColor} />
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
                  {feature.name}
                </Text>
                {feature.tags?.map((tag) => <Badge key={tag}>{tag}</Badge>)}
              </Group>
              <Text fz="sm" c="dimmed" mt="sm">
                {feature.description}
              </Text>
            </Card>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Container>
  );
}
