"use client";

import type { PropsWithChildren } from "react";
import { MantineProvider } from "@mantine/core";

import { themes } from "~/themes";

export const AppMantineProvider = ({ children }: PropsWithChildren) => {
  return (
    <MantineProvider defaultColorScheme="dark" theme={themes.default}>
      {children}
    </MantineProvider>
  );
};
