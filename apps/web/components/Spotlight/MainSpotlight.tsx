"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useDebouncedValue } from "@mantine/hooks";
import { Spotlight, SpotlightActionData } from "@mantine/spotlight";

import {
  EsiSearchCategory,
  useEsiNamesCache,
  useEsiSearch,
} from "@jitaspace/hooks";
import { EveEntityAvatar } from "@jitaspace/ui";

import { characterApps } from "~/config/apps";


export const MainSpotlight = () => {
  const router = useRouter();
  const [query, setQuery] = useState<string>("");
  const [debouncedQuery] = useDebouncedValue(query, 1000);

  const { data: esiSearchData } = useEsiSearch(debouncedQuery);

  const names = useEsiNamesCache();

  const appActions: SpotlightActionData[] = useMemo(
    () =>
      Object.values(characterApps)
        .toSorted((a, b) => a.name.localeCompare(b.name))
        .map((app) => ({
          id: `app/${app.name}`,
          label: app.name,
          description: app.description,
          group: "Apps",
          leftSection: <app.Icon width={32} />,
          onClick: () => {
            if (app.url !== undefined) {
              void router.push(app.url);
            }
          },
          icon: <app.Icon width={38} />,
        })),
    [router],
  );

  const esiSearchResultActions: SpotlightActionData[] = useMemo(
    () =>
      Object.entries(esiSearchData?.data ?? []).flatMap(
        ([categoryString, entries]) => {
          const category = categoryString as EsiSearchCategory;
          return entries.map((entityId) => ({
            id: `entity/${entityId}`,
            label: names[entityId]?.value?.name ?? "",
            //description: `Search result for ${debouncedQuery}`,
            group: category.replace("_", " "),
            leftSection: (
              <EveEntityAvatar
                entityId={entityId}
                category={category}
                size={32}
              />
            ),
            onClick: () => {
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
                case "solar_system":
                  void router.push(`/solar_system/${entityId}`);
                  break;
                case "station":
                  void router.push(`/station/${entityId}`);
                  break;
                case "structure":
                  void router.push(`/structure/${entityId}`);
                  break;
                case "inventory_type":
                  void router.push(`/type/${entityId}`);
                  break;
                default:
                  console.error(`Unknown category ${category}`);
              }
            },
          }));
        },
      ),
    [router, esiSearchData],
  );

  const actions = useMemo(
    () => [...esiSearchResultActions, ...appActions],
    [appActions, esiSearchResultActions],
  );

  return (
    <Spotlight
      shortcut={["mod + K", "mod + P", "/"]}
      limit={100}
      query={query}
      onQueryChange={setQuery}
      actions={actions}
    />
  );
};
