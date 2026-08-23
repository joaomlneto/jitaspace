"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";
import { Avatar } from "@mantine/core";

import { esiImageSizeClamp, getAvatarSize } from "@jitaspace/utils";

import { sizes } from "./Avatar.styles";

export type EveImageServerAvatarProps = Omit<AvatarProps, "src"> & {
  category?: "alliances" | "corporations" | "characters" | "types";
  id?: string | number | null;
  variation?: string;
};

export const EveImageServerAvatar = memo(
  ({
    category,
    id,
    variation,
    size,
    imageProps,
    ...avatarProps
  }: EveImageServerAvatarProps) => {
    const avatarSize = getAvatarSize({
      size: size ?? "md",
      sizes,
    });

    /**
     * The image server serves powers of two, so ask for the avatar's pixel size
     * rounded up. A HiDPI screen needs more device pixels than that, which is
     * what the `2x` candidate below covers: `srcSet` lets the browser pick by
     * its own devicePixelRatio and fetch exactly one of them. Reading
     * `devicePixelRatio` in JS instead would either mismatch on hydration or
     * download the 1x image before upgrading it.
     */
    const urlFor = (path: string, scale: number) =>
      `https://images.evetech.net/${path}?size=${esiImageSizeClamp(avatarSize * scale)}`;

    const imagePropsFor = (path: string) => {
      const oneX = urlFor(path, 1);
      const twoX = urlFor(path, 2);
      return {
        // Both candidates collapse to one URL once the clamp floors at 32 or
        // caps at 1024; there is nothing for the browser to choose between.
        ...(oneX === twoX ? {} : { srcSet: `${oneX} 1x, ${twoX} 2x` }),
        ...imageProps,
      };
    };

    if (
      category &&
      !id &&
      ["alliances", "corporations", "characters"].includes(category)
    ) {
      const path = `${category}/1/${category == "characters" ? "portrait" : "logo"}`;
      return (
        <Avatar
          src={urlFor(path, 1)}
          imageProps={imagePropsFor(path)}
          size={size}
          alt={avatarProps.alt ?? `${category} ${id} ${variation}`}
          {...avatarProps}
        />
      );
    }

    const path =
      id && category && variation ? `${category}/${id}/${variation}` : undefined;

    return (
      <Avatar
        src={path ? urlFor(path, 1) : undefined}
        imageProps={path ? imagePropsFor(path) : imageProps}
        size={size}
        alt={avatarProps.alt ?? `${category} ${id} ${variation}`}
        {...avatarProps}
      />
    );
  },
);
EveImageServerAvatar.displayName = "EveImageServerAvatar";
