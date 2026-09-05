"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";
import useSWRImmutable from "swr/immutable";

import { TypeAvatar as TypeAvatarDisplay } from "@jitaspace/ui";

export type TypeAvatarProps = Omit<AvatarProps, "src"> & {
  typeId?: string | number;
  /** Pin a variation to skip the lookup entirely. */
  variation?: string;
};

/** The image server lists a type's available variations at `/types/<id>`. */
const fetchTypeVariations = async (url: string): Promise<string[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Image server returned ${response.status} listing variations at ${url}`,
    );
  }
  return (await response.json()) as string[];
};

/**
 * An inventory type's image, resolving which variation the type actually offers
 * (ships have `icon`/`render`, blueprints have `bp`/`bpc`, ...) unless the
 * caller pins one. The presentational twin is `TypeAvatar` in
 * `@jitaspace/ui`, which renders a known variation without any lookup.
 */
export const TypeAvatar = memo(
  ({ typeId, variation, ...otherProps }: TypeAvatarProps) => {
    const { data } = useSWRImmutable<string[]>(
      typeId && !variation
        ? `https://images.evetech.net/types/${typeId}`
        : null,
      fetchTypeVariations,
      // A non-2xx from the variations endpoint is a permanent answer about that
      // type id, not a transient failure. SWR retries errors forever by default
      // (errorRetryCount is unset), so without this every avatar holding an
      // unknown type id would schedule an endless background retry chain.
      { shouldRetryOnError: false },
    );

    return (
      <TypeAvatarDisplay
        typeId={typeId}
        variation={variation ?? data?.[0] ?? "icon"}
        {...otherProps}
      />
    );
  },
);
TypeAvatar.displayName = "TypeAvatar";
