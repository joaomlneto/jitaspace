"use client";

import {
  GetUniverseGroupsGroupIdQueryResponse,
  useGetUniverseGroupsGroupId,
} from "@jitaspace/esi-client";

export type Group = GetUniverseGroupsGroupIdQueryResponse;

export const useGroup = useGetUniverseGroupsGroupId;
