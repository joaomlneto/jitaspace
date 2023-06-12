import React, { type PropsWithChildren } from "react";

import { MainLayout } from "~/layouts";

/*
const useStyles = createStyles((_theme) => ({
  container: {
    position: "relative",
    minHeight: "100%",
    boxSizing: "border-box",
  },
}));*/

export type MailLayoutProps = {
  // no props
};

export function MailLayout({ children }: PropsWithChildren<MailLayoutProps>) {
  return <MainLayout /*navbar={<MailLayoutNavbar />}*/>{children}</MainLayout>;
}
