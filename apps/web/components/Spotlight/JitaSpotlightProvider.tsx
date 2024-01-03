import { memo, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useDebouncedValue } from "@mantine/hooks";
import { Spotlight, type SpotlightProps } from "@mantine/spotlight";

import { useEsiSearch } from "@jitaspace/hooks";





export const JitaSpotlightProvider = memo(
  ({ children }: Omit<SpotlightProps, "actions">) => {
    const router = useRouter();
    const [query, setQuery] = useState<string>("");
    const [debouncedQuery] = useDebouncedValue(query, 1000);

    const { data: esiSearchData } = useEsiSearch(debouncedQuery);

    /*
    const staticActions= useMemo(
      () =>
        Object.values(characterApps).map((app) => ({
          title: app.name,
          type: "app",
          group: "Apps",
          onTrigger: () => {
            if (app.url !== undefined) {
              void router.push(app.url);
            }
          },
          icon: <app.Icon width={38} />,
        })) as SpotlightAction[],
      [router],
    );

    const esiActions = useMemo(
      () =>
        Object.entries(esiSearchData?.data ?? []).flatMap(
          ([categoryString, entries]) => {
            const category = categoryString as EsiSearchCategory;
            return entries.slice(0, 10).map((entityId) => ({
              title: `Entity ${entityId} - ${debouncedQuery}`,
              type: "eve-entity",
              category,
              entityId: entityId,
              group: category.replace("_", " "),
              onTrigger: () => {
                switch (category) {
                  case "alliance":
                    void router.push(`/alliance/${entityId}`);
                    break;
                  case "agent":
                  case "character":
                    void router.push(`/character/${entityId}`);
                    break;
                  case "corporation":
                    void router.push(`/corporation/${entityId}`);
                    break;
                  case "faction":
                    void router.push(`/faction/${entityId}`);
                    break;
                  case "constellation":
                    void router.push(`/constellation/${entityId}`);
                    break;
                  case "inventory_type":
                    void router.push(`/type/${entityId}`);
                    break;
                  case "region":
                    void router.push(`/region/${entityId}`);
                    break;
                  case "solar_system":
                    void router.push(`/system/${entityId}`);
                    break;
                  case "station":
                    void router.push(`/station/${entityId}`);
                    break;
                  case "structure":
                    void router.push(`/structure/${entityId}`);
                    break;
                }
              },
            }));
          },
        ),
      [debouncedQuery, esiSearchData?.data, router],
    );

    const actions: SpotlightActionData[] = useMemo(
      () => [...staticActions, ...esiActions],
      [esiActions, staticActions],
    );
     */

    return useMemo(
      () => (
        <Spotlight
          shortcut={["mod + P", "/"]}
          actions={
            [
              /* actions */
            ]
          }
          limit={100}
          query={query}
          onQueryChange={setQuery}
          //searchIcon={<PeopleAndPlacesIcon width={32} height={32} />}
          //actionsWrapperComponent={JitaSpotlightActionsWrapper}
          //actionComponent={JitaSpotlightAction}
        >
          {children}
        </Spotlight>
      ),
      [/*actions,*/ children, query],
    );
  },
);
JitaSpotlightProvider.displayName = "JitaSpotlightProvider";
