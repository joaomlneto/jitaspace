"use client";

import React, { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { AllianceAnchor } from "./AllianceAnchor";
import { CorporationAnchor } from "./CorporationAnchor";
import { EveEntityAnchor } from "./EveEntityAnchor";

export type WarAggressorAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    aggressorAllianceId?: number;
    aggressorCorporationId?: number;
  };

export const WarAggressorAnchor = memo(
  ({
    aggressorAllianceId,
    aggressorCorporationId,
    children,
    ...otherProps
  }: WarAggressorAnchorProps) => {
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
WarAggressorAnchor.displayName = "WarAggressorAnchor";
