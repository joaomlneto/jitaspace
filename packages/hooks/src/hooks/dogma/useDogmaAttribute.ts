"use client";

import {
  useGetDogmaAttributes,
  useGetDogmaAttributesAttributeId,
} from "@jitaspace/esi-client";

export const useDogmaAttribute = (attributeId: number) => {
  const { data: attributeIds } = useGetDogmaAttributes();

  return useGetDogmaAttributesAttributeId(
    attributeId,
    {},
    {},
    {
      query: {
        enabled: attributeIds?.data.includes(attributeId),
      },
    },
  );
};
