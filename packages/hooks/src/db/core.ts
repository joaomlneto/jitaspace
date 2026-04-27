"use client";

import { createCollection } from "@tanstack/db";
import { parseLoadSubsetOptions } from "@tanstack/query-db-collection";
import { QueryClient } from "@tanstack/react-query";

import type { GetCharactersCharacterIdSearchQueryParamsCategoriesEnum } from "@jitaspace/esi-client";
import type { NpcCharacter } from "@jitaspace/sde-client";
import { getNpcCharacterById } from "@jitaspace/sde-client";

export type ResolvableEntityCategory =
  | GetCharactersCharacterIdSearchQueryParamsCategoriesEnum
  | "stargate";

export type WithId<T, K extends string> = T & { [P in K]: number | string };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60 * 24,
    },
  },
});

export function createQueryCollection<
  T extends object,
  TKey extends string | number,
>(queryOpts: any) {
  return createCollection<T, TKey>(queryOpts);
}

export function extractIdFromCtx(ctx: any, fieldName: string): any | undefined {
  if (!ctx.meta?.loadSubsetOptions) return undefined;
  const params = parseLoadSubsetOptions(ctx.meta?.loadSubsetOptions);
  return params.filters?.find((f: any) => f.field.includes(fieldName))?.value;
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeAxiosError = error as {
    status?: number;
    response?: {
      status?: number;
    };
  };

  return (
    maybeAxiosError.status === 404 || maybeAxiosError.response?.status === 404
  );
}

export async function getNpcCharacterByIdOrUndefined(
  id: number,
): Promise<NpcCharacter | undefined> {
  try {
    return await getNpcCharacterById(id).then((r) => r.data);
  } catch (error) {
    if (isNotFoundError(error)) {
      return undefined;
    }

    throw error;
  }
}
