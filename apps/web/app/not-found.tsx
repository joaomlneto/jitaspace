"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Container,
  Group,
  rem,
  Text,
  Title,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";

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
      <Box
        fz={{ base: 120, sm: 220 }}
        style={{
          textAlign: "center",
          fontWeight: 900,
          lineHeight: 1,
          marginBottom: `calc(${theme.spacing.xl} * 1.5)`,
          color:
            colorScheme === "dark"
              ? theme.colors.dark[4]
              : theme.colors.gray[2],
        }}
      >
        404
      </Box>
      <Title
        fz={{ base: 32, sm: 38 }}
        style={{
          fontFamily: `Greycliff CF, ${theme.fontFamily}`,
          textAlign: "center",
          fontWeight: 900,
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
