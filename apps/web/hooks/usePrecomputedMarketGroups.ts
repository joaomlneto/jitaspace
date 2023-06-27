import swrImmutable from "swr/immutable";

import { type GetMarketsGroupsMarketGroupId200 } from "@jitaspace/esi-client";

export const usePrecomputedMarketGroups = () =>
  swrImmutable<{
    marketGroups: Record<string, GetMarketsGroupsMarketGroupId200>;
  }>(
    `/api/esi/market-groups`,
    (input: RequestInfo | URL, init?: RequestInit | undefined) =>
      fetch(input, init).then((res) => res.json()),
  );
