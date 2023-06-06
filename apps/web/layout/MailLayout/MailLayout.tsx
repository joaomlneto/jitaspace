import React, { type PropsWithChildren } from "react";
import { createStyles } from "@mantine/core";

import { MainLayout } from "~/layout";

const useStyles = createStyles((_theme) => ({
  container: {
    position: "relative",
    minHeight: "100%",
    boxSizing: "border-box",
  },
}));

export type MailLayoutProps = {
  // no props
};

export function MailLayout({ children }: PropsWithChildren<MailLayoutProps>) {
  return <MainLayout /*navbar={<MailLayoutNavbar />}*/>{children}</MainLayout>;
}
