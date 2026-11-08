"use client";

import type { ReactNode } from "react";
import { memo } from "react";

import type { EntityCardVariant } from "@jitaspace/ui";
import {
  useEsiAllianceInformation,
  useEsiAllianceMemberCorporations,
} from "@jitaspace/hooks";
import { AllianceCardDisplay, MEMBER_CORPORATIONS_SHOWN } from "@jitaspace/ui";

import { useEntityRefs } from "./useEntityRefs";

export interface AllianceCardProps {
  allianceId: number;
  variant?: EntityCardVariant;
  headerRightSection?: ReactNode;
}

/** `AllianceCardDisplay`, filled from ESI. */
export const AllianceCard = memo(
  ({ allianceId, variant = "full", headerRightSection }: AllianceCardProps) => {
    const { data: allianceData } = useEsiAllianceInformation(allianceId);
    const { data: membersData } = useEsiAllianceMemberCorporations(allianceId);
    const alliance = allianceData?.data;
    // Only the members the card lists need their names resolved.
    const memberIds = membersData?.data;
    const shownMemberIds =
      variant === "full"
        ? (memberIds?.slice(0, MEMBER_CORPORATIONS_SHOWN) ?? [])
        : [];

    const ref = useEntityRefs([
      alliance?.executor_corporation_id,
      alliance?.creator_corporation_id,
      alliance?.creator_id,
      ...shownMemberIds,
    ]);

    return (
      <AllianceCardDisplay
        allianceId={allianceId}
        variant={variant}
        headerRightSection={headerRightSection}
        alliance={
          alliance && {
            name: alliance.name,
            ticker: alliance.ticker,
            dateFounded: new Date(alliance.date_founded),
            executorCorporation: ref(alliance.executor_corporation_id),
            creatorCorporation: ref(alliance.creator_corporation_id),
            creator: ref(alliance.creator_id),
            memberCorporations:
              memberIds && shownMemberIds.flatMap((id) => ref(id) ?? []),
            memberCorporationCount: memberIds?.length,
          }
        }
      />
    );
  },
);
AllianceCard.displayName = "AllianceCard";
