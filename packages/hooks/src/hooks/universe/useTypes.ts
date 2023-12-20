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
      const result = await Promise.all(
        typeIds.map((typeId) =>
          getUniverseTypesTypeId(typeId, params, headers).then((res) =>
            setResults((state) => ({
              ...state,
              [res.data.type_id]: res.data,
            })),
          ),
        ),
      );
    };
    void fetchResults();
  }, [typeIds, params, headers]);

  return { data: results };
};
