import {
  GetUniverseCategoriesCategoryIdQueryResponse,
  useGetUniverseCategoriesCategoryId,
} from "@jitaspace/esi-client";

export type Category = GetUniverseCategoriesCategoryIdQueryResponse;

export const useCategory = useGetUniverseCategoriesCategoryId;
