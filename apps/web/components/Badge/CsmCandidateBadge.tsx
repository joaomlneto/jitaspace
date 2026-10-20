"use client";

import type { BadgeProps } from "@mantine/core";
import { Badge } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";
import { CSM_21_RED, csmCandidateAnchor, isCsm21Candidate } from "~/config/csm";

export type CsmCandidateBadgeProps = Omit<BadgeProps, "children"> & {
  characterId?: number;
};

/**
 * "CSM 21 Candidate", for a character standing in the current Council of
 * Stellar Management election; nothing for anyone else. Links to the
 * candidate's card on `/csm`.
 */
export function CsmCandidateBadge({
  characterId,
  ...badgeProps
}: Readonly<CsmCandidateBadgeProps>) {
  if (characterId === undefined || !isCsm21Candidate(characterId)) return null;
  return (
    <Badge
      component={HoverPrefetchLink}
      href={`/csm#${csmCandidateAnchor(characterId)}`}
      color={CSM_21_RED}
      variant="filled"
      style={{ cursor: "pointer" }}
      {...badgeProps}
    >
      CSM 21 Candidate
    </Badge>
  );
}
