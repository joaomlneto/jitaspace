import React, { type ReactElement } from "react";
import Link from "next/link";
import {
  Button,
  Container,
  Group,
  rem,
  Text,
  Title,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";

import { MainLayout } from "~/layouts";

export default function Page() {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const classes = {
    root: {
      paddingTop: rem(80),
      paddingBottom: rem(80),
    },

    label: {
      // FIXME MANTINE V7 MIGRATION
      //textAlign: "center",
      fontWeight: 900,
      fontSize: rem(220),
      lineHeight: 1,
      marginBottom: `calc(${theme.spacing.xl} * 1.5)`,
      color:
        colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[2],

      // FIXME MANTINE V7 MIGRATION
      /*
      [theme.fn.smallerThan("sm")]: {
        fontSize: rem(120),
      },*/
    },

    title: {
      fontFamily: `Greycliff CF, ${theme.fontFamily}`,
      fontWeight: 900,
      fontSize: rem(38),

      // FIXME MANTINE V7 MIGRATION
      /*
      [theme.fn.smallerThan("sm")]: {
        fontSize: rem(32),
      },*/
    },

    description: {
      maxWidth: rem(500),
      margin: "auto",
      marginTop: theme.spacing.xl,
      marginBottom: `calc(${theme.spacing.xl} * 1.5)`,
    },
  };

  return (
    <Container style={classes.root}>
      <div style={classes.label}>404</div>
      <Title ta="center" style={classes.title}>
        You have found a secret place.
      </Title>
      <Text c="dimmed" size="lg" ta="center" style={classes.description}>
        Unfortunately, this is only a 404 page. You may have mistyped the
        address, or the page has been moved to another URL.
      </Text>
      <Group justify="center">
        <Link href="/">
          <Button variant="subtle" size="md">
            Take me back to home page
          </Button>
        </Link>
      </Group>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
