import { useMemo } from "react";

import { useGetUniverseBloodlines } from "@jitaspace/esi-client";





export const useBloodline = (bloodlineId: number) => {
  const { data, ...others } = useGetUniverseBloodlines();

  const bloodline = useMemo(
    () =>
      data?.data.find((bloodline) => bloodline.bloodline_id === bloodlineId),
    [data],
  );

  return { data: bloodline, ...others };
};
