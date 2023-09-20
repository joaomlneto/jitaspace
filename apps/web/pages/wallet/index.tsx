import React, { type ReactElement } from "react";
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

import { WalletIcon } from "@jitaspace/eve-icons";

import { MainLayout } from "~/layouts";

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
      minHeight: 200,
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
      <Group>
        <WalletIcon width={48} />
        <Title order={1}>Assets</Title>
      </Group>
      <SimpleGrid
        cols={{
          base: 1,
          md: 2,
        }}
        spacing="xl"
        my="xl"
      >
        <UnstyledButton component={Link} href="/wallet/character">
          <Card shadow="md" radius="md" style={classes.card} padding="xl">
            <Container m={0} p={0} w={64} h={64}>
              <WalletIcon height={64} width={64} color={theme.primaryColor} />
            </Container>
            <Group>
              <Text fz="lg" fw={500} style={classes.cardTitle} mt="md">
                Character Wallet
              </Text>
            </Group>
            <Text fz="sm" c="dimmed" mt="sm">
              View your character wallet.
            </Text>
          </Card>
        </UnstyledButton>
        <UnstyledButton component={Link} href="/wallet/corporation">
          <Card shadow="md" radius="md" style={classes.card} padding="xl">
            <Container m={0} p={0} w={64} h={64}>
              <WalletIcon height={64} width={64} color={theme.primaryColor} />
            </Container>
            <Group>
              <Text fz="lg" fw={500} style={classes.cardTitle} mt="md">
                Corporation Wallet
              </Text>
            </Group>
            <Text fz="sm" c="dimmed" mt="sm">
              View your corporation wallet.
            </Text>
          </Card>
        </UnstyledButton>
      </SimpleGrid>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
