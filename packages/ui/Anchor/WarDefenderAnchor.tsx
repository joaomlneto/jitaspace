import React, { memo } from "react";
import { type LinkProps } from "next/link";
import { type AnchorProps } from "@mantine/core";

import { useGetWarsWarId } from "@jitaspace/esi-client";

import { AllianceAnchor } from "./AllianceAnchor";
import { CorporationAnchor } from "./CorporationAnchor";
import { EveEntityAnchor } from "./EveEntityAnchor";

export type WarDefenderAnchorProps = AnchorProps &
  Omit<LinkProps, "href"> &
  Omit<React.HTMLProps<HTMLAnchorElement>, "ref"> & {
    warId: number;
  };

export const WarDefenderAnchor = memo(
  ({ warId, children, ...otherProps }: WarDefenderAnchorProps) => {
    const { data } = useGetWarsWarId(
      warId ?? 0,
      {},
      { swr: { enabled: warId !== undefined } },
    );

    if (data?.data.defender.alliance_id)
      return (
        <AllianceAnchor
          allianceId={data.data.defender.alliance_id}
          {...otherProps}
        >
          {children}
        </AllianceAnchor>
      );

    if (data?.data.defender.corporation_id)
      return (
        <CorporationAnchor
          corporationId={data.data.defender.corporation_id}
          {...otherProps}
        >
          {children}
        </CorporationAnchor>
      );

    return <EveEntityAnchor {...otherProps}>{children}</EveEntityAnchor>;
  },
);
WarDefenderAnchor.displayName = "WarDefenderAnchor";
