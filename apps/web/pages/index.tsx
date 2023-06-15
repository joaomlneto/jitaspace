import React, { type ReactElement } from "react";
import Image, { type ImageProps } from "next/image";
import Link, { type LinkProps } from "next/link";
import {
  Badge,
  Card,
  Container,
  createStyles,
  Group,
  rem,
  SimpleGrid,
  Text,
  UnstyledButton,
} from "@mantine/core";

import { jitaApps } from "~/config/apps";
import { MainLayout } from "~/layouts";

const devApps: {
  name: string;
  description: string;
  icon: (props: Partial<Omit<ImageProps, "src">>) => React.ReactElement;
  url: LinkProps["href"];
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

const useStyles = createStyles((theme) => ({
  title: {
    fontSize: rem(34),
    fontWeight: 900,

    [theme.fn.smallerThan("sm")]: {
      fontSize: rem(24),
    },
  },

  description: {
    maxWidth: 600,
    margin: "auto",

    "&::after": {
      content: '""',
      display: "block",
      backgroundColor: theme.fn.primaryColor(),
      width: rem(45),
      height: rem(2),
      marginTop: theme.spacing.sm,
      marginLeft: "auto",
      marginRight: "auto",
    },
  },

  card: {
    minHeight: 250,
    transition: "transform 0.2s",
    border: `${rem(1)} solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[1]
    }`,
    "&:hover": {
      transform: "scale(1.05)",
    },
  },

  cardTitle: {
    "&::after": {
      content: '""',
      display: "block",
      backgroundColor: theme.fn.primaryColor(),
      width: rem(45),
      height: rem(2),
      marginTop: theme.spacing.sm,
    },
  },
}));

export default function Page() {
  const { classes, theme } = useStyles();

  return (
    <Container size="lg">
      <SimpleGrid
        cols={2}
        spacing="xl"
        mt="xl"
        breakpoints={[{ maxWidth: "md", cols: 1 }]}
      >
        {[...Object.values(jitaApps), ...devApps].map((feature) => (
          <UnstyledButton
            component={Link}
            href={feature.url}
            key={feature.name}
          >
            <Card shadow="md" radius="md" className={classes.card} padding="xl">
              <feature.icon
                height={64}
                width={64}
                color={theme.fn.primaryColor()}
              />
              <Group>
                <Text fz="lg" fw={500} className={classes.cardTitle} mt="md">
                  {feature.name}
                </Text>
                {feature.tags?.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
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
