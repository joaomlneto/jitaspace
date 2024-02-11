"use client";

import React, { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { useGetWarsWarId } from "@jitaspace/esi-client";

import { AllianceAnchor } from "./AllianceAnchor";
import { CorporationAnchor } from "./CorporationAnchor";
import { EveEntityAnchor } from "./EveEntityAnchor";


export type WarAggressorAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref" | "size"> & {
    warId: number;
  };

export const WarAggressorAnchor = memo(
  ({ warId, children, ...otherProps }: WarAggressorAnchorProps) => {
    const { data } = useGetWarsWarId(
      warId ?? 0,
      {},
      {},
      { query: { enabled: warId !== undefined } },
    );

    if (data?.data.aggressor.alliance_id)
      return (
        <AllianceAnchor
          allianceId={data.data.aggressor.alliance_id}
          {...otherProps}
        >
          {children}
        </AllianceAnchor>
      );

    if (data?.data.aggressor.corporation_id)
      return (
        <CorporationAnchor
          corporationId={data.data.aggressor.corporation_id}
          {...otherProps}
        >
          {children}
        </CorporationAnchor>
      );

    return <EveEntityAnchor {...otherProps}>{children}</EveEntityAnchor>;
  },
);
WarAggressorAnchor.displayName = "WarAggressorAnchor";
