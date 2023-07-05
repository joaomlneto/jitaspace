import { memo, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useDebouncedValue } from "@mantine/hooks";
import {
  SpotlightProvider,
  type SpotlightAction,
  type SpotlightProviderProps,
} from "@mantine/spotlight";

import { useEsiSearch } from "@jitaspace/esi-client";
import { PeopleAndPlacesIcon } from "@jitaspace/eve-icons";

import { JitaSpotlightAction } from "~/components/Spotlight/JitaSpotlightAction";
import { JitaSpotlightActionsWrapper } from "~/components/Spotlight/JitaSpotlightActionsWrapper";
import { jitaApps } from "~/config/apps";

export const JitaSpotlightProvider = memo(
  ({ children }: Omit<SpotlightProviderProps, "actions">) => {
    const router = useRouter();
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

    const staticActions: SpotlightAction[] = useMemo(
      () =>
        Object.values(jitaApps).map((app) => ({
          title: app.name,
          type: "app",
          group: "Apps",
          onTrigger: () => {
            void router.push(app.url);
          },
          icon: <app.icon width={38} />,
        })) as SpotlightAction[],
      [router],
    );

    const esiActions: SpotlightAction[] = useMemo(
      () =>
        Object.entries(esiSearchData?.data ?? []).flatMap(
          ([category, entries]) =>
            entries.slice(0, 10).map((entityId) => ({
              title: `Entity ${entityId} - ${debouncedQuery}`,
              type: "eve-entity",
              entityId: entityId,
              group: category.replace("_", " "),
              onTrigger: () => {
                switch (category) {
                  case "character": {
                    void router.push(`/character/${entityId}`);
                  }
                }
              },
            })),
        ),
      [debouncedQuery, esiSearchData?.data, router],
    );

    const actions: SpotlightAction[] = useMemo(
      (): SpotlightAction[] => [...staticActions, ...esiActions],
      [esiActions, staticActions],
    );
    return useMemo(
      () => (
        <SpotlightProvider
          shortcut={["mod + P", "mod + K", "/"]}
          actions={actions}
          // @ts-expect-error extra field not compatible with type signature
          actionComponent={JitaSpotlightAction}
          searchIcon={<PeopleAndPlacesIcon width={32} height={32} />}
          query={query}
          limit={100}
          onQueryChange={(value) => {
            console.log("new query value:", value);
            setQuery(value);
          }}
          actionsWrapperComponent={JitaSpotlightActionsWrapper}
        >
          {children}
        </SpotlightProvider>
      ),
      [actions, children, query],
    );
  },
);
JitaSpotlightProvider.displayName = "JitaSpotlightProvider";
