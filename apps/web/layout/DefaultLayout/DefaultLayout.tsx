import { AppShell, createStyles } from "@mantine/core";
import React, { PropsWithChildren } from "react";
import DefaultLayoutNavbar from "./DefaultLayoutNavbar";
import DefaultLayoutFooter from "./DefaultLayoutFooter";
import { useSession } from "next-auth/react";

const useStyles = createStyles((theme) => ({
  container: {
    position: "relative",
    minHeight: "100%",
    boxSizing: "border-box",
  },
}));

export default function ExportLayout({ children }: PropsWithChildren<{}>) {
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
