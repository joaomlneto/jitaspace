import {
  createContext,
  memo,
  useContext,
  useMemo,
  type PropsWithChildren,
} from "react";

import { type GetMarketsGroupsMarketGroupId200 } from "@jitaspace/esi-client";

import { usePrecomputedMarketGroups } from "./usePrecomputedMarketGroups";

type MarketGroupsTreeContext = {
  loading: boolean;
  data: {
    marketGroups: Record<number, MarketGroupWithChildren>;
    rootGroups: number[];
  };
};

const defaultMarketGroupsTreeContext: MarketGroupsTreeContext = {
  loading: true,
  data: {
    marketGroups: {},
    rootGroups: [],
  },
};

const MarketGroupsTreeContext = createContext<MarketGroupsTreeContext>(
  defaultMarketGroupsTreeContext,
);

type MarketGroupWithChildren = GetMarketsGroupsMarketGroupId200 & {
  children: number[];
};

export const MarketGroupsTreeProvider = memo(
  ({ children }: PropsWithChildren) => {
    const { data } = usePrecomputedMarketGroups();

    const marketGroupsTree = useMemo(() => {
      if (!data) {
        return {
          loading: true,
          data: {
            marketGroups: {},
            rootGroups: [],
          },
        };
      }
      console.log("DOING HEAVY COMPUTATION");

      const augmentedEntries: Record<number, MarketGroupWithChildren> = {};
      Object.values(data.marketGroups).forEach((marketGroup, _index, array) => {
        augmentedEntries[marketGroup.market_group_id] = {
          ...marketGroup,
          children: array
            .filter(
              (entry) => entry.parent_group_id === marketGroup.market_group_id,
            )
            .map((entry) => entry.market_group_id),
        };
      });

      return {
        loading: false,
        data: {
          marketGroups: augmentedEntries,
          rootGroups: Object.values(augmentedEntries)
            .filter((entry) => entry.parent_group_id === undefined)
            .map((entry) => entry.market_group_id),
        },
      };
    }, [data]);

    return (
      <MarketGroupsTreeContext.Provider value={marketGroupsTree}>
        {children}
      </MarketGroupsTreeContext.Provider>
    );
  },
);
MarketGroupsTreeProvider.displayName = "MarketGroupsTreeProvider";

export function useMarketGroupsTree() {
  const ctx = useContext(MarketGroupsTreeContext);

  if (!ctx) {
    throw new Error(
      "[@jitaspace/web] MarketGroupsTreeContext was not found in tree",
    );
  }

  return ctx;
}
