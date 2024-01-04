import React, { type PropsWithChildren } from "react";
import { AppShell, type AppShellProps } from "@mantine/core";

import { FooterWithLinks } from "~/layouts/MainLayout/FooterWithLinks";


export function MainLayout({
  children,
  ...otherProps
}: PropsWithChildren<AppShellProps>) {
  return (
    <AppShell
      header={{ height: 60 }} // FIXME Mantine v7 migration
      styles={{
        main: {
          margin: 0,
          paddingLeft: 0,
          paddingRight: 0,
        },
        root: {
          position: "relative",
          minHeight: "100%",
          boxSizing: "border-box",
        },
      }}
      {...otherProps}
    >
      {children}
      <FooterWithLinks />
    </AppShell>
  );
}
