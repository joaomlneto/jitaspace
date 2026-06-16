"use client";

import type { SpotlightProps } from "@mantine/spotlight";
import { memo } from "react";

export const JitaSpotlightProvider = memo(
  ({ children }: Omit<SpotlightProps, "actions">) => {
    // FIXME Mantine v7 migration
    return children;
  },
);
JitaSpotlightProvider.displayName = "JitaSpotlightProvider";
