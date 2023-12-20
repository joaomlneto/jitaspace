import { useEffect, useState } from "react";

import {
  getUniverseTypesTypeId,
  GetUniverseTypesTypeIdHeaderParams,
  GetUniverseTypesTypeIdQueryParams,
  GetUniverseTypesTypeIdQueryResponse,
} from "@jitaspace/esi-client";

export const useTypes = (
  typeIds: number[],
  params?: GetUniverseTypesTypeIdQueryParams,
  headers?: GetUniverseTypesTypeIdHeaderParams,
) => {
  const [results, setResults] = useState<
    Record<number, GetUniverseTypesTypeIdQueryResponse>
  >({});

  useEffect(() => {
    const fetchResults = async () => {
      const responses = await Promise.all(
        typeIds.map((typeId) =>
          getUniverseTypesTypeId(typeId, params, headers),
        ),
      );
      const results: Record<number, GetUniverseTypesTypeIdQueryResponse> = {};
      responses.forEach((res) => (results[res.data.type_id] = res.data));
      setResults(results);
    };
    void fetchResults();
  }, [typeIds, params, headers]);

  return { data: results };
};
