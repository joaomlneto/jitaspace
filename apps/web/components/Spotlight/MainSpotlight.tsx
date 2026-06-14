"use client";

import { useState } from "react";
import { Spotlight } from "@mantine/spotlight";

import { useSearchActions } from "./useSearchActions";

export const MainSpotlight = () => {
  const [query, setQuery] = useState<string>("");
  const { filteredActions, ungrouped, groups } = useSearchActions(query);

  // Use the compound API so SpotlightActionsList is always mounted.
  // When SpotlightActionsList unmounts it clears listId to ""; pressing Enter
  // then calls querySelector("# [data-selected]") which is an invalid selector
  // and throws a SyntaxError. Keeping it always mounted avoids the bug.
  return (
    <Spotlight.Root
      shortcut={["mod + K", "mod + P", "/"]}
      query={query}
      onQueryChange={setQuery}
    >
      <Spotlight.Search />
      <Spotlight.ActionsList mah="60vh" style={{ overflowY: "auto" }}>
        {filteredActions.length > 0 ? (
          <>
            {ungrouped.map(({ id, group: _g, ...action }) => (
              <Spotlight.Action key={id} id={id} {...action} />
            ))}
            {Object.entries(groups).map(([groupName, groupActions]) => (
              <Spotlight.ActionsGroup key={groupName} label={groupName}>
                {groupActions.map(({ id, group: _g, ...action }) => (
                  <Spotlight.Action key={id} id={id} {...action} />
                ))}
              </Spotlight.ActionsGroup>
            ))}
          </>
        ) : (
          <Spotlight.Empty>No results found</Spotlight.Empty>
        )}
      </Spotlight.ActionsList>
    </Spotlight.Root>
  );
};
