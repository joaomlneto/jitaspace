import React, { type ReactElement } from "react";
import Image, { type ImageProps } from "next/image";
import Link, { type LinkProps } from "next/link";
import {
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

import { jitaApps, universeApps } from "~/config/apps";
import { MainLayout } from "~/layouts";

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

  const classes = {
    title: {
      fontSize: rem(34),
      fontWeight: 900,

      // FIXME MANTINE V7 MIGRATION
      /*
          [theme.fn.smallerThan("sm")]: {
              fontSize: rem(24),
          },*/
    },

    description: {
      maxWidth: 600,
      margin: "auto",

      "&::after": {
        content: '""',
        display: "block",
        backgroundColor: theme.primaryColor,
        width: rem(45),
        height: rem(2),
        marginTop: theme.spacing.sm,
        marginLeft: "auto",
        marginRight: "auto",
      },
    },

    card: {
      height: "100%",
      transition: "transform 0.2s",
      border: `${rem(1)} solid ${
        colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[1]
      }`,
      "&:hover": {
        transform: "scale(1.05)",
      },
    },

    cardTitle: {
      // FIXME MANTINE V7 MIGRATION
      /*
      "&::after": {
        content: '""',
        display: "block",
        backgroundColor: theme.primaryColor,
        width: rem(45),
        height: rem(2),
        marginTop: theme.spacing.sm,
      },*/
    },
  };

  return (
    <Container size="lg">
      <Title order={3}>Capsuleer Tools</Title>
      <SimpleGrid
        cols={{
          base: 1,
          xs: 2,
          sm: 3,
        }}
        spacing="xl"
        my="xl"
      >
        {Object.values(jitaApps).map((feature) => (
          <UnstyledButton
            component={feature.url ? Link : Link}
            href={feature.url ?? ""}
            onClick={feature.onClick}
            key={feature.name}
          >
            <Card shadow="md" radius="md" style={classes.card} padding="xl">
              <Container m={0} p={0} w={64} h={64}>
                <feature.Icon
                  height={64}
                  width={64}
                  color={theme.primaryColor}
                />
              </Container>
              <Group>
                <Text fz="lg" fw={500} style={classes.cardTitle} mt="md">
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
      <SimpleGrid
        cols={{
          base: 1,
          xs: 2,
          sm: 3,
        }}
        spacing="xl"
        my="xl"
      >
        {Object.values(universeApps).map((feature) => (
          <UnstyledButton
            component={feature.url ? Link : Link}
            href={feature.url ?? ""}
            onClick={feature.onClick}
            key={feature.name}
          >
            <Card shadow="md" radius="md" style={classes.card} padding="xl">
              <Container m={0} p={0} w={64} h={64}>
                <feature.Icon
                  height={64}
                  width={64}
                  color={theme.primaryColor}
                />
              </Container>
              <Group>
                <Text fz="lg" fw={500} style={classes.cardTitle} mt="md">
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
      <SimpleGrid
        cols={{
          base: 1,
          xs: 2,
        }}
        spacing="xl"
        my="xl"
      >
        {devApps.map((feature) => (
          <UnstyledButton
            component={feature.url ? Link : Link}
            href={feature.url ?? ""}
            onClick={feature.onClick}
            key={feature.name}
          >
            <Card shadow="md" radius="md" style={classes.card} padding="xl">
              <feature.icon height={64} width={64} color={theme.primaryColor} />
              <Group>
                <Text fz="lg" fw={500} style={classes.cardTitle} mt="md">
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

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
