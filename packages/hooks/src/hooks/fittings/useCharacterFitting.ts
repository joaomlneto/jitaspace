import { useMemo } from "react";

import { useCharacterFittings } from "./useCharacterFittings";


export const useCharacterFitting = (characterId: number, fittingId: number) => {
  const { data, ...others } = useCharacterFittings(characterId);

  const fit = useMemo(
    () => data?.data.find((f) => f.fitting_id === fittingId),
    [data, fittingId],
  );

  return { data: fit, ...others };
};
