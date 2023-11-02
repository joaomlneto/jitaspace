import {
  GetOpportunitiesTasksTaskIdQueryResponse,
  useGetOpportunitiesTasksTaskId,
} from "@jitaspace/esi-client";

export type OpportunityTask = GetOpportunitiesTasksTaskIdQueryResponse;

export const useOpportunityTask = useGetOpportunitiesTasksTaskId;
