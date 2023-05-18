import { useState } from "react";
import Link, { type LinkProps } from "next/link";
import {
  Box,
  Collapse,
  Group,
  ThemeIcon,
  UnstyledButton,
  createStyles,
  rem,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

const useStyles = createStyles((theme) => ({
  control: {
    fontWeight: 500,
    display: "block",
    width: "100%",
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    color: theme.colorScheme === "dark" ? theme.colors.dark[0] : theme.black,
    fontSize: theme.fontSizes.md,

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[7]
          : theme.colors.gray[0],
      color: theme.colorScheme === "dark" ? theme.white : theme.black,
    },
  },

  link: {
    fontWeight: 500,
    display: "block",
    textDecoration: "none",
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    paddingLeft: rem(31),
    marginLeft: rem(30),
    fontSize: theme.fontSizes.sm,
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[0]
        : theme.colors.gray[7],
    borderLeft: `${rem(1)} solid ${
      theme.colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
    }`,

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[7]
          : theme.colors.gray[0],
      color: theme.colorScheme === "dark" ? theme.white : theme.black,
    },
  },

  chevron: {
    transition: "transform 200ms ease",
  },
}));

interface LinksGroupProps {
  icon: JSX.Element;
  rightIcon?: JSX.Element;
  label: JSX.Element;
  link?: LinkProps["href"];
  initiallyOpened?: boolean;
  links?: { key: string; label: JSX.Element | string; link: string }[];
}

export default function LinksGroup({
  icon,
  rightIcon,
  label,
  link,
  initiallyOpened,
  links,
}: LinksGroupProps) {
  const { classes, theme } = useStyles();
  const hasLinks = Array.isArray(links);
  const [opened, setOpened] = useState(initiallyOpened || false);
  const ChevronIcon = theme.dir === "ltr" ? IconChevronRight : IconChevronLeft;
  const items = (hasLinks ? links : []).map((link) => (
    <UnstyledButton
      component={Link}
      className={classes.link}
      href={link.link}
      key={link.key}
    >
      {link.label}
    </UnstyledButton>
  ));

  const buttonContent = (
    <Group position="apart" spacing={0}>
      <Group spacing={0}>
        <ThemeIcon variant="light" size={30}>
          {icon}
        </ThemeIcon>
        <Box ml="md">{label}</Box>
      </Group>
      <Group>
        {rightIcon}
        {hasLinks && (
          <ChevronIcon
            className={classes.chevron}
            size={14}
            stroke={1.5}
            style={{
              transform: opened
                ? `rotate(${theme.dir === "rtl" ? -90 : 90}deg)`
                : "none",
            }}
          />
        )}
      </Group>
    </Group>
  );

  return (
    <>
      {link ? (
        <UnstyledButton
          component={Link}
          className={classes.control}
          href={link}
        >
          {buttonContent}
        </UnstyledButton>
      ) : (
        <UnstyledButton
          className={classes.control}
          onClick={() => setOpened((o) => !o)}
        >
          {buttonContent}
        </UnstyledButton>
      )}
      {hasLinks ? <Collapse in={opened}>{items}</Collapse> : null}
    </>
  );
}
