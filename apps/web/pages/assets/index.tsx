import React, { type ReactElement } from "react";
import Link from "next/link";
import {
  Card,
  Container,
  createStyles,
  Group,
  rem,
  SimpleGrid,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";

import { AssetsIcon, CorporationAssetsIcon } from "@jitaspace/eve-icons";

import { MainLayout } from "~/layouts";

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
    minHeight: 200,
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
      <Group>
        <AssetsIcon width={48} />
        <Title order={1}>Assets</Title>
      </Group>
      <SimpleGrid
        cols={2}
        spacing="xl"
        my="xl"
        breakpoints={[{ maxWidth: "md", cols: 1 }]}
      >
        <UnstyledButton component={Link} href="/assets/character">
          <Card shadow="md" radius="md" className={classes.card} padding="xl">
            <Container m={0} p={0} w={64} h={64}>
              <AssetsIcon
                height={64}
                width={64}
                color={theme.fn.primaryColor()}
              />
            </Container>
            <Group>
              <Text fz="lg" fw={500} className={classes.cardTitle} mt="md">
                Character Assets
              </Text>
            </Group>
            <Text fz="sm" c="dimmed" mt="sm">
              View your character assets.
            </Text>
          </Card>
        </UnstyledButton>
        <UnstyledButton component={Link} href="/assets/corporation">
          <Card shadow="md" radius="md" className={classes.card} padding="xl">
            <Container m={0} p={0} w={64} h={64}>
              <CorporationAssetsIcon
                height={64}
                width={64}
                color={theme.fn.primaryColor()}
              />
            </Container>
            <Group>
              <Text fz="lg" fw={500} className={classes.cardTitle} mt="md">
                Corporation Assets
              </Text>
            </Group>
            <Text fz="sm" c="dimmed" mt="sm">
              View your corporation assets.
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
