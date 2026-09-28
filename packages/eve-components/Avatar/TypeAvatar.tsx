"use client";

import type { AvatarProps } from "@mantine/core";
import { memo, useState } from "react";
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
 * Types whose `icon` has failed to load this session, so later avatars for
 * them go straight to the variations lookup instead of failing again. Only
 * written from an image's error handler, never during render.
 */
const typesWithoutIcon = new Set<string>();

/**
 * An inventory type's image. The `icon` variation is requested straight away,
 * because nearly every type has one; only when it fails to load is the image
 * server asked which variations the type actually offers (blueprints have only
 * `bp`/`bpc`, and their `/icon` returns 400). Asking up front cost one request
 * per type in every list, and switched each ship from its icon to its render
 * once the answer arrived — two image downloads for one avatar. The
 * presentational twin is `TypeAvatar` in `@jitaspace/ui`, which renders a
 * known variation without any lookup.
 */
export const TypeAvatar = memo(
  ({ typeId, variation, imageProps, ...otherProps }: TypeAvatarProps) => {
    const [iconFailedFor, setIconFailedFor] = useState<string | number>();
    const lookUpVariations =
      !variation &&
      !!typeId &&
      (iconFailedFor === typeId || typesWithoutIcon.has(String(typeId)));

    const { data } = useSWRImmutable<string[]>(
      lookUpVariations ? `https://images.evetech.net/types/${typeId}` : null,
      fetchTypeVariations,
      // A non-2xx from the variations endpoint is a permanent answer about that
      // type id, not a transient failure. SWR retries errors forever by default
      // (errorRetryCount is unset), so without this every avatar holding an
      // unknown type id would schedule an endless background retry chain.
      { shouldRetryOnError: false },
    );

    const resolvedVariation =
      variation ?? (lookUpVariations ? data?.[0] : undefined) ?? "icon";

    return (
      <TypeAvatarDisplay
        typeId={typeId}
        variation={resolvedVariation}
        imageProps={{
          ...imageProps,
          onError: (event) => {
            if (!variation && typeId && resolvedVariation === "icon") {
              typesWithoutIcon.add(String(typeId));
              setIconFailedFor(typeId);
            }
            imageProps?.onError?.(event);
          },
        }}
        {...otherProps}
      />
    );
  },
);
TypeAvatar.displayName = "TypeAvatar";
