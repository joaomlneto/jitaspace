import {
  useGetDogmaEffects,
  useGetDogmaEffectsEffectId,
} from "@jitaspace/esi-client";

export const useDogmaEffect = (effectId: number) => {
  const { data: effectIds } = useGetDogmaEffects();
  return useGetDogmaEffectsEffectId(
    effectId,
    {},
    {},
    {
      query: {
        enabled: effectIds?.data.includes(effectId),
      },
    },
  );
};
