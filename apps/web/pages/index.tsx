import React, { type ReactElement } from "react";
import Link from "next/link";
import {
  Card,
  Container,
  createStyles,
  Image,
  rem,
  SimpleGrid,
  Text,
  UnstyledButton,
  type ImageProps,
} from "@mantine/core";

import { MainLayout } from "~/layout";

const apps: {
  title: string;
  description: string;
  icon: (props: ImageProps) => JSX.Element;
  href: string;
}[] = [
  {
    title: "EveMail",
    description:
      "Access your EVE Online correspondence whilst out of the game.",
    icon: (props: ImageProps) => (
      <Image src="/icons/evemail.png" alt="Mail" {...props} />
    ),
    href: "/mail",
  },
  {
    title: "Calendar",
    description:
      "View upcoming events and meetings on your EVE Online calendar.",
    icon: (props: ImageProps) => (
      <Image src="/icons/calendar.png" alt="Calendar" {...props} />
    ),
    href: "/calendar",
  },
  {
    title: "An OpenAPI for the SDE",
    description:
      "An OpenAPI specification for the EVE Online Static Data Export, making it easy to integrate into your web applications without the need for a database.",
    icon: (props: ImageProps) => (
      <Image
        src="https://images.evetech.net/types/60753/icon?size=64"
        alt="EveMail"
        {...props}
      />
    ),
    href: "https://sde.jita.space",
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
        {apps.map((feature) => (
          <UnstyledButton
            component={Link}
            href={feature.href}
            key={feature.title}
          >
            <Card shadow="md" radius="md" className={classes.card} padding="xl">
              <feature.icon width={rem(64)} color={theme.fn.primaryColor()} />
              <Text fz="lg" fw={500} className={classes.cardTitle} mt="md">
                {feature.title}
              </Text>
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
