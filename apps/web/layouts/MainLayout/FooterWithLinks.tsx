import React from "react";
import Link, { type LinkProps } from "next/link";
import {
  Anchor,
  Container,
  createStyles,
  Group,
  rem,
  Text,
} from "@mantine/core";

const useStyles = createStyles((theme) => ({
  footer: {
    //marginTop: rem(120),
    marginTop: "auto",
    borderTop: `${rem(1)} solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[2]
    }`,
  },

  inner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,

    [theme.fn.smallerThan("xs")]: {
      flexDirection: "column",
    },
  },

  links: {
    [theme.fn.smallerThan("xs")]: {
      marginTop: theme.spacing.md,
    },
  },
}));

const links: { link: LinkProps["href"]; label: string }[] = [
  {
    link: "/contact",
    label: "Contact",
  },
  {
    link: "/privacy",
    label: "Privacy",
  },
  {
    link: "/status",
    label: "Status",
  },
];

export function FooterWithLinks() {
  const { classes } = useStyles();

  const items = links.map((link) => (
    <Anchor
      key={link.label}
      component={Link}
      href={link.link}
      size="xs"
      color="dimmed"
    >
      {link.label}
    </Anchor>
  ));

  return (
    <footer className={classes.footer}>
      <Container className={classes.inner}>
        <Text color="dimmed" size="xs">
          All EVE-related materials are property of{" "}
          <Anchor
            color="dimmed"
            span
            href="https://ccpgames.com"
            target="_blank"
          >
            CCP Games
          </Anchor>
          .
        </Text>
        <Group className={classes.links}>{items}</Group>
      </Container>
    </footer>
  );
}
