"use client";

import type { ReactNode } from "react";
import { memo } from "react";

import type { EntityCardVariant } from "@jitaspace/ui";
import { useCorporation } from "@jitaspace/hooks";
import { CorporationCardDisplay } from "@jitaspace/ui";

import { plainText, useEntityRefs } from "./useEntityRefs";

export interface CorporationCardProps {
  corporationId: number;
  variant?: EntityCardVariant;
  headerRightSection?: ReactNode;
}

/** `CorporationCardDisplay`, filled from ESI. */
export const CorporationCard = memo(
  ({
    corporationId,
    variant = "full",
    headerRightSection,
  }: CorporationCardProps) => {
    const { data } = useCorporation(corporationId);
    const corporation = data?.data;
    const ref = useEntityRefs([
      corporation?.alliance_id,
      corporation?.ceo_id,
      corporation?.creator_id,
    ]);
    // ESI reports tax rates as percentages (10.0 means 10%) since
    // compatibility date 2026-08-18. Guard the value, not just its container:
    // a payload without it should read "N/A" rather than throw.
    const taxRates = corporation?.tax_rates;

    return (
      <CorporationCardDisplay
        corporationId={corporationId}
        variant={variant}
        headerRightSection={headerRightSection}
        corporation={
          corporation && {
            name: corporation.name,
            ticker: corporation.ticker,
            alliance: ref(corporation.alliance_id),
            ceo: ref(corporation.ceo_id),
            creator: ref(corporation.creator_id),
            memberCount: corporation.member_count,
            taxRate:
              typeof taxRates?.isk === "number" ? taxRates.isk : undefined,
            shares: corporation.shares,
            dateFounded: corporation.date_founded
              ? new Date(corporation.date_founded)
              : undefined,
            warEligible: corporation.war_eligible,
            description: plainText(corporation.description),
            url: corporation.url,
            palette: corporation.palette,
          }
        }
      />
    );
  },
);
CorporationCard.displayName = "CorporationCard";
