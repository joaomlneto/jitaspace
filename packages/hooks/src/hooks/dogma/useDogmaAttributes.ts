"use client";

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
      const responses = await Promise.all(
        attributeIds.map((typeId) =>
          getDogmaAttributesAttributeId(typeId, params, headers),
        ),
      );
      const results: Record<
        number,
        GetDogmaAttributesAttributeIdQueryResponse
      > = {};
      responses.forEach((res) => (results[res.data.attribute_id] = res.data));
      setResults(results);
    };
    void fetchResults();
  }, [attributeIds, params, headers]);

  return { data: results };
};
