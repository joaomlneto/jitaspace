import React, { type PropsWithChildren } from "react";
import { AppShell, createStyles, type AppShellProps } from "@mantine/core";

import { LayoutFooter } from "~/layout/MainLayout/LayoutFooter";
import { LayoutHeader } from "./LayoutHeader";

const useStyles = createStyles((theme) => ({
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
    >
      {children}
      <LayoutFooter />
    </AppShell>
  );
}
