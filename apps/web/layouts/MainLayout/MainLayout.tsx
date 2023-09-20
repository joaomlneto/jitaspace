import React, { type PropsWithChildren } from "react";
import { AppShell, rem, type AppShellProps } from "@mantine/core";

import { FooterWithLinks } from "~/layouts/MainLayout/FooterWithLinks";
import { LayoutHeader } from "./LayoutHeader";

export function MainLayout({
  children,
  ...otherProps
}: PropsWithChildren<AppShellProps>) {
  return (
    <AppShell
      header={{ height: rem(60) }}
      style={{
        position: "relative",
        minHeight: "100%",
        boxSizing: "border-box",
      }}
      styles={(_theme) => ({
        main: {
          margin: 0,
          paddingLeft: 0,
          paddingRight: 0,
        },
      })}
      {...otherProps}
    >
      <LayoutHeader />
      {children}
      <FooterWithLinks />
    </AppShell>
  );
}
