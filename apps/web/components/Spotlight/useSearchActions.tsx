"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@mantine/hooks";
import type { SpotlightActionData } from "@mantine/spotlight";

import type { EsiSearchCategory } from "@jitaspace/hooks";
import { useEsiNameLookup, useEsiSearch } from "@jitaspace/hooks";
import { EveEntityAvatar } from "@jitaspace/ui";

import { jitaApps } from "~/config/apps";

export interface SearchActionGroups {
  /** Every action matching the query, flat. */
  filteredActions: SpotlightActionData[];
  /** Actions without a group (rendered before the groups). */
  ungrouped: SpotlightActionData[];
  /** Actions keyed by their group label. */
  groups: Record<string, SpotlightActionData[]>;
}

/**
 * Builds the combined "search the universe + jump to a tool" action list shared
 * by the Spotlight modal and the standalone /search page. ESI entity lookups
 * are debounced; app/tool actions are always available and filtered locally.
 */
export function useSearchActions(query: string): SearchActionGroups {
  const router = useRouter();
  const [debouncedQuery] = useDebouncedValue(query, 1000);

  const { data: esiSearchData } = useEsiSearch(debouncedQuery);

  const entityEntries = useMemo(
    () =>
      Object.entries(esiSearchData?.data ?? []).flatMap(
        ([categoryString, entries]) => {
          const category = categoryString as EsiSearchCategory;
          return entries.map((entityId) => ({ id: entityId, category }));
        },
      ),
    [esiSearchData?.data],
  );

  const names = useEsiNameLookup(entityEntries);

  const makeAppOnClick = useCallback(
    (url: string | undefined) => () => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      if (url !== undefined) router.push(url);
    },
    [router],
  );

  const appActions: SpotlightActionData[] = useMemo(
    () =>
      Object.values(jitaApps).flatMap(({ name: groupName, apps }) =>
        Object.values(apps)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((app) => ({
            id: `app/${groupName}/${app.name}`,
            label: app.name,
            description: app.description,
            group: `${groupName} Apps`,
            leftSection: <app.Icon width={32} height={32} />,
            onClick: makeAppOnClick(app.url),
          })),
      ),
    [makeAppOnClick],
  );

  const esiSearchResultActions: SpotlightActionData[] = useMemo(
    () =>
      Object.entries(esiSearchData?.data ?? []).flatMap(
        ([categoryString, entries]) => {
          const category = categoryString as EsiSearchCategory;
          return entries.map((entityId) => ({
            id: `entity/${entityId}`,
            label: names[entityId.toString()]?.value?.name ?? "",
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
    [router, names, esiSearchData?.data],
  );

  const actions = useMemo(
    () => [...esiSearchResultActions, ...appActions],
    [appActions, esiSearchResultActions],
  );

  // Filter actions by query locally (mirrors defaultSpotlightFilter behaviour)
  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.trim().toLowerCase();
    return actions.filter(
      (action) =>
        action.label?.toLowerCase().includes(q) ||
        action.description?.toLowerCase().includes(q),
    );
  }, [query, actions]);

  // Group filtered actions for rendering.
  const { ungrouped, groups } = useMemo(() => {
    const _groups: Record<string, SpotlightActionData[]> = {};
    const _ungrouped: SpotlightActionData[] = [];
    for (const action of filteredActions) {
      if (action.group) {
        _groups[action.group] ??= [];
        _groups[action.group].push(action);
      } else {
        _ungrouped.push(action);
      }
    }
    return { ungrouped: _ungrouped, groups: _groups };
  }, [filteredActions]);

  return { filteredActions, ungrouped, groups };
}
