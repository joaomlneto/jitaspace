import { useEffect, useState } from "react";

import {
  getDogmaAttributesAttributeId,
  GetDogmaAttributesAttributeIdHeaderParams,
  GetDogmaAttributesAttributeIdQueryParams,
  GetDogmaAttributesAttributeIdQueryResponse,
} from "@jitaspace/esi-client";

export const useDogmaAttributes = (
  attributeIds: number[],
  params?: GetDogmaAttributesAttributeIdQueryParams,
  headers?: GetDogmaAttributesAttributeIdHeaderParams,
) => {
  const [results, setResults] = useState<
    Record<number, GetDogmaAttributesAttributeIdQueryResponse>
  >({});

  useEffect(() => {
    const fetchResults = async () => {
      const result = await Promise.all(
        attributeIds.map((typeId) =>
          getDogmaAttributesAttributeId(typeId, params, headers).then((res) =>
            setResults((state) => ({
              ...state,
              [res.data.attribute_id]: res.data,
            })),
          ),
        ),
      );
    };
    void fetchResults();
  }, [attributeIds, params, headers]);

  return { data: results };
};
