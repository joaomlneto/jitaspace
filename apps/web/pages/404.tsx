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

  return (
    <Container
      style={{
        paddingTop: rem(80),
        paddingBottom: rem(80),
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontWeight: 900,
          fontSize: rem(220),
          lineHeight: 1,
          marginBottom: `calc(${theme.spacing.xl} * 1.5)`,
          color:
            colorScheme === "dark"
              ? theme.colors.dark[4]
              : theme.colors.gray[2],

          /*
        [theme.fn.smallerThan("sm")]: {
          fontSize: rem(120),
        },*/ // FIXME Mantine v7 migration
        }}
      >
        404
      </div>
      <Title
        style={{
          fontFamily: `Greycliff CF, ${theme.fontFamily}`,
          textAlign: "center",
          fontWeight: 900,
          fontSize: rem(38),
          /*
        [theme.fn.smallerThan("sm")]: {
          fontSize: rem(32),
        },*/ // FIXME Mantine v7 migration
        }}
      >
        You have found a secret place.
      </Title>
      <Text
        c="dimmed"
        size="lg"
        ta="center"
        style={{
          maxWidth: rem(500),
          margin: "auto",
          marginTop: theme.spacing.xl,
          marginBottom: `calc(${theme.spacing.xl} * 1.5)`,
        }}
      >
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
