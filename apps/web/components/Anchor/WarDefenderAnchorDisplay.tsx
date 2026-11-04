"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import type React from "react";
import { memo } from "react";

import { AllianceAnchor } from "./AllianceAnchor";
import { CorporationAnchor } from "./CorporationAnchor";
import { EveEntityAnchor } from "./EveEntityAnchor";

export type WarDefenderAnchorDisplayProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    defenderAllianceId?: number;
    defenderCorporationId?: number;
  };

export const WarDefenderAnchorDisplay = memo(
  ({
    defenderAllianceId,
    defenderCorporationId,
    children,
    ...otherProps
  }: WarDefenderAnchorDisplayProps) => {
    if (defenderAllianceId)
      return (
        <AllianceAnchor allianceId={defenderAllianceId} {...otherProps}>
          {children}
        </AllianceAnchor>
      );

    if (defenderCorporationId)
      return (
        <CorporationAnchor
          corporationId={defenderCorporationId}
          {...otherProps}
        >
          {children}
        </CorporationAnchor>
      );

    return <EveEntityAnchor {...otherProps}>{children}</EveEntityAnchor>;
  },
);
WarDefenderAnchorDisplay.displayName = "WarDefenderAnchorDisplay";
