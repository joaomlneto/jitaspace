"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { UnknownIcon } from "@jitaspace/eve-icons";

import { EveImageServerAvatar } from "./EveImageServerAvatar";

export type TypeAvatarProps = Omit<AvatarProps, "src"> & {
  typeId?: string | number;
  /**
   * Which image the type server should serve — `"icon"`, `"render"`, `"bp"`,
   * ... Required in practice: this component never asks the image server which
   * variations a type actually has, so an unsupported variation 404s and falls
   * back to the placeholder.
   */
  variation?: string;
};

/**
 * Pure, hook-free renderer for an inventory type's image. The data-fetching
 * twin that discovers which variations a type offers lives in
 * `@jitaspace/eve-components` (`TypeAvatar`); keeping this renderer here lets
 * the package stay free of network dependencies.
 */
export const TypeAvatar = memo(
  ({ typeId, variation = "icon", ...otherProps }: TypeAvatarProps) => {
    return (
      <EveImageServerAvatar
        category="types"
        id={typeId}
        variation={variation}
        size={otherProps.size}
        {...otherProps}
      >
        {/* FIXME: size should depend on props */}
        <UnknownIcon width={32} />
      </EveImageServerAvatar>
    );
  },
);
TypeAvatar.displayName = "TypeAvatar";
