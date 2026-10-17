"use client";

import type { AnchorProps } from "@mantine/core";
import type { LinkProps } from "next/link";
import type React from "react";
import { memo } from "react";

import { AllianceAnchor } from "./AllianceAnchor";
import { CorporationAnchor } from "./CorporationAnchor";
import { EveEntityAnchor } from "./EveEntityAnchor";

export type WarAggressorAnchorDisplayProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size" | "style"> & {
    aggressorAllianceId?: number;
    aggressorCorporationId?: number;
  };

export const WarAggressorAnchorDisplay = memo(
  ({
    aggressorAllianceId,
    aggressorCorporationId,
    children,
    ...otherProps
  }: WarAggressorAnchorDisplayProps) => {
    if (aggressorAllianceId)
      return (
        <AllianceAnchor allianceId={aggressorAllianceId} {...otherProps}>
          {children}
        </AllianceAnchor>
      );

    if (aggressorCorporationId)
      return (
        <CorporationAnchor
          corporationId={aggressorCorporationId}
          {...otherProps}
        >
          {children}
        </CorporationAnchor>
      );

    return <EveEntityAnchor {...otherProps}>{children}</EveEntityAnchor>;
  },
);
WarAggressorAnchorDisplay.displayName = "WarAggressorAnchorDisplay";
