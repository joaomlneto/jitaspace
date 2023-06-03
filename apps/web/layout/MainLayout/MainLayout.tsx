import React, { type PropsWithChildren } from "react";
import { AppShell, createStyles } from "@mantine/core";
import { useSession } from "next-auth/react";

import { LayoutFooter } from "~/layout/MainLayout/LayoutFooter";
import { LayoutHeader } from "./LayoutHeader";

const useStyles = createStyles((theme) => ({
  container: {
    position: "relative",
    minHeight: "100%",
    boxSizing: "border-box",
  },
}));

export function MainLayout({ children }: PropsWithChildren<{}>) {
  const { classes } = useStyles();
  const { data: session, status } = useSession();
  return (
    <AppShell
      header={<LayoutHeader />}
      className={classes.container}
      layout="alt"
    >
      {children}
      <LayoutFooter />
    </AppShell>
  );
}
