import React, { type PropsWithChildren } from "react";
import { AppShell, createStyles } from "@mantine/core";
import { useSession } from "next-auth/react";

import DefaultLayoutFooter from "./LayoutFooter";
import DefaultLayoutNavbar from "./LayoutNavbar";

const useStyles = createStyles((theme) => ({
  container: {
    position: "relative",
    minHeight: "100%",
    boxSizing: "border-box",
  },
}));

export function MailLayout({ children }: PropsWithChildren<{}>) {
  const { classes } = useStyles();
  const { data: session, status } = useSession();
  return (
    <AppShell
      navbar={status === "authenticated" ? <DefaultLayoutNavbar /> : undefined}
      className={classes.container}
      layout="alt"
    >
      {children}
      <DefaultLayoutFooter />
    </AppShell>
  );
}