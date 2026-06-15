"use client";

import React, { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { AllianceAnchor, CorporationAnchor } from "@jitaspace/ui";

import { EveEntityAnchor } from "./EveEntityAnchor";

export type WarDefenderAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    defenderAllianceId?: number;
    defenderCorporationId?: number;
  };

export const WarDefenderAnchor = memo(
  ({
    defenderAllianceId,
    defenderCorporationId,
    children,
    ...otherProps
  }: WarDefenderAnchorProps) => {
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
WarDefenderAnchor.displayName = "WarDefenderAnchor";
