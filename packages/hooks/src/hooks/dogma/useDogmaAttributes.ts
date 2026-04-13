"use client";

import { useEffect, useState } from "react";

import {
  getDogmaAttributesAttributeId,
  GetDogmaAttributesAttributeIdHeaderParams,
  GetDogmaAttributesAttributeIdQueryResponse,
} from "@jitaspace/esi-client";

export const useDogmaAttributes = (
  attributeIds: number[],
  headers?: GetDogmaAttributesAttributeIdHeaderParams,
) => {
  const [results, setResults] = useState<
    Record<number, GetDogmaAttributesAttributeIdQueryResponse>
  >({});

  useEffect(() => {
    const fetchResults = async () => {
      const responses = await Promise.all(
        attributeIds.map((typeId) =>
          getDogmaAttributesAttributeId(typeId, headers),
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
  }, [attributeIds, headers]);

  return { data: results };
};
