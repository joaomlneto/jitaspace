import {
  GetOpportunitiesGroupsGroupIdQueryResponse,
  useGetOpportunitiesGroupsGroupId,
} from "@jitaspace/esi-client";

export type OpportunityGroup = GetOpportunitiesGroupsGroupIdQueryResponse;

export const useOpportunityGroup = useGetOpportunitiesGroupsGroupId;
