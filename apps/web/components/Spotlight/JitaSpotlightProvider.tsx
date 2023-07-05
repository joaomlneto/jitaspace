import { memo, useMemo, useState } from "react";
import { useDebouncedValue } from "@mantine/hooks";
import {
  SpotlightProvider,
  type SpotlightAction,
  type SpotlightProviderProps,
} from "@mantine/spotlight";

import { useEsiSearch } from "@jitaspace/esi-client";
import { AgentFinderIcon } from "@jitaspace/eve-icons";

import { SpotlightActionComponent } from "~/components/Spotlight/SpotlightActionComponent";

export const JitaSpotlightProvider = memo(
  ({ children }: Omit<SpotlightProviderProps, "actions">) => {
    const [query, setQuery] = useState<string>("");
    const [debouncedQuery] = useDebouncedValue(query, 1000);

    const { data: esiSearchData } = useEsiSearch({
      query: debouncedQuery,
      categories: [
        "agent",
        "alliance",
        "character",
        "constellation",
        "corporation",
        "faction",
        "inventory_type",
        "region",
        "solar_system",
        "station",
        "structure",
      ],
    });

    const esiActions: SpotlightAction[] = useMemo(
      () =>
        Object.entries(esiSearchData?.data ?? []).flatMap(
          ([category, entries]) =>
            entries.slice(0, 5).map((entityId) => ({
              title: `Entity ${entityId} - ${debouncedQuery}`,
              entityId: entityId,
              group: category.replace("_", " "),
              onTrigger: () => {
                /* nothing for now */
              },
            })),
        ),
      [esiSearchData],
    );

    const actions: SpotlightAction[] = useMemo(
      (): SpotlightAction[] => [...esiActions],
      [esiActions],
    );
    return useMemo(
      () => (
        <SpotlightProvider
          shortcut={["mod + P", "mod + K", "/"]}
          actions={actions}
          actionComponent={SpotlightActionComponent}
          searchIcon={<AgentFinderIcon width={32} height={32} />}
          query={query}
          limit={50}
          onQueryChange={(value) => {
            console.log("new query value:", value);
            setQuery(value);
          }}
        >
          {children}
        </SpotlightProvider>
      ),
      [actions, children, query],
    );
  },
);
JitaSpotlightProvider.displayName = "JitaSpotlightProvider";
