import { memo, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useDebouncedValue } from "@mantine/hooks";
import {
  Spotlight,
  SpotlightActionData,
  SpotlightProps,
} from "@mantine/spotlight";

import {
  type GetCharactersCharacterIdSearch200,
  type GetCharactersCharacterIdSearchCategoriesItem,
} from "@jitaspace/esi-client";
import { useEsiClientContext, useEsiSearch } from "@jitaspace/esi-hooks";

import { jitaApps } from "~/config/apps";

/**
 * FIXME MANTINE V7 MIGRATION
 * THIS FILE TO BE COMPLETELY RE-CHECKED AFTERWARDS!!! :(
 */
export const JitaSpotlightProvider = memo(
  ({ children }: Omit<SpotlightProps, "actions">) => {
    const router = useRouter();
    const [query, setQuery] = useState<string>("");
    const [debouncedQuery] = useDebouncedValue(query, 1000);
    const { scopes } = useEsiClientContext();

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
        ...((scopes.includes("esi-universe.read_structures.v1")
          ? ["structure"]
          : []) as GetCharactersCharacterIdSearchCategoriesItem[]),
      ],
    });

    const staticActions: SpotlightActionData[] = useMemo(
      () =>
        Object.values(jitaApps).map((app) => ({
          id: `app/{app.name}`,
          title: app.name,
          //type: "app",
          group: "Apps",
          onTrigger: () => {
            if (app.url !== undefined) {
              void router.push(app.url);
            }
          },
          icon: <app.Icon width={38} />,
        })),
      [router],
    );

    const esiActions: SpotlightActionData[] = useMemo(
      () =>
        Object.entries(esiSearchData?.data ?? []).flatMap(
          ([categoryString, entries]) => {
            const category =
              categoryString as keyof GetCharactersCharacterIdSearch200;
            return entries.slice(0, 10).map((entityId) => ({
              id: `esi/${entityId}`,
              title: `Entity ${entityId} - ${debouncedQuery}`,
              //type: "eve-entity",
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
      (): SpotlightActionData[] => [...staticActions, ...esiActions],
      [esiActions, staticActions],
    );
    return useMemo(
      () => (
        <Spotlight
          shortcut={["mod + P", "/"]}
          actions={actions}
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
      [actions, children, query],
    );
  },
);
JitaSpotlightProvider.displayName = "JitaSpotlightProvider";
