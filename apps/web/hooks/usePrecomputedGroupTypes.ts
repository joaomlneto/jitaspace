import swrImmutable from "swr/immutable";

import { type GetUniverseTypesTypeId200 } from "@jitaspace/esi-client";

export function usePrecomputedGroupTypes(groupId: number) {
  return swrImmutable<{
    name: string;
    published: boolean;
    types: Record<string, GetUniverseTypesTypeId200>;
  }>(
    `/api/esi/group-types/${groupId}`,
    (input: RequestInfo | URL, init?: RequestInit | undefined) =>
      fetch(input, init).then((res) => res.json()),
  );
}
