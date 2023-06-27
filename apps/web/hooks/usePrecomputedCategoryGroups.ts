import swrImmutable from "swr/immutable";

import { type GetUniverseGroupsGroupId200 } from "@jitaspace/esi-client";

export const usePrecomputedCategoryGroups = (categoryId: number) =>
  swrImmutable<{
    name: string;
    published: boolean;
    groups: Record<string, GetUniverseGroupsGroupId200>;
  }>(
    `/api/esi/category-groups/${categoryId}`,
    (input: RequestInfo | URL, init?: RequestInit | undefined) =>
      fetch(input, init).then((res) => res.json()),
  );
