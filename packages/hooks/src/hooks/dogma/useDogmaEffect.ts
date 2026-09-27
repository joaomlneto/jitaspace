"use client";

import { useGetDogmaEffectsEffectId } from "@jitaspace/esi-client";

/**
 * See useDogmaAttribute: the id-list gate this used to carry never gated (it
 * was `undefined` while the list loaded), fetched the whole /dogma/effects list
 * for nothing, and overrode the generated hook's `!!effect_id` guard.
 */
export const useDogmaEffect = (effectId: number) =>
  useGetDogmaEffectsEffectId(effectId);
