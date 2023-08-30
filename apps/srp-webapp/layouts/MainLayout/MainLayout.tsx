import React, { type PropsWithChildren } from "react";
import { AppShell, createStyles, type AppShellProps } from "@mantine/core";

import { FooterWithLinks } from "~/layouts/MainLayout/FooterWithLinks";
import { LayoutHeader } from "./LayoutHeader";

const useStyles = createStyles(() => ({
  container: {
    position: "relative",
    minHeight: "100%",
    boxSizing: "border-box",
  },
}));

export function MainLayout({
  children,
  ...otherProps
}: PropsWithChildren<AppShellProps>) {
  const { classes } = useStyles();
  return (
    <AppShell
      header={<LayoutHeader />}
      className={classes.container}
      {...otherProps}
      styles={(_theme) => ({
        main: {
          margin: 0,
          paddingLeft: 0,
          paddingRight: 0,
        },
      })}
    >
      {children}
      <FooterWithLinks />
    </AppShell>
  );
}
