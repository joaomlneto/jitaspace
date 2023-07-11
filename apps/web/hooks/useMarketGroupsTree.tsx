import { useEffect, useMemo, useState } from "react";

import {
  getMarketsGroupsMarketGroupId,
  useGetMarketsGroups,
  type GetMarketsGroupsMarketGroupId200,
} from "@jitaspace/esi-client";

export const useMarketGroups = () => {
  // Fetch all IDs
  const {
    data: marketGroupIds,
    isLoading: marketGroupIdsLoading,
    error: marketGroupIdsError,
  } = useGetMarketsGroups(
    {},
    {
      swr: {
        revalidateOnReconnect: false,
        revalidateOnFocus: false,
        revalidateIfStale: false,
      },
    },
  );

  const [marketGroups, setMarketGroupsData] = useState<{
    data: GetMarketsGroupsMarketGroupId200[];
    loading: boolean;
  }>({ data: [], loading: true });

  useEffect(() => {
    if (!marketGroupIds || marketGroupIdsLoading || marketGroupIdsError) {
      return;
    }

    const fetchData = async () => {
      setMarketGroupsData((s) => ({ ...s, loading: true }));
      await Promise.all(
        marketGroupIds.data.map(async (marketGroupId) => {
          return await getMarketsGroupsMarketGroupId(marketGroupId);
        }),
      ).then((marketGroupsResponses) => {
        setMarketGroupsData({
          loading: false,
          data: marketGroupsResponses.map(
            (marketGroupResponse) => marketGroupResponse.data,
          ),
        });
      });
    };

    void fetchData();
  }, [marketGroupIds, marketGroupIdsError, marketGroupIdsLoading]);

  const rootMarketGroupIds = useMemo(() => {
    return (marketGroups.data ?? [])
      .filter((marketGroup) => marketGroup.parent_group_id === undefined)
      .map((marketGroup) => marketGroup.market_group_id);
  }, [marketGroups]);

  const marketGroupsTree = useMemo(() => {
    const result: Record<
      string,
      GetMarketsGroupsMarketGroupId200 & { children: number[] }
    > = {};

    marketGroups.data.forEach((marketGroup) => {
      result[marketGroup.market_group_id] = { ...marketGroup, children: [] };
    });

    marketGroups.data.forEach((marketGroup) => {
      if (marketGroup.parent_group_id) {
        result[marketGroup.parent_group_id]?.children.push(
          marketGroup.market_group_id,
        );
      }
    });

    return result;
  }, [marketGroups]);

  return {
    data: marketGroupsTree,
    rootMarketGroupIds,
    loading: marketGroups.loading,
  };
};
