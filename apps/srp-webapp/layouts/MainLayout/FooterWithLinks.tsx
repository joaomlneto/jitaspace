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

const FOOTER_BREAKPOINT = "xs";
const FOOTER_HEIGHT_DESKTOP = rem(51);
const FOOTER_HEIGHT_MOBILE = rem(86);

const useStyles = createStyles((theme) => ({
  footer: {
    height: FOOTER_HEIGHT_MOBILE,
    position: "absolute",
    width: "100%",
    marginTop: theme.spacing.md,
    borderTop: `${rem(1)} solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[5] : theme.colors.gray[2]
    }`,
    [theme.fn.largerThan(FOOTER_BREAKPOINT)]: {
      height: FOOTER_HEIGHT_DESKTOP,
    },
    [theme.fn.smallerThan(FOOTER_BREAKPOINT)]: {
      height: FOOTER_HEIGHT_MOBILE,
    },
  },

  inner: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,

    [theme.fn.smallerThan(FOOTER_BREAKPOINT)]: {
      flexDirection: "column-reverse",
    },
  },

  links: {
    [theme.fn.smallerThan(FOOTER_BREAKPOINT)]: {
      marginBottom: theme.spacing.md,
    },
  },
}));

const links: { link: LinkProps["href"]; label: string }[] = [
  {
    link: "/about",
    label: "About",
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
      <Container size="xl" className={classes.inner}>
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
        {false && <Group className={classes.links}>{items}</Group>}
      </Container>
    </footer>
  );
}