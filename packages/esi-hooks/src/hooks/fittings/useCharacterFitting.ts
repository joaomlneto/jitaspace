import { useMemo } from "react";

import { useCharacterFittings } from "./useCharacterFittings";


export const useCharacterFitting = (fittingId: number) => {
  const { data, ...others } = useCharacterFittings();

  const fit = useMemo(
    () => data?.data.find((f) => f.fitting_id === fittingId),
    [data, fittingId],
  );

  return { data: fit, ...others };
};
