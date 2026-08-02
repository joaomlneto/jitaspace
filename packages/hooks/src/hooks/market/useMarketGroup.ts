"use client";

import { useQuery } from "@tanstack/react-query";

import { sdeRecordQueryOptions } from "../sde";

/**
 * A market group, from our database.
 *
 * Previously this merged ESI's market group endpoint with the SDE's — the SDE
 * for the icon (ESI exposes none) and ESI for a plain-string name. The database
 * has both, so one lookup now covers it. The returned shape keeps the ESI-style
 * field names the existing consumers (breadcrumbs, avatars) already read.
 */
export const useMarketGroup = (marketGroupId: number) => {
  const { data } = useQuery(
    sdeRecordQueryOptions("market-group", marketGroupId),
  );
  return {
    market_group_id: data?.marketGroupId,
    name: data?.name,
    description: data?.description,
    parent_group_id: data?.parentMarketGroupId ?? undefined,
    iconID: data?.iconId ?? undefined,
  };
};
